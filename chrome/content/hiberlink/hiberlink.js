Zotero.Hiberlink = {
    DB: null,
    archiveUrl: null,
    intervalID: null,
    count: null,
    insertID: null,
    item: null,

    init: function () {
        // Connect to (and create, if necessary) hiberlink.sqlite in the Zotero directory
        this.DB = new Zotero.DBConnection('hiberlink');

        if (!this.DB.tableExists('changes')) {
            this.DB.query("CREATE TABLE changes (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, itemid INTEGER, " +
                "version INTEGER NOT NULL, title TEXT, url TEXT, archiveurl TEXT, timestamp DATETIME DEFAULT NULL)");
        }

        if (!this.DB.tableExists('settings')) {
            this.DB.query("CREATE TABLE settings (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, key TEXT NOT NULL, " +
                "value TEXT NOT NULL)");
            this.DB.query("INSERT INTO settings (key, value) VALUES (?, ?)", ["archiveService", "at"]);
            this.DB.query("INSERT INTO settings (key, value) VALUES (?, ?)", ["archiveServiceEnabled", "true"]);
            this.DB.query("INSERT INTO settings (key, value) VALUES (?, ?)", ["hiberactiveEnabled", "false"]);
            this.DB.query("INSERT INTO settings (key, value) VALUES (?, ?)", ["hiberactiveUrl", ""]);
            this.DB.query("INSERT INTO settings (key, value) VALUES (?, ?)", ["hiberactiveTopic", ""]);
            this.DB.query("INSERT INTO settings (key, value) VALUES (?, ?)", ["urlOrder", "originalUrl"]);
        }

        // Register the callback in Zotero as an item observer
        var notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, ['item']);

        // Unregister callback when the window closes (important to avoid a memory leak)
        window.addEventListener('unload', function (e) {
            Zotero.Notifier.unregisterObserver(notifierID);
        }, false);
    },

    getReport: function () {
        // Display additional window to show report of archived links
        var col = ZoteroPane_Local.getSelectedItems();
        var params = "zotero://hiberlink/content/report.html?";
        for (var i = 0; i < col.length; i++) {
            params += "item=" + col[i].id + "&";
        }
        Zotero.debug("Url: " + params);
        ZoteroPane_Local.loadURI(params.substring(0, params.length - 1));
    },

    getSettings: function () {
        // Display additional window to show Hiberlink settings
        ZoteroPane_Local.loadURI("zotero://hiberlink/content/settings.html");
    },

    getSetting: function (key) {
        var value = null;
        var rows = Zotero.Hiberlink.DB.query("SELECT value from settings WHERE key=?", [key]);
        if (rows.length > 0) {
            var row = rows[0];
            if (row != null) {
                value = row['value'];
            }
        }
        return value;
    },

    // Callback implementing the notify() method to pass to the Notifier
    notifierCallback: {
        notify: function (event, type, ids, extraData) {
            Zotero.debug("Event: " + event);
            if (event == 'add' || event == 'modify') {
                // Loop through array of items and grab titles
                Zotero.debug("Ids size: " + ids.length);
                if (ids.length > 1) {
                    for (var id in ids) {
                        Zotero.Hiberlink.item = Zotero.Items.get(id);
                        Zotero.debug("ID: " + Zotero.Hiberlink.item);
                        // For deleted items, get title from passed data
                        if (typeof Zotero.Hiberlink.item === 'object') {
                            if (Zotero.Hiberlink.item.getField('url') != '') {
//                                alert("URL: " + Zotero.Hiberlink.item.getField('url'));
                            }
                        }
                    }
                } else {
                    Zotero.Hiberlink.item = Zotero.Items.get(ids)[0];
                    if (typeof Zotero.Hiberlink.item === 'object') {
                        var url = Zotero.Hiberlink.item.getField('url');
                        var itemId = Zotero.Hiberlink.item.getField('id');
                        var title = Zotero.Hiberlink.item.getField('title');
                        var oldRecord = Zotero.Hiberlink.DB.query("SELECT url, version FROM changes WHERE itemid=? ORDER BY version DESC LIMIT 1", [itemId]);
                        var oldUrl = null;
                        var oldVersion = 0;
                        if (oldRecord) {
                            oldUrl = oldRecord[0]['url'];
                            oldVersion = oldRecord[0]['version'];
                        }
                        if (url != '' && url != oldUrl) {
                            var archiveServiceEnabled = Zotero.Hiberlink.DB.query("SELECT value from settings WHERE key=?", ["archiveServiceEnabled"])[0]['value'];
                            if (archiveServiceEnabled == 'true') {
                                Zotero.Hiberlink.archiveURL(itemId, oldVersion, title, url);
                            }
                            var hiberactiveEnabled = Zotero.Hiberlink.DB.query("SELECT value from settings WHERE key=?", ["hiberactiveEnabled"])[0]['value'];
                            if (hiberactiveEnabled == 'true') {
                                var hiberactiveUrl = Zotero.Hiberlink.DB.query("SELECT value from settings WHERE key=?", ["hiberactiveUrl"])[0]['value'];
                                var hiberactiveTopic = Zotero.Hiberlink.DB.query("SELECT value from settings WHERE key=?", ["hiberactiveTopic"])[0]['value'];
                                Zotero.Hiberlink.hiberactiveURL(url, hiberactiveUrl, hiberactiveTopic);
                            }
                        }
                    }
                }
            } else if (event == 'delete') {
                for (var i = 0, j = ids.length; i < j; i++) {
                    var oldItem = extraData[ids[i]].old;
                    // For deleted items, get id from passed data
                    var deleteItemId = oldItem.primary.itemID;
                    Zotero.debug("Deleting item with id " + deleteItemId);
                    Zotero.Hiberlink.DB.query("DELETE FROM changes WHERE itemid=?", [deleteItemId]);
                }
            }
        }
    },
    refreshArchive: function () {
        // Create copy of reference and rearchive
        ZoteroPane_Local.duplicateSelectedItem();
        var item = ZoteroPane_Local.getSelectedItems()[0];
        item.setField('title', item.getField('title') + ' (' + new Date() + ')');
    },
    checkArchiveUrl: function () {
        // Query archival service to check archive has been made
        var xhr2 = new XMLHttpRequest();
        xhr2.open('GET', Zotero.Hiberlink.archiveUrl, true);
        xhr2.onload = function () {
            var datetime = xhr2.getResponseHeader('Memento-Datetime');
            Zotero.debug("Archive header: " + datetime);
            Zotero.debug("Count: " + Zotero.Hiberlink.count);
            if (Zotero.Hiberlink.count++ > 10 || datetime != null) {
                Zotero.debug("Clearing interval with ID: " + Zotero.Hiberlink.intervalID);
                clearInterval(Zotero.Hiberlink.intervalID);
                if (datetime != null) {
                    var utcDate = Zotero.Date.dateToSQL(new Date(datetime), true);
                    var date = Zotero.Date.dateToSQL(new Date(datetime));
                    Zotero.Hiberlink.item.setField('accessDate', utcDate);
                    Zotero.Hiberlink.item.save();
                    Zotero.Hiberlink.DB.query("UPDATE changes SET timestamp=? WHERE id=?", [date, Zotero.Hiberlink.insertID]);
                }
            }
            if (Zotero.Hiberlink.count > 10) {
                Zotero.debug("Archiving of URL timed out");
            }
        };
        xhr2.send();
    },
    archiveURL: function (itemId, oldVersion, title, url) {
        var archiveService = Zotero.Hiberlink.getSetting("archiveService");
        if (archiveService == 'at') {
            Zotero.Hiberlink.archiveAT(itemId, oldVersion, title, url);
        } else if (archiveService == 'ia') {
            Zotero.Hiberlink.archiveIA(itemId, oldVersion, title, url);
        } else if (archiveService == 'perma') {
            Zotero.Hiberlink.archivePerma(itemId, oldVersion, title, url);
        } else {
            Zotero.debug("Archive service unrecognised");
        }
    },
    archiveAT: function (itemId, oldVersion, title, url) {
       var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
        var xhr = new XMLHttpRequest();
        var archiveServiceUrl = 'http://archive.today/submit/';
        Zotero.debug("Archiving to: " + archiveServiceUrl);
        xhr.open('POST', archiveServiceUrl, true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.onload = function () {
            if (xhr.getResponseHeader('refresh') != null) {
                Zotero.Hiberlink.archiveUrl = xhr.getResponseHeader('refresh').split('url=')[1];
                Zotero.debug("Querying archive url: " + Zotero.Hiberlink.archiveUrl);
                Zotero.Hiberlink.insertID = Zotero.Hiberlink.DB.query("INSERT INTO changes (itemid, version, title, url, archiveurl) VALUES (?, ?, ?, ?, ?)", [itemId, ++oldVersion, title, url, Zotero.Hiberlink.archiveUrl]);
                Zotero.Hiberlink.count = 0;
                Zotero.Hiberlink.intervalID = setInterval(Zotero.Hiberlink.checkArchiveUrl, 10000);
                Zotero.Hiberlink.item.setField('archive', Zotero.Hiberlink.archiveUrl);
                Zotero.Hiberlink.item.save();
            } else {
                Zotero.debug("Archival service did not accept the URL '" + url + "'");
            }
        };
        xhr.onerror = function () {
            ps.alert(null, "", Zotero.getString('hiberlink.fail', [url]));
            var insertId = Zotero.Hiberlink.DB.query("INSERT INTO changes (itemid, title, url) VALUES (?, ?, ?)", [itemId, title, url]);
        };
        xhr.send('url=' + url); 
    },
    archiveIA: function (itemId, oldVersion, title, url) {
       var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);
        var xhr = new XMLHttpRequest();
        var archiveServiceUrl = 'http://web.archive.org/save/' + url;
        Zotero.debug("Archiving to: " + archiveServiceUrl);
        xhr.open('GET', archiveServiceUrl, true);
        xhr.onload = function () {
            if (xhr.response != null) {
                Zotero.Hiberlink.archiveUrl = 'http://web.archive.org' + xhr.getResponseHeader('Content-Location');
                var datetime = Zotero.Date.dateToSQL(new Date(xhr.getResponseHeader('X-Archive-Orig-Date')));
                var utcDatetime = Zotero.Date.dateToSQL(new Date(xhr.getResponseHeader('X-Archive-Orig-Date')), true);
                Zotero.debug("Querying archive url: " + Zotero.Hiberlink.archiveUrl);
                Zotero.Hiberlink.insertID = Zotero.Hiberlink.DB.query("INSERT INTO changes (itemid, version, title, url, archiveurl, timestamp) VALUES (?, ?, ?, ?, ?, ?)", [itemId, ++oldVersion, title, url, Zotero.Hiberlink.archiveUrl, datetime]);
                Zotero.Hiberlink.item.setField('archive', Zotero.Hiberlink.archiveUrl);
                Zotero.Hiberlink.item.setField('accessDate', utcDatetime);
                Zotero.Hiberlink.item.save();
            } else {
                Zotero.debug("Archival service did not accept the URL '" + url + "'");
            }
        };
        xhr.onerror = function () {
            ps.alert(null, "", Zotero.getString('hiberlink.fail', [url]));
            var insertId = Zotero.Hiberlink.DB.query("INSERT INTO changes (itemid, title, url) VALUES (?, ?, ?)", [itemId, title, url]);
        };
        xhr.send(); 
    },
    archivePerma: function (itemId, oldVersion, title, url) {
       Zotero.debug("Perma.cc archiving not implemented yet");
    },
    hiberactiveURL: function (url, hiberactiveUrl, hiberactiveTopic) {
//        var doc = new DOMParser().parseFromString('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:rs="http://www.openarchives.orgrs/terms/"></urlset>',  "application/xml")
//        var pi = doc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"');
//        doc.insertBefore(pi, doc.firstChild);
//        var rootElement = doc.documentElement;
//        var urlElement = doc.createElement("url");
//        var locElement = doc.createElement("loc");
//        locElement.textContent = "http://test.com";
//        var lastModifiedElement = doc.createElement("lastmod");
//        lastModifiedElement.textContent = "2014-06-08T01:13:07Z";
//        var mdElement = doc.createElement("rs:md");
//        mdElement.setAttribute("change", "created");
//        urlElement.appendChild(locElement);
//        urlElement.appendChild(lastModifiedElement);
//        urlElement.appendChild(mdElement);
//        rootElement.appendChild(urlElement);
//        Zotero.debug(new XMLSerializer().serializeToString(doc));
        var jsonMessage = '[{"url": "' + url +'"}]';
        var xhr = new XMLHttpRequest();
        xhr.open('POST', hiberactiveUrl + '/publish', true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.setRequestHeader('Link', '<' + hiberactiveTopic + '>;rel=self, <' + hiberactiveUrl + '/publish>;rel=hub');
        xhr.onerror = function () {
            Zotero.debug("Failed to send Hiberactive message to " + hiberactiveUrl + " with topic " + hiberactiveTopic);
        };
        xhr.onload = function () {
            Zotero.debug("Sent Hiberactive message to " + hiberactiveUrl + " with topic " + hiberactiveTopic);
        };
        xhr.send(jsonMessage);
    }
};

// Initialize the utility
window.addEventListener('load', function (e) {
    Zotero.Hiberlink.init();
}, false);
