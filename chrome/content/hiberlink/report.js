function buildContent() {
    var reportElement = document.getElementById('hiberlink-report');
    var params = parseParams(window.location.search.substring(1));
    var results = getResults(params);
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
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        data += "<a href='" + result['url'] + "' data-versionurl='" + result['archiveurl'] + "' data-versiondate='" + result['timestamp'] + "'>" + result['url'] + "</a>";
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
                return;
            }
        });
    }
}

function getResults(params) {
    var query = '';
    if (params.length > 0) {
        query += " WHERE";
        for (var j = 0; j < params.length; j++) {
            query += " itemid=" + params[j] + " OR";
        }
    }
    return Zotero.Hiberlink.DB.query("SELECT url, title, archiveurl, timestamp FROM changes" + query.substring(0, query.length - 3));
}