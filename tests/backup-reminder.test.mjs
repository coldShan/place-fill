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

test("weekly backup reminder only displays on enabled sites until dismissed", async () => {
  const onAlarm = createEvent();
  const onActivated = createEvent();
  const onMessage = createEvent();
  const onUpdated = createEvent();
  let createdAlarm = null;
  let sentMessage = null;
  let sentMessages = [];
  const storageData = {};
  const tabUrls = {
    7: "https://enabled.example.com/form",
    8: "https://disabled.example.com/form",
    9: "https://enabled.example.com/next"
  };
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
      onMessage,
      onStartup: createEvent()
    },
    storage: {
      local: {
        get(keys, callback) {
          if (typeof keys === "string") {
            callback({ [keys]: storageData[keys] });
            return;
          }
          callback({ ...storageData });
        },
        remove(key, callback) {
          delete storageData[key];
          callback?.();
        },
        set(values, callback) {
          Object.assign(storageData, values);
          callback?.();
        }
      },
      onChanged: createEvent()
    },
    tabs: {
      create() {},
      get(tabId, callback) { callback({ id: tabId, url: tabUrls[tabId] }); },
      onActivated,
      onUpdated,
      query(query, callback) {
        if (Object.keys(query).length === 0) {
          callback(Object.entries(tabUrls).map(function ([id, url]) { return { id: Number(id), url }; }));
          return;
        }
        callback([{ id: 7, url: tabUrls[7] }]);
      },
      sendMessage(tabId, message, options, callback) {
        sentMessage = { message, options, tabId };
        sentMessages.push(sentMessage);
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
        getDefaultSiteFeatureEnabled() { return false; },
        isSiteFeatureEnabled(value) { return value === true; },
        normalizeSiteFeatureEnabledMap(value) { return value || {}; },
        readSiteFeatureEnabledMap() { return Promise.resolve({ "enabled.example.com": true }); },
        readSiteFeatureEnabled({ hostname }) { return Promise.resolve(hostname === "enabled.example.com"); }
      },
      ChromeTestDataSmartFill: {
        formatSmartFillButtonLabel(fieldKey) { return fieldKey; },
        getSupportedFieldKeys() { return ["mobile"]; }
      }
    },
    importScripts() {}
  });

  await new Promise(function (resolve) { setImmediate(resolve); });

  const scheduledAt = new Date(createdAlarm.options.when);
  assert.equal(createdAlarm.name, "weekly-backup-reminder");
  assert.equal(createdAlarm.options.periodInMinutes, 7 * 24 * 60);
  assert.equal(scheduledAt.getDay(), 5);
  assert.equal(scheduledAt.getHours(), 10);
  assert.equal(scheduledAt.getMinutes(), 0);

  onAlarm.dispatch({ name: "weekly-backup-reminder" });
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(Number.isFinite(storageData["ctdp.backupReminderPendingAt.v1"]), true);
  assert.equal(sentMessage.tabId, 7);
  assert.equal(sentMessage.message.type, "show-backup-reminder");
  assert.equal(sentMessage.message.message, "该备份数据啦！");
  assert.equal(sentMessage.options.frameId, 0);

  sentMessage = null;
  onActivated.dispatch({ tabId: 8 });
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(sentMessage.tabId, 8);
  assert.equal(sentMessage.message.type, "hide-backup-reminder");

  sentMessage = null;
  onActivated.dispatch({ tabId: 9 });
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(sentMessage.tabId, 9);
  assert.equal(sentMessage.message.type, "show-backup-reminder");

  let reminderState = null;
  onMessage.dispatch({ type: "read-backup-reminder-state" }, { tab: { url: tabUrls[8] } }, function (response) {
    reminderState = response;
  });
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(reminderState.pending, false);

  onMessage.dispatch({ type: "read-backup-reminder-state" }, { tab: { url: tabUrls[9] } }, function (response) {
    reminderState = response;
  });
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(reminderState.pending, true);

  sentMessages = [];
  onMessage.dispatch({ type: "dismiss-backup-reminder" }, {}, function () {});
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(storageData["ctdp.backupReminderPendingAt.v1"], undefined);
  assert.deepEqual(
    sentMessages.map(function (entry) { return [entry.tabId, entry.message.type]; }),
    [[7, "hide-backup-reminder"], [8, "hide-backup-reminder"], [9, "hide-backup-reminder"]]
  );

  sentMessage = null;
  onUpdated.dispatch(9, { status: "complete" }, { active: true, id: 9, url: tabUrls[9] });
  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(sentMessage.tabId, 9);
  assert.equal(sentMessage.message.type, "hide-backup-reminder");
});
