import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const systemScopeSandbox = { URLSearchParams };
vm.runInNewContext(readFileSync(join(here, "../extension/generated/system-scope-api.js"), "utf8"), systemScopeSandbox);
const systemScopeApi = systemScopeSandbox.ChromeTestDataSystemScope;
const scopeClientPkg = await import("../extension/src/content-script-scope.js");
const { createScopeClient, MARKER_STORAGE_KEY } = scopeClientPkg.default || scopeClientPkg;

const SYSTEM_A = { fallbackScope: "host:localhost:5173", marker: { id: "a", manual: false, name: "客户管理" }, scope: "system:a", system: { id: "a", name: "客户管理" } };
const FALLBACK = { fallbackScope: "host:localhost:5173", marker: null, scope: "host:localhost:5173", system: null };

function flush() {
  return new Promise(function (resolve) { setImmediate(resolve); });
}

function createSessionStorage(initial, options) {
  const values = new Map(Object.entries(initial || {}));
  const opts = options || {};
  return {
    values,
    getItem(key) {
      if (opts.throws) throw new Error("SecurityError");
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      if (opts.throws) throw new Error("SecurityError");
      values.delete(key);
    },
    setItem(key, value) {
      if (opts.throws) throw new Error("SecurityError");
      values.set(key, String(value));
    }
  };
}

function createEnv(options) {
  const opts = options || {};
  const timers = [];
  const observers = [];
  const windowListeners = {};
  const runtimeListeners = [];
  const messages = [];
  const document = { documentElement: { id: "html" }, head: { id: "head" }, title: opts.title || "" };
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.target = null;
      this.config = null;
      observers.push(this);
    }
    observe(target, config) {
      this.target = target;
      this.config = config;
    }
    disconnect() {}
  }
  const window = {
    MutationObserver: FakeMutationObserver,
    addEventListener(type, listener) {
      windowListeners[type] = listener;
    },
    clearTimeout(id) {
      const timer = timers.find(function (item) { return item.id === id; });
      if (timer) timer.cleared = true;
    },
    location: Object.assign({
      hostname: "localhost",
      origin: "http://localhost:5173",
      pathname: "/users",
      port: "5173",
      protocol: "http:",
      search: ""
    }, opts.location || {}),
    sessionStorage: opts.sessionStorage || createSessionStorage(),
    setTimeout(fn, delay) {
      const timer = { cleared: false, delay, fn, id: timers.length + 1 };
      timers.push(timer);
      return timer.id;
    }
  };
  const respond = opts.respond || function () { return null; };
  const client = createScopeClient({
    addRuntimeMessageListener(listener) {
      runtimeListeners.push(listener);
    },
    document,
    isTopFrame: opts.isTopFrame !== false,
    sendRuntimeMessage(message) {
      messages.push(JSON.parse(JSON.stringify(message)));
      return Promise.resolve().then(function () { return respond(message); });
    },
    systemScopeApi,
    window
  });
  return {
    client,
    document,
    dispatchRuntimeMessage(message) {
      runtimeListeners.forEach(function (listener) { listener(message); });
    },
    messages,
    observers,
    runTimers() {
      timers.splice(0).forEach(function (timer) {
        if (!timer.cleared) timer.fn();
      });
    },
    timers,
    window,
    windowListeners
  };
}

test("start sends the stored marker with resolve-page-scope and writes back the resolved marker", async () => {
  const stored = { id: "a", manual: false, name: "客户管理" };
  const sessionStorage = createSessionStorage({ [MARKER_STORAGE_KEY]: JSON.stringify(stored) });
  const env = createEnv({
    respond(message) {
      return message.type === "resolve-page-scope" ? { ...SYSTEM_A, marker: { id: "a", manual: false, name: "客户管理（新）" } } : null;
    },
    sessionStorage,
    title: "用户列表 - 客户管理"
  });

  const resolution = await env.client.start();

  assert.equal(MARKER_STORAGE_KEY, "ctdp.system");
  assert.equal(env.messages[0].type, "resolve-page-scope");
  assert.deepEqual(env.messages[0].marker, stored);
  assert.equal(env.messages[0].info.hostname, "localhost");
  assert.equal(env.messages[0].info.port, "5173");
  assert.equal(env.messages[0].info.title, "用户列表 - 客户管理");
  assert.equal(resolution.scope, "system:a");
  assert.equal(env.client.getScope(), "system:a");
  assert.deepEqual(JSON.parse(sessionStorage.values.get(MARKER_STORAGE_KEY)), { id: "a", manual: false, name: "客户管理（新）" });
});

test("start removes the marker when the resolution carries none", async () => {
  const sessionStorage = createSessionStorage({ [MARKER_STORAGE_KEY]: JSON.stringify({ id: "gone", name: "旧系统" }) });
  const env = createEnv({ respond() { return FALLBACK; }, sessionStorage, title: "其他项目" });

  await env.client.start();

  assert.equal(sessionStorage.values.has(MARKER_STORAGE_KEY), false);
  assert.equal(env.client.getScope(), "host:localhost:5173");
});

test("start completes when sessionStorage access throws", async () => {
  const env = createEnv({
    respond() { return SYSTEM_A; },
    sessionStorage: createSessionStorage({}, { throws: true }),
    title: "客户管理"
  });

  const resolution = await env.client.start();

  assert.equal(env.messages[0].marker, null);
  assert.equal(resolution.scope, "system:a");
});

test("start falls back to the page's own scope when messaging fails and never rejects", async () => {
  const env = createEnv({
    respond() { throw new Error("Extension context invalidated"); }
  });

  assert.equal(env.client.getScope(), "host:localhost:5173");
  const resolution = await env.client.start();

  assert.deepEqual(resolution, FALLBACK);
  assert.deepEqual(env.client.getResolution(), FALLBACK);
});

test("a title that appears after start re-resolves once after the debounce and notifies listeners", async () => {
  const env = createEnv({
    respond(message) {
      if (message.type !== "resolve-page-scope") return null;
      return message.info.title === "客户管理" ? SYSTEM_A : FALLBACK;
    }
  });
  const changes = [];

  await env.client.start();
  env.client.onChange(function (resolution) { changes.push(resolution.scope); });
  assert.equal(env.client.getScope(), "host:localhost:5173");
  assert.equal(env.observers.length, 1);
  assert.equal(env.observers[0].target, env.document.head);
  assert.deepEqual(env.observers[0].config, { characterData: true, childList: true, subtree: true });

  env.document.title = "客户管理";
  env.observers[0].callback([]);
  env.observers[0].callback([]);
  assert.equal(env.messages.length, 1);
  assert.equal(env.timers.filter(function (timer) { return !timer.cleared; }).length, 1);
  assert.equal(env.timers.at(-1).delay, 300);
  env.runTimers();
  await flush();

  assert.equal(env.messages.length, 2);
  assert.equal(env.messages[1].type, "resolve-page-scope");
  assert.equal(env.messages[1].info.title, "客户管理");
  assert.equal(env.client.getScope(), "system:a");
  assert.deepEqual(changes, ["system:a"]);
});

test("head mutations that keep the same title do not re-resolve", async () => {
  const env = createEnv({ respond() { return SYSTEM_A; }, title: "客户管理" });
  await env.client.start();

  env.observers[0].callback([]);
  env.runTimers();
  await flush();

  assert.equal(env.messages.length, 1);
});

test("the title observer falls back to documentElement without a head", async () => {
  const env = createEnv({ respond() { return FALLBACK; } });
  env.document.head = null;
  await env.client.start();
  assert.equal(env.observers[0].target, env.document.documentElement);
});

test("a bfcache restore re-resolves the page scope", async () => {
  const env = createEnv({ respond() { return SYSTEM_A; }, title: "客户管理" });
  await env.client.start();

  env.windowListeners.pageshow({ persisted: false });
  await flush();
  assert.equal(env.messages.length, 1);

  env.windowListeners.pageshow({ persisted: true });
  await flush();
  assert.equal(env.messages.length, 2);
  assert.equal(env.messages[1].type, "resolve-page-scope");
});

test("iframes ask for the tab scope instead of resolving and follow page-scope-changed", async () => {
  const sessionStorage = createSessionStorage();
  const env = createEnv({
    isTopFrame: false,
    location: { hostname: "static.example.com", origin: "https://static.example.com", port: "", protocol: "https:" },
    respond(message) { return message.type === "get-tab-scope" ? null : SYSTEM_A; },
    sessionStorage
  });
  const changes = [];

  const resolution = await env.client.start();
  env.client.onChange(function (next) { changes.push(next.scope); });

  assert.deepEqual(env.messages.map(function (message) { return message.type; }), ["get-tab-scope"]);
  assert.equal(resolution.scope, "host:static.example.com");
  assert.equal(env.observers.length, 0);

  env.dispatchRuntimeMessage({ resolution: SYSTEM_A, type: "page-scope-changed" });
  assert.equal(env.client.getScope(), "system:a");
  assert.deepEqual(changes, ["system:a"]);
  assert.equal(sessionStorage.values.size, 0);
});

test("iframes adopt a tab scope that is already recorded", async () => {
  const env = createEnv({
    isTopFrame: false,
    respond(message) { return message.type === "get-tab-scope" ? SYSTEM_A : null; }
  });

  const resolution = await env.client.start();

  assert.equal(resolution.scope, "system:a");
});

test("iframes never send toggle writes or system selections", async () => {
  const env = createEnv({ isTopFrame: false, respond() { return null; } });
  await env.client.start();

  await env.client.setSiteFeatureEnabled(true);
  await env.client.selectSystem("b");

  assert.deepEqual(env.messages.map(function (message) { return message.type; }), ["get-tab-scope"]);
});

test("setSiteFeatureEnabled sends the current scope, page info and marker", async () => {
  const sessionStorage = createSessionStorage();
  const env = createEnv({
    respond(message) { return message.type === "set-site-feature-enabled" ? SYSTEM_A : FALLBACK; },
    sessionStorage,
    title: "客户管理"
  });
  await env.client.start();

  const resolution = await env.client.setSiteFeatureEnabled(true);

  const message = env.messages.at(-1);
  assert.equal(message.type, "set-site-feature-enabled");
  assert.equal(message.enabled, true);
  assert.equal(message.scope, "host:localhost:5173");
  assert.equal(message.info.title, "客户管理");
  assert.equal(message.marker, null);
  assert.equal(resolution.scope, "system:a");
  assert.deepEqual(JSON.parse(sessionStorage.values.get(MARKER_STORAGE_KEY)), SYSTEM_A.marker);
});

test("selectSystem writes a manual marker and selectSystem(null) removes it", async () => {
  const sessionStorage = createSessionStorage();
  const manualB = { fallbackScope: "host:localhost:5173", marker: { id: "b", manual: true, name: "订单中心" }, scope: "system:b", system: { id: "b", name: "订单中心" } };
  const env = createEnv({
    respond(message) {
      if (message.type === "list-systems") return [{ id: "a", name: "客户管理" }, { id: "b", name: "订单中心" }, { name: "无 ID" }];
      if (message.type === "select-system") return message.systemId === "b" ? manualB : FALLBACK;
      return FALLBACK;
    },
    sessionStorage
  });
  await env.client.start();

  assert.deepEqual(await env.client.listSystems(), [{ id: "a", name: "客户管理" }, { id: "b", name: "订单中心" }]);
  const selected = await env.client.selectSystem("b");
  assert.equal(env.messages.at(-1).type, "select-system");
  assert.equal(env.messages.at(-1).systemId, "b");
  assert.equal(env.messages.at(-1).info.hostname, "localhost");
  assert.equal(selected.scope, "system:b");
  assert.deepEqual(JSON.parse(sessionStorage.values.get(MARKER_STORAGE_KEY)), { id: "b", manual: true, name: "订单中心" });

  const automatic = await env.client.selectSystem(null);
  assert.deepEqual(env.messages.at(-1), { info: env.messages.at(-1).info, systemId: null, type: "select-system" });
  assert.equal(automatic.scope, "host:localhost:5173");
  assert.equal(sessionStorage.values.has(MARKER_STORAGE_KEY), false);
});

test("listSystems returns an empty list when messaging fails", async () => {
  const env = createEnv({ respond() { throw new Error("offline"); } });
  assert.deepEqual(await env.client.listSystems(), []);
});

test("onChange returns an unsubscribe function", async () => {
  const env = createEnv({ isTopFrame: false, respond() { return null; } });
  await env.client.start();
  const changes = [];
  const unsubscribe = env.client.onChange(function (next) { changes.push(next.scope); });
  unsubscribe();
  env.dispatchRuntimeMessage({ resolution: SYSTEM_A, type: "page-scope-changed" });
  assert.deepEqual(changes, []);
});
