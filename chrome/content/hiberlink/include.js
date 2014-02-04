// Only create main object once
if (!Zotero.Hiberlink) {
	loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
					.getService(Components.interfaces.mozIJSSubScriptLoader);
	loader.loadSubScript("chrome://hiberlink/content/hiberlink.js");
}
