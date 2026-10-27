(function (rootScope) {
  "use strict";

  // The only page sessionStorage key the extension writes (spec 4 / 8).
  const MARKER_STORAGE_KEY = "ctdp.system";
  const DEFAULT_TITLE_DEBOUNCE_MS = 300;

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeSystem(raw) {
    if (!isObject(raw) || typeof raw.id !== "string" || !raw.id) return null;
    return { id: raw.id, name: typeof raw.name === "string" ? raw.name : "" };
  }

  // Scope client for one frame. The top frame recognizes the page (resolve-page-scope), keeps the
  // sessionStorage marker in sync and re-resolves when <title> changes; iframes only follow the
  // tab's recorded scope (get-tab-scope + page-scope-changed) and never write anything.
  function createScopeClient(options) {
    const opts = options || {};
    const win = opts.window;
    const doc = opts.document;
    const systemScopeApi = opts.systemScopeApi;
    const isTopFrame = opts.isTopFrame !== false;
    const titleDebounceMs = typeof opts.titleDebounceMs === "number" && opts.titleDebounceMs >= 0 ? opts.titleDebounceMs : DEFAULT_TITLE_DEBOUNCE_MS;
    const sendRuntimeMessage = typeof opts.sendRuntimeMessage === "function"
      ? opts.sendRuntimeMessage
      : function () { return Promise.resolve(null); };
    const addRuntimeMessageListener = typeof opts.addRuntimeMessageListener === "function"
      ? opts.addRuntimeMessageListener
      : defaultAddRuntimeMessageListener;

    const listeners = [];
    const systemNames = {};
    let resolution = buildFallbackResolution(readInfo());
    let requestSeq = 0;
    let lastResolvedTitle = null;
    let titleTimer = null;
    let started = null;
    let tabScopeBroadcastSeen = false;
    let activationPromise = null;

    function defaultAddRuntimeMessageListener(listener) {
      try {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) chrome.runtime.onMessage.addListener(listener);
      } catch (_) {}
    }

    function readTitle() {
      return doc && typeof doc.title === "string" ? doc.title : "";
    }

    function readInfo() {
      try {
        return systemScopeApi.readPageInfo(win.location, readTitle());
      } catch (_) {
        return { hostname: "", lastPath: "", origin: "", pathname: "", port: "", protocol: "", query: {}, title: readTitle() };
      }
    }

    function getFallbackScope(info) {
      try {
        return systemScopeApi.getFallbackScope(info);
      } catch (_) {
        return "";
      }
    }

    function buildFallbackResolution(info) {
      const fallbackScope = getFallbackScope(info);
      return { fallbackScope, marker: null, scope: fallbackScope, system: null };
    }

    function normalizeResolution(raw) {
      if (!isObject(raw) || typeof raw.scope !== "string" || !raw.scope) return null;
      return {
        fallbackScope: typeof raw.fallbackScope === "string" && raw.fallbackScope ? raw.fallbackScope : resolution.fallbackScope,
        marker: systemScopeApi.normalizeSessionMarker(raw.marker),
        scope: raw.scope,
        system: normalizeSystem(raw.system)
      };
    }

    function getSessionStorage() {
      try {
        return win && win.sessionStorage ? win.sessionStorage : null;
      } catch (_) {
        return null;
      }
    }

    function readMarker() {
      try {
        const storage = getSessionStorage();
        const raw = storage ? storage.getItem(MARKER_STORAGE_KEY) : null;
        return raw ? systemScopeApi.normalizeSessionMarker(JSON.parse(raw)) : null;
      } catch (_) {
        return null;
      }
    }

    function writeMarker(marker) {
      try {
        const storage = getSessionStorage();
        if (!storage) return;
        if (marker) storage.setItem(MARKER_STORAGE_KEY, JSON.stringify(marker));
        else storage.removeItem(MARKER_STORAGE_KEY);
      } catch (_) {}
    }

    function isSameResolution(a, b) {
      return (
        a.scope === b.scope &&
        a.fallbackScope === b.fallbackScope &&
        (a.system ? a.system.id + "\n" + a.system.name : "") === (b.system ? b.system.id + "\n" + b.system.name : "")
      );
    }

    function applyResolution(next, persistMarker) {
      const previous = resolution;
      resolution = next;
      if (persistMarker) writeMarker(next.marker);
      if (isSameResolution(previous, next)) return;
      listeners.slice().forEach(function (listener) {
        try {
          listener(next);
        } catch (_) {}
      });
    }

    function send(message) {
      try {
        return Promise.resolve(sendRuntimeMessage(message)).catch(function () {
          return null;
        });
      } catch (_) {
        return Promise.resolve(null);
      }
    }

    // Top-frame request whose answer becomes the page's resolution. A newer request supersedes
    // older in-flight ones so out-of-order responses never roll the scope back.
    function requestTopResolution(message) {
      const seq = ++requestSeq;
      return send(message).then(function (response) {
        const next = normalizeResolution(response);
        if (next && seq === requestSeq) applyResolution(next, true);
        return resolution;
      });
    }

    function resolvePage() {
      const info = readInfo();
      lastResolvedTitle = info.title;
      return requestTopResolution({ info, marker: readMarker(), type: "resolve-page-scope" });
    }

    // A prerendered page is not shown yet: recognizing it would record the tab scope (and maybe
    // create a system) for a page the user may never open, so resolving waits for activation.
    function isPrerendering() {
      return !!doc && doc.prerendering === true;
    }

    function whenActivated() {
      if (!isPrerendering() || typeof doc.addEventListener !== "function") return Promise.resolve();
      if (!activationPromise) {
        activationPromise = new Promise(function (resolve) {
          doc.addEventListener("prerenderingchange", function () { resolve(); }, { once: true });
        });
      }
      return activationPromise;
    }

    function handleTitleMutation() {
      if (titleTimer !== null) win.clearTimeout(titleTimer);
      titleTimer = win.setTimeout(function () {
        titleTimer = null;
        // Activation resolves with the then-current title anyway.
        if (isPrerendering() || readTitle() === lastResolvedTitle) return;
        resolvePage();
      }, titleDebounceMs);
    }

    function observeTitle() {
      const Observer = win && win.MutationObserver;
      const target = doc && (doc.head || doc.documentElement);
      if (typeof Observer !== "function" || !target) return;
      try {
        new Observer(handleTitleMutation).observe(target, { characterData: true, childList: true, subtree: true });
      } catch (_) {}
    }

    function handleRuntimeMessage(message) {
      if (!message) return;
      if (isTopFrame) {
        // The background asks again when the tab has no fresh scope after the page finished loading.
        if (message.type === "request-page-scope" && !isPrerendering()) resolvePage();
        return;
      }
      if (message.type !== "page-scope-changed") return;
      const next = normalizeResolution(message.resolution);
      if (!next) return;
      tabScopeBroadcastSeen = true;
      applyResolution(next, false);
    }

    function startTopFrame() {
      observeTitle();
      addRuntimeMessageListener(handleRuntimeMessage);
      if (win && typeof win.addEventListener === "function") {
        // The background clears the tab scope on navigation; a bfcache restore needs a new record.
        win.addEventListener("pageshow", function (event) {
          if (event && event.persisted === true) resolvePage();
        });
      }
      return whenActivated().then(resolvePage);
    }

    function startFrame() {
      addRuntimeMessageListener(handleRuntimeMessage);
      return send({ type: "get-tab-scope" }).then(function (response) {
        const next = normalizeResolution(response);
        if (next && !tabScopeBroadcastSeen) applyResolution(next, false);
        return resolution;
      });
    }

    // Never throws synchronously: on any failure the page keeps its own fallback resolution.
    function start() {
      if (!started) {
        let run;
        try {
          run = isTopFrame ? startTopFrame() : startFrame();
        } catch (_) {
          run = Promise.resolve(resolution);
        }
        started = Promise.resolve(run).catch(function () {
          return resolution;
        });
      }
      return started;
    }

    function getScope() {
      return resolution.scope;
    }

    function getResolution() {
      return resolution;
    }

    function setSiteFeatureEnabled(enabled) {
      if (!isTopFrame) return Promise.resolve(resolution);
      return requestTopResolution({
        enabled: enabled === true,
        info: readInfo(),
        marker: readMarker(),
        scope: resolution.scope,
        type: "set-site-feature-enabled"
      });
    }

    // Resolves to the new resolution, or null when the background rejected the switch (the
    // previous marker is restored so the next recognition behaves as before).
    function selectSystem(systemId) {
      if (!isTopFrame) return Promise.resolve(resolution);
      const id = typeof systemId === "string" && systemId ? systemId : null;
      const previousMarker = readMarker();
      if (id) writeMarker({ id, manual: true, name: systemNames[id] || "" });
      else writeMarker(null);
      const seq = ++requestSeq;
      return send({ info: readInfo(), systemId: id, type: "select-system" }).then(function (response) {
        const next = normalizeResolution(response);
        if (!next) {
          if (seq === requestSeq) writeMarker(previousMarker);
          return null;
        }
        if (seq === requestSeq) applyResolution(next, true);
        return resolution;
      });
    }

    function listSystems() {
      return send({ type: "list-systems" }).then(function (response) {
        if (!Array.isArray(response)) return [];
        return response.map(normalizeSystem).filter(function (system) {
          if (!system) return false;
          systemNames[system.id] = system.name;
          return true;
        });
      });
    }

    function onChange(listener) {
      if (typeof listener !== "function") return function () {};
      listeners.push(listener);
      return function () {
        const index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      };
    }

    return {
      getResolution,
      getScope,
      listSystems,
      onChange,
      selectSystem,
      setSiteFeatureEnabled,
      start
    };
  }

  const api = {
    DEFAULT_TITLE_DEBOUNCE_MS,
    MARKER_STORAGE_KEY,
    createScopeClient
  };

  rootScope.ChromeTestDataContentScriptScope = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
