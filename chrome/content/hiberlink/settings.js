Zotero.HiberlinkSettings = {
    DB: null,

    init: function () {
        var archiveServiceEnabled = Zotero.Hiberlink.DB.query("SELECT value from settings WHERE key=?", ["archiveServiceEnabled"])[0]['value'];
        var archiveServiceCheckbox = document.getElementById("service-checkbox");
        archiveServiceCheckbox.checked = archiveServiceEnabled == 'true';
        var archiveServiceUrl = Zotero.Hiberlink.DB.query("SELECT value from settings WHERE key=?", ["archiveServiceUrl"])[0]['value'];
        Zotero.debug("Service url: " + archiveServiceUrl);
        var archiveServiceUrlInput = document.getElementById("service-url");
        archiveServiceUrlInput.value = archiveServiceUrl;
    },

    saveSettings: function () {
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
            data += "<a href='" + result['url'] + "' data-versionurl='" + result['archiveurl'] + "' data-versiondate='"
                + result['timestamp'] + "'>" + result['url'] + "</a>";
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
            NetUtil.asyncCopy(istream, ostream, function (status) {
                if (!Components.isSuccessCode(status)) {
                    Zotero.debug("Could not write to file");
                }
            });
        }
    }
};