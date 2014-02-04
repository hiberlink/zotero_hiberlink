function buildContent() {
    var reportElement = document.getElementById('hiberlink-report');
    var params = parseParams(window.location.search.substring(1));
    var results = getResults(params);
    var table = document.createElement("table");
    table.setAttribute("id", "hor-minimalist-a");
    var thead = document.createElement("thead");
    var theadrow = document.createElement("tr");
    var titleTitle = document.createElement("th");
    titleTitle.appendChild(document.createTextNode("Title"));
    theadrow.appendChild(titleTitle);
    var urlTitle = document.createElement("th");
    urlTitle.appendChild(document.createTextNode("URL"));
    theadrow.appendChild(urlTitle);
    var archiveTitle = document.createElement("th");
    archiveTitle.appendChild(document.createTextNode("Archive URL"));
    theadrow.appendChild(archiveTitle);
    var timeTitle = document.createElement("th");
    timeTitle.appendChild(document.createTextNode("Timestamp"));
    theadrow.appendChild(timeTitle);
    thead.appendChild(theadrow);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        var tr = document.createElement("tr");
        var titleTd = document.createElement("td");
        titleTd.appendChild(document.createTextNode(result['title']));
        tr.appendChild(titleTd);
        var urlTd = document.createElement("td");
        var urlLink = document.createElement("a");
        urlLink.setAttribute("href", result['url']);
        urlLink.appendChild(document.createTextNode(result['url']));
        urlTd.appendChild(urlLink);
        tr.appendChild(urlTd);
        var archiveTd = document.createElement("td");
        var archiveLink = document.createElement("a");
        archiveLink.setAttribute("href", result['archiveurl']);
        archiveLink.appendChild(document.createTextNode(result['archiveurl']));
        archiveTd.appendChild(archiveLink);
        tr.appendChild(archiveTd);
        var timeTd = document.createElement("td");
        timeTd.appendChild(document.createTextNode(result['timestamp']));
        tr.appendChild(timeTd);
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