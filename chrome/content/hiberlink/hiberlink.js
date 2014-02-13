Zotero.Hiberlink = {
    DB: null,

    init: function () {
        // Connect to (and create, if necessary) hiberlink.sqlite in the Zotero directory
        this.DB = new Zotero.DBConnection('hiberlink');

        if (!this.DB.tableExists('changes')) {
            this.DB.query("CREATE TABLE changes (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, itemid INTEGER, version INTEGER NOT NULL, title TEXT, url TEXT, archiveurl TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
        }

        // Register the callback in Zotero as an item observer
        var notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, ['item']);

        // Unregister callback when the window closes (important to avoid a memory leak)
        window.addEventListener('unload', function (e) {
            Zotero.Notifier.unregisterObserver(notifierID);
        }, false);
    },

    getReport: function () {
        var col = ZoteroPane_Local.getSelectedItems();
        var params = "zotero://hiberlink/content/report.html?";
        for (var i = 0; i < col.length; i++) {
            params += "item=" + col[i].id + "&";
        }
        Zotero.debug("Url: " + params);
        ZoteroPane_Local.loadURI(params.substring(0, params.length - 1));
    },

    // Callback implementing the notify() method to pass to the Notifier
    notifierCallback: {
        notify: function (event, type, ids, extraData) {
            if (event == 'add' || event == 'modify') {
                var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
                // Loop through array of items and grab titles
//                alert("Ids: " + ids);
                var item;
                Zotero.debug("Ids size: " + ids.length);
                if (ids.length > 1) {
                    for (var id in ids) {
                        item = Zotero.Items.get(id);
                        Zotero.debug("ID: " + item);
                        // For deleted items, get title from passed data
                        if (typeof item === 'object') {
                            if (item.getField('url') != '') {
                                alert("URL: " + item.getField('url'));
                            }
                            Zotero.debug("*** Fields: " + item.getField('title'));
                        }
                    }
                } else {
                    item = Zotero.Items.get(ids)[0];
                    Zotero.debug("IDsingle: " + item);
                    if (typeof item === 'object') {
                        var url = item.getField('url');
                        var itemId = item.getField('id');
                        var title = item.getField('title');
                        var oldRecord = Zotero.Hiberlink.DB.query("SELECT url, version FROM changes WHERE itemid='" + itemId + "' ORDER BY version DESC LIMIT 1");
                        var oldUrl = null;
                        var oldVersion = 0;
                        Zotero.debug("Old record: " + oldRecord.length);
                        if (oldRecord) {
                            oldUrl = oldRecord[0]['url'];
                            oldVersion = oldRecord[0]['version'];
                            Zotero.debug("Old version: " + oldVersion);
                            Zotero.debug("Old url:" + oldUrl);
                        }
                        if (url != '' && url != oldUrl) {
//                            alert("URL: " + url);
                            var xhr = new XMLHttpRequest();
                            xhr.open('POST', 'http://archive.is/submit/', true);
                            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                            xhr.onload = function () {
                                Zotero.debug("Upload response: " + this.responseText);
                                Zotero.debug("Upload headers: " + this.getAllResponseHeaders());
                                var archiveUrl = this.getResponseHeader('refresh').split('url=')[1];
                                var insertId = Zotero.Hiberlink.DB.query("INSERT INTO changes (itemid, version, title, url, archiveurl) VALUES ('" + itemId + "', '" + ++oldVersion + "', '" + title + "', '" + url + "', '" + archiveUrl + "')");
                                var timeAccessed = Zotero.Hiberlink.DB.valueQuery("SELECT timestamp FROM changes WHERE id=?", insertId);
                                item.setField('archive', archiveUrl);
                                item.setField('accessDate', timeAccessed);
                                item.save();
//                                ps.alert(null, "", "DB id:" + insertId);
                            };
                            xhr.onerror = function () {
                                ps.alert(null, "", "Could not archive url '" + url + "'");
                                var insertId = Zotero.Hiberlink.DB.query("INSERT INTO changes (itemid, title, url) VALUES ('" + itemId + "', '" + title + "', '" + url + "')");
                            };
                            xhr.send('url=' + url);
                        }
                        Zotero.debug("*** Fields: " + title);
                    }
                }
            }
        }
    },
    refreshArchive: function() {
        ZoteroPane_Local.duplicateSelectedItem();
        var item = ZoteroPane_Local.getSelectedItems()[0];
        item.setField('title', item.getField('title') + ' (' + new Date() + ')');
    }
};

// Initialize the utility
window.addEventListener('load', function (e) {
    Zotero.Hiberlink.init();
}, false);
