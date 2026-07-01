(function (rootScope) {
  "use strict";

  const CONFIG_STORAGE_KEY = "ctdp.aiRecognitionConfig.v1";
  const FIELD_MAPPING_STORAGE_KEY = "ctdp.aiFieldMappings.v1";
  const AI_OVERRIDE_CONFIDENCE = 0.82;
  const AI_SUPPLEMENT_CONFIDENCE = 0.65;
  const DEFAULT_MODEL = "gpt-4o-mini";

  function getStorageArea(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, "storageArea")) return env.storageArea || null;
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
    } catch (_) {}
    return null;
  }

  function readStorageValue(storageArea, key) {
    if (!storageArea || typeof storageArea.get !== "function") return Promise.resolve(undefined);
    return new Promise(function (resolve) {
      let settled = false;
      function done(result) {
        if (settled) return;
        settled = true;
        resolve(result && typeof result === "object" ? result[key] : undefined);
      }
      try {
        const maybePromise = storageArea.get([key], done);
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(done, function () { done({}); });
        }
      } catch (_) {
        done({});
      }
    });
  }

  function writeStorageValue(storageArea, key, value) {
    if (!storageArea || typeof storageArea.set !== "function") return Promise.resolve(false);
    return new Promise(function (resolve) {
      let settled = false;
      function done(ok) {
        if (settled) return;
        settled = true;
        resolve(ok !== false);
      }
      try {
        const maybePromise = storageArea.set({ [key]: value }, function () { done(true); });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(function () { done(true); }, function () { done(false); });
        }
      } catch (_) {
        done(false);
      }
    });
  }

  function normalizeBaseUrl(baseUrl) {
    const value = String(baseUrl || "").trim().replace(/\/+$/g, "");
    if (!value) return "";
    let parsed = null;
    try {
      parsed = new URL(value);
    } catch (_) {
      throw new Error("Base URL 必须是合法 HTTPS 地址");
    }
    if (parsed.protocol !== "https:") throw new Error("Base URL 只支持 HTTPS");
    return value;
  }

  function getOrigin(baseUrl) {
    if (!baseUrl) return "";
    try {
      return new URL(baseUrl).origin;
    } catch (_) {
      return "";
    }
  }

  function normalizeAiRecognitionConfig(rawConfig) {
    const raw = rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig) ? rawConfig : {};
    const baseUrl = normalizeBaseUrl(raw.baseUrl);
    const apiKey = typeof raw.apiKey === "string" ? raw.apiKey.trim() : "";
    const model = typeof raw.model === "string" && raw.model.trim() ? raw.model.trim() : DEFAULT_MODEL;
    return {
      enabled: raw.enabled === true,
      baseUrl,
      apiKey,
      model,
      origin: getOrigin(baseUrl),
      permissionGranted: raw.permissionGranted === true
    };
  }

  function getPublicConfig(config) {
    const normalized = normalizeAiRecognitionConfig(config);
    return {
      enabled: normalized.enabled,
      baseUrl: normalized.baseUrl,
      hasApiKey: !!normalized.apiKey,
      model: normalized.model,
      origin: normalized.origin,
      permissionGranted: normalized.permissionGranted
    };
  }

  async function readAiRecognitionConfig(env) {
    const stored = await readStorageValue(getStorageArea(env), CONFIG_STORAGE_KEY);
    return normalizeAiRecognitionConfig(stored);
  }

  async function writeAiRecognitionConfig(config, env) {
    const normalized = normalizeAiRecognitionConfig(config);
    await writeStorageValue(getStorageArea(env), CONFIG_STORAGE_KEY, normalized);
    return normalized;
  }

  function buildPromptPayload(snapshot) {
    const safeSnapshot = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? snapshot
      : { fields: [], allowedFieldKeys: [] };
    return JSON.stringify({
      allowedFieldKeys: Array.isArray(safeSnapshot.allowedFieldKeys) ? safeSnapshot.allowedFieldKeys : [],
      fields: Array.isArray(safeSnapshot.fields) ? safeSnapshot.fields : []
    });
  }

  function buildChatCompletionsRequest(config, snapshot, options) {
    const opts = options || {};
    const normalized = normalizeAiRecognitionConfig(config);
    return {
      url: normalized.baseUrl + "/chat/completions",
      headers: {
        Authorization: "Bearer " + normalized.apiKey,
        "Content-Type": "application/json"
      },
      body: {
        model: normalized.model,
        messages: [
          {
            role: "system",
            content: "你是表单字段分类器。只返回 JSON object，格式为 {\"fields\":[{\"fingerprint\":\"\",\"fieldKey\":\"\",\"confidence\":0}]}。fieldKey 必须来自 allowedFieldKeys。不要返回解释。"
          },
          {
            role: "user",
            content: buildPromptPayload(snapshot)
          }
        ],
        temperature: 0
      }
    };
  }

  function withResponseFormat(request, includeResponseFormat) {
    const nextRequest = {
      url: request.url,
      headers: { ...request.headers },
      body: { ...request.body }
    };
    if (includeResponseFormat !== false) nextRequest.body.response_format = { type: "json_object" };
    return nextRequest;
  }

  function parseContentObject(content) {
    if (content && typeof content === "object" && !Array.isArray(content)) return content;
    const text = String(content || "").trim();
    if (!text) return {};
    return JSON.parse(text);
  }

  function parseChatCompletionsResponse(payload, supportedFieldKeys) {
    const supportedSet = new Set(Array.isArray(supportedFieldKeys) ? supportedFieldKeys : []);
    const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message
      ? payload.choices[0].message.content
      : "";
    const parsed = parseContentObject(content);
    const fields = Array.isArray(parsed.fields) ? parsed.fields : [];
    return fields
      .map(function (field) {
        const fingerprint = String(field && field.fingerprint || "").trim();
        const fieldKey = String(field && field.fieldKey || "").trim();
        const confidence = Number(field && field.confidence);
        if (!fingerprint || !supportedSet.has(fieldKey) || !Number.isFinite(confidence)) return null;
        return {
          fingerprint,
          fieldKey,
          confidence: Math.max(0, Math.min(1, confidence))
        };
      })
      .filter(Boolean);
  }

  function isRetryableResponseFormatStatus(status) {
    return status === 400 || status === 422;
  }

  async function fetchChatCompletions(request, fetchFn) {
    const response = await fetchFn(request.url, {
      body: JSON.stringify(request.body),
      headers: request.headers,
      method: "POST"
    });
    if (!response || !response.ok) {
      const status = response && typeof response.status === "number" ? response.status : 0;
      const error = new Error("AI 识别请求失败");
      error.status = status;
      throw error;
    }
    return response.json();
  }

  async function classifyFormFields(options) {
    const opts = options || {};
    const config = normalizeAiRecognitionConfig(opts.config);
    if (!config.enabled || !config.baseUrl || !config.apiKey || !config.model || !config.permissionGranted) {
      return { fields: [] };
    }
    const fetchFn = typeof opts.fetchFn === "function"
      ? opts.fetchFn
      : (typeof fetch === "function" ? fetch : null);
    if (!fetchFn) return { fields: [] };
    const baseRequest = buildChatCompletionsRequest(config, opts.snapshot || {}, opts);
    let payload = null;
    try {
      payload = await fetchChatCompletions(withResponseFormat(baseRequest, true), fetchFn);
    } catch (error) {
      if (!isRetryableResponseFormatStatus(error && error.status)) throw error;
      payload = await fetchChatCompletions(withResponseFormat(baseRequest, false), fetchFn);
    }
    return {
      fields: parseChatCompletionsResponse(payload, opts.supportedFieldKeys)
    };
  }

  const api = {
    AI_OVERRIDE_CONFIDENCE,
    AI_SUPPLEMENT_CONFIDENCE,
    CONFIG_STORAGE_KEY,
    DEFAULT_MODEL,
    FIELD_MAPPING_STORAGE_KEY,
    buildChatCompletionsRequest: function (config, snapshot, options) {
      return withResponseFormat(buildChatCompletionsRequest(config, snapshot, options), !(options && options.includeResponseFormat === false));
    },
    classifyFormFields,
    getOrigin,
    getPublicConfig,
    normalizeAiRecognitionConfig,
    parseChatCompletionsResponse,
    readAiRecognitionConfig,
    writeAiRecognitionConfig
  };

  rootScope.ChromeTestDataAiRecognition = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
