Zotero.HiberlinkSettings = {
    DB: null,

    init: function () {
        var archiveServiceEnabled = Zotero.HiberlinkSettings.getSetting("archiveServiceEnabled");
        var archiveServiceCheckbox = document.getElementById("service-checkbox");
        archiveServiceCheckbox.checked = archiveServiceEnabled == 'true';
        var archiveServiceUrl = Zotero.HiberlinkSettings.getSetting("archiveServiceUrl");
        Zotero.debug("Service url: " + archiveServiceUrl);
        var archiveServiceUrlInput = document.getElementById("service-url");
        archiveServiceUrlInput.value = archiveServiceUrl;
        var hiberActiveEnabled = Zotero.HiberlinkSettings.getSetting("hiberactiveEnabled");
        var hiberActiveCheckbox = document.getElementById("hiberactive-checkbox");
        hiberActiveCheckbox.checked = hiberActiveEnabled == 'true';
        var hiberActiveUrl = Zotero.HiberlinkSettings.getSetting("hiberactiveUrl");
        var hiberActiveUrlInput = document.getElementById("hiberactive-url");
        hiberActiveUrlInput.value = hiberActiveUrl;
        var hiberActiveTopic = Zotero.HiberlinkSettings.getSetting("hiberactiveTopic");
        var hiberActiveTopicInput = document.getElementById("topic-url");
        hiberActiveTopicInput.value = hiberActiveTopic;
    },

    saveSettings: function () {
        var serviceCheckbox = document.getElementById("service-checkbox");
        var serviceUrl = document.getElementById("service-url");
        var hiberActiveCheckbox = document.getElementById("hiberactive-checkbox");
        var hiberActiveUrl = document.getElementById("hiberactive-url");
        var hiberActiveTopic = document.getElementById("topic-url");
        Zotero.HiberlinkSettings.setSetting("archiveServiceEnabled", serviceCheckbox.checked);
        Zotero.HiberlinkSettings.setSetting("archiveServiceUrl", serviceUrl.value);
        Zotero.HiberlinkSettings.setSetting("hiberactiveEnabled", hiberActiveCheckbox.checked);
        Zotero.HiberlinkSettings.setSetting("hiberactiveUrl", hiberActiveUrl.value);
        Zotero.HiberlinkSettings.setSetting("hiberactiveTopic", hiberActiveTopic.value);
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

    setSetting: function (key, value) {
        if (key != null && value != null) {
            Zotero.Hiberlink.DB.query("UPDATE settings SET value=? WHERE key=?", [value.toString(), key]);
        }
    }
};