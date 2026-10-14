const dataManagerModuleUrl = new URL("../generated/data-manager.js", import.meta.url);
dataManagerModuleUrl.searchParams.set("v", chrome.runtime.getManifest().version);
await import(dataManagerModuleUrl.href);
