import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "../extension/background.js"), "utf8");

function createEvent() {
  const listeners = [];
  return {
    addListener(listener) {
      listeners.push(listener);
    },
    dispatch(...args) {
      listeners.forEach(function (listener) { listener(...args); });
    }
  };
}

test("weekly backup reminder runs Friday at 10:00 and notifies the active tab", () => {
  const onAlarm = createEvent();
  let createdAlarm = null;
  let sentMessage = null;
  const chrome = {
    action: { onClicked: createEvent() },
    alarms: {
      create(name, options) {
        createdAlarm = { name, options };
      },
      get(_name, callback) {
        callback(null);
      },
      onAlarm
    },
    contextMenus: {
      create() {},
      onClicked: createEvent(),
      removeAll(callback) { callback?.(); },
      update(_id, _props, callback) { callback?.(); }
    },
    runtime: {
      getManifest() { return { version: "0.8.0" }; },
      lastError: null,
      onInstalled: createEvent(),
      onMessage: createEvent(),
      onStartup: createEvent()
    },
    storage: {
      local: { get(_keys, callback) { callback({}); } },
      onChanged: createEvent()
    },
    tabs: {
      create() {},
      get(_tabId, callback) { callback({ id: 7, url: "https://example.com/form" }); },
      onActivated: createEvent(),
      onUpdated: createEvent(),
      query(_query, callback) { callback([{ id: 7, url: "https://example.com/form" }]); },
      sendMessage(tabId, message, callback) {
        sentMessage = { message, tabId };
        callback?.();
      }
    }
  };

  vm.runInNewContext(script, {
    URL,
    chrome,
    console,
    fetch() { throw new Error("not used"); },
    globalThis: {
      ChromeTestDataFieldVisibility: {
        STORAGE_KEY: "ctdp.visibleFieldKeys.v1",
        isFieldVisible() { return true; },
        readVisibleFieldKeys() { return Promise.resolve([]); },
        writeVisibleFieldKeys() { return Promise.resolve([]); }
      },
      ChromeTestDataSiteFeatureToggle: {
        STORAGE_KEY: "ctdp.siteFeatureEnabled.v1",
        getDefaultSiteFeatureEnabled() { return true; },
        isSiteFeatureEnabled(value) { return value !== false; },
        normalizeSiteFeatureEnabledMap(value) { return value || {}; },
        readSiteFeatureEnabledMap() { return Promise.resolve({}); }
      },
      ChromeTestDataSmartFill: {
        formatSmartFillButtonLabel(fieldKey) { return fieldKey; },
        getSupportedFieldKeys() { return ["mobile"]; }
      }
    },
    importScripts() {}
  });

  const scheduledAt = new Date(createdAlarm.options.when);
  assert.equal(createdAlarm.name, "weekly-backup-reminder");
  assert.equal(createdAlarm.options.periodInMinutes, 7 * 24 * 60);
  assert.equal(scheduledAt.getDay(), 5);
  assert.equal(scheduledAt.getHours(), 10);
  assert.equal(scheduledAt.getMinutes(), 0);

  onAlarm.dispatch({ name: "weekly-backup-reminder" });
  assert.equal(sentMessage.tabId, 7);
  assert.equal(sentMessage.message.type, "show-backup-reminder");
  assert.equal(sentMessage.message.message, "该备份数据啦！");
});
