function buildContent() {
    var reportElement = document.getElementById('hiberlink-report');
    var params = parseParams(window.location.search.substring(1));
    var results = getResults(params);
    if (results) {
        Zotero.debug("Results: " + results);
        var table = document.createElement("table");
        table.setAttribute("id", "hor-minimalist-a");
        var thead = document.createElement("thead");
        var theadrow = document.createElement("tr");
        theadrow.appendChild(createHeader("Title"));
        theadrow.appendChild(createHeader("URL"));
        theadrow.appendChild(createHeader("Archive URL"));
        theadrow.appendChild(createHeader("Timestamp"));
        thead.appendChild(theadrow);
        table.appendChild(thead);
        var tbody = document.createElement("tbody");
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var tr = document.createElement("tr");
            tr.appendChild(createCell(result['title']));
            tr.appendChild(createCell(result['url'], result['url']));
            tr.appendChild(createCell(result['archiveurl'], result['archiveurl']));
            tr.appendChild(createCell(result['timestamp']));
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        reportElement.appendChild(table);
        var jsTextNode = document.createElement("script");
        jsTextNode.setAttribute("id", "results");
        jsTextNode.textContent = params;
        reportElement.appendChild(jsTextNode);
        Zotero.debug("Table: " + reportElement.innerHTML);
    } else {
        var message = document.createElement("p");
        message.textContent = "Unable to find any results";
        reportElement.appendChild(message);
    }
}

function createHeader(text) {
    var header = document.createElement("th");
    header.appendChild(document.createTextNode(text));
    return header;
}

function createCell(text, linkUrl) {
    var td = document.createElement("td");
    if (linkUrl != null) {
        var content = document.createElement("a");
        content.setAttribute("href", linkUrl);
        content.appendChild(document.createTextNode(text));
        td.appendChild(content);
    } else {
        td.appendChild(document.createTextNode(text));
    }
    return td;
}

function parseParams(params) {
    var list = params.split("&");
    var results = [];
    for (var i = 0; i < list.length; i++) {
        var splitParam = list[i].split("=");
        if (splitParam[0] == "item") {
            results[i] = splitParam[1];
        }
    }
    return results;
}

function saveReport() {
    Components.utils.import("resource://zotero/q.js");
    Components.utils.import("resource://gre/modules/NetUtil.jsm");
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    var resultsElement = document.getElementById("results");
    var itemString = resultsElement.textContent;
    var items = '';
    if (itemString.length > 0) {
        items = itemString.split(",");
    }
    var results = getResults(items);
    var data = "<html><body>";
    var urlOrder = getSetting("urlOrder");
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (urlOrder == 'originalUrl') {
            data += "<a href='" + result['url'] + "' data-versionurl='" + result['archiveurl'] + "' data-versiondate='"
            + result['timestamp'] + "'>" + result['url'] + "</a>";
        } else {
            data += "<a href='" + result['archiveurl'] + "' data-originalurl='" + result['url'] + "' data-versiondate='"
            + result['timestamp'] + "'>" + result['archiveurl'] + "</a>";
        }        
    }
    data += "</body></html>";
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, "Select a File", nsIFilePicker.modeSave);
    var res = fp.show();
    if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
        var file = fp.file;
        var ostream = FileUtils.openSafeFileOutputStream(file);
        var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
            createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        var istream = converter.convertToInputStream(data);
        NetUtil.asyncCopy(istream, ostream, function(status) {
            if (!Components.isSuccessCode(status)) {
                Zotero.debug("Could not write to file");
            }
        });
    }
}

function getResults(params) {
    var query = '';
    if (params.length > 0) {
        query += " WHERE";
        for (var j = 0; j < params.length; j++) {
            var param = params[j];
            if (isInt(param)) {
                query += " itemid=" + param + " OR";
            }
        }
    }
    return Zotero.Hiberlink.DB.query("SELECT url, title, archiveurl, timestamp FROM changes"
        + query.substring(0, query.length - 3));
}

function getSetting(key) {
        var value = null;
        var rows = Zotero.Hiberlink.DB.query("SELECT value from settings WHERE key=?", [key]);
        if (rows.length > 0) {
            var row = rows[0];
            if (row != null) {
                value = row['value'];
            }
        }
        return value;
    }

// Function to check that value is an integer. We're constructing our own SQL query from the
// params passed to the page so we need to make sure that we're not allowing SQL injections.
function isInt(value) {
    return !isNaN(value) &&
        parseInt(Number(value)) == value &&
        !isNaN(parseInt(value, 10));
}