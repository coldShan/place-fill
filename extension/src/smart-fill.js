(function (rootScope) {
  "use strict";

  function getFieldMetaApi() {
    if (rootScope.ChromeTestDataFieldMeta) return rootScope.ChromeTestDataFieldMeta;
    if (typeof require === "function") {
      try {
        return require("./field-meta.js");
      } catch (_) {}
    }
    return {
      getFieldIconName: function () {
        return "";
      },
      getFieldKeys: function () {
        return [];
      },
      getFieldLabel: function () {
        return "";
      },
      isSupportedFieldKey: function () {
        return false;
      }
    };
  }

  const fieldMetaApi = getFieldMetaApi();

  const FIELD_MATCHERS = [
    {
      fieldKey: "creditCode",
      exact: ["uscc", "creditcode", "socialcreditcode", "unifiedsocialcreditcode", "tongyishehuixinyongdaima", "tyshxydm"],
      patterns: [/统一社会信用代码/u, /社会信用代码/u, /credit\s*code/i, /\buscc\b/i, /social\s*credit/i]
    },
    {
      fieldKey: "idNumber",
      exact: ["idcard", "idnumber", "idno", "identityno", "certno", "certnumber", "shenfenzheng", "shenfenzhenghao", "shenfenzhenghaoma", "sfz", "sfzh", "zjhm"],
      patterns: [/身份证/u, /证件号/u, /identity/i, /id[\s_-]*card/i, /id[\s_-]*no/i, /cert/i]
    },
    {
      fieldKey: "bankCard",
      exact: ["bankcard", "bankcardno", "cardno", "cardnumber", "debitcard", "yinhangkahao", "yhk", "yhkh"],
      patterns: [/银行卡/u, /卡号/u, /bank\s*card/i, /\bcard\s*(?:no|number)?\b/i]
    },
    {
      fieldKey: "mobile",
      exact: ["mobile", "mobilephone", "phone", "phonenumber", "telephone", "tel", "contactphone", "shouji", "shoujihao", "shoujihaoma", "sj", "sjh"],
      patterns: [/手机号/u, /手机号码/u, /联系电话/u, /手机/u, /\bmobile\b/i, /\bphone\b/i, /\btel\b/i]
    },
    {
      fieldKey: "email",
      exact: ["email", "emailaddress", "mail", "mailbox", "youxiang", "yx"],
      patterns: [/邮箱/u, /电子邮箱/u, /\be-?mail\b/i]
    },
    {
      fieldKey: "landline",
      exact: ["landline", "fixedphone", "fixedtelephone", "officephone", "gudingdianhua", "zuoji", "gddh"],
      patterns: [/固定电话/u, /座机/u, /办公电话/u, /\blandline\b/i, /\bfixed\s*(?:phone|telephone|line)\b/i, /\boffice\s*phone\b/i]
    },
    {
      fieldKey: "address",
      exact: ["address", "detailaddress", "postaladdress", "shippingaddress", "contactaddress", "dizhi", "xxdz"],
      patterns: [/地址/u, /开户地址/u, /\baddress\b/i]
    },
    {
      fieldKey: "fullName",
      exact: ["name", "fullname", "realname", "contactname", "username", "xingming", "xm"],
      patterns: [/姓名/u, /联系人/u, /真实姓名/u, /\bfull\s*name\b/i, /\breal\s*name\b/i, /\bname\b/i]
    },
    {
      fieldKey: "companyName",
      exact: ["company", "companyname", "enterprisename", "firmname", "corporationname", "gongsimingcheng", "gsmc", "qiyemingcheng", "qymc"],
      patterns: [/公司名称/u, /企业名称/u, /单位名称/u, /\bcompany\b/i, /\benterprise\b/i, /\bfirm\b/i, /corporation/i]
    }
  ];

  const AUTOCOMPLETE_MAP = {
    email: "email",
    "street-address": "address",
    "address-line1": "address",
    "address-line2": "address",
    tel: "mobile",
    "tel-area-code": "landline",
    "tel-local": "landline",
    "tel-local-prefix": "landline",
    "tel-local-suffix": "landline",
    "tel-national": "mobile",
    name: "fullName",
    "cc-name": "fullName"
  };
  const STORAGE_KEY = "ctdp.smartFillOverrides.v1";
  const EXPORT_FORMAT = "ctdp-smart-fill-overrides";
  const EXPORT_VERSION = 1;
  const SANITIZED_FRAME_SCOPE = "*";

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_\-:]+/g, "");
  }

  function getSupportedFieldKeys() {
    return fieldMetaApi.getFieldKeys();
  }

  function isSupportedFieldKey(fieldKey) {
    return fieldMetaApi.isSupportedFieldKey(fieldKey);
  }

  function getEnvLocation(env) {
    if (env && env.location) return env.location;
    try {
      if (typeof location !== "undefined") return location;
    } catch (_) {}
    return null;
  }

  function getEnvDocument(env) {
    if (env && env.document) return env.document;
    if (typeof document !== "undefined") return document;
    return null;
  }

  function getEnvStorage(env) {
    if (env && env.localStorage) return env.localStorage;
    try {
      if (typeof localStorage !== "undefined") return localStorage;
    } catch (_) {}
    return null;
  }

  function getWindowName(env) {
    if (env && typeof env.windowName === "string") return env.windowName;
    if (typeof window !== "undefined" && typeof window.name === "string") return window.name;
    return "";
  }

  function getFrameElement(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, "frameElement")) return env.frameElement;
    if (typeof window !== "undefined") {
      try {
        return window.frameElement;
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  function getFrameScope(env) {
    const frameElement = getFrameElement(env);
    const frameParts = [
      normalizeText(getWindowName(env)),
      normalizeText(frameElement && frameElement.getAttribute && frameElement.getAttribute("id")),
      normalizeText(frameElement && frameElement.getAttribute && frameElement.getAttribute("name")),
      normalizeText(frameElement && frameElement.getAttribute && frameElement.getAttribute("src"))
    ].filter(Boolean);

    return frameParts.length ? frameParts.join("|") : "top";
  }

  function getPageScope(env) {
    const currentLocation = getEnvLocation(env);
    if (!currentLocation) return "";
    return String(currentLocation.origin || "") + String(currentLocation.pathname || "");
  }

  function getSiteScope(env) {
    const currentLocation = getEnvLocation(env);
    if (!currentLocation) return "";
    return String(currentLocation.origin || "");
  }

  function isEditableCandidate(node) {
    if (!node || node.disabled || node.readOnly) return false;
    const tagName = String(node.tagName || "").toUpperCase();
    if (tagName === "TEXTAREA") return true;
    if (tagName === "INPUT") {
      const type = String(node.type || "text").toLowerCase();
      return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(type);
    }
    return !!node.isContentEditable;
  }

  function getEditableCandidates(env) {
    const doc = getEnvDocument(env);
    if (!doc || typeof doc.querySelectorAll !== "function") return [];
    return Array.from(doc.querySelectorAll('input, textarea, [contenteditable], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]')).filter(isEditableCandidate);
  }

  function getLabelTexts(element) {
    if (!Array.isArray(element && element.labels)) return [];
    return element.labels
      .map(function (label) {
        return label && (label.textContent || label.innerText || "");
      })
      .filter(Boolean);
  }

  function collectHints(element) {
    if (!element) return [];
    const hints = [
      element.getAttribute && element.getAttribute("autocomplete"),
      element.getAttribute && element.getAttribute("name"),
      element.getAttribute && element.getAttribute("id"),
      element.getAttribute && element.getAttribute("placeholder"),
      element.getAttribute && element.getAttribute("aria-label"),
      element.ariaLabel
    ];

    getLabelTexts(element).forEach(function (text) {
      hints.push(text);
    });

    return hints.filter(Boolean);
  }

  function getFieldFingerprintBase(element) {
    if (!element) return "";
    const parts = [
      "tag=" + normalizeText(element.tagName),
      "type=" + normalizeText(element.type),
      "id=" + normalizeText(element.getAttribute && element.getAttribute("id")),
      "name=" + normalizeText(element.getAttribute && element.getAttribute("name")),
      "autocomplete=" + normalizeText(element.getAttribute && element.getAttribute("autocomplete")),
      "placeholder=" + normalizeText(element.getAttribute && element.getAttribute("placeholder")),
      "aria=" + normalizeText(element.getAttribute && element.getAttribute("aria-label")),
      "labels=" + getLabelTexts(element).map(normalizeText).join("|")
    ];
    return parts.join("&");
  }

  function getFieldFingerprint(element, env) {
    const base = getFieldFingerprintBase(element);
    if (!base) return "";
    const matches = getEditableCandidates(env).filter(function (candidate) {
      return getFieldFingerprintBase(candidate) === base;
    });
    if (matches.length <= 1) return base;
    const index = matches.indexOf(element);
    return base + "#" + String(index >= 0 ? index + 1 : 1);
  }

  function buildStorageKey(pageScope, frameScope, fieldFingerprint) {
    return [pageScope, frameScope, fieldFingerprint].filter(Boolean).join("::");
  }

  function parseStorageKey(key) {
    const parts = String(key || "").split("::");
    if (parts.length !== 3) return null;
    if (!parts[0] || !parts[1] || !parts[2]) return null;
    return {
      pageScope: parts[0],
      frameScope: parts[1],
      fieldFingerprint: parts[2]
    };
  }

  function getTargetStorageKey(element, env) {
    if (!element) return "";
    return buildStorageKey(getPageScope(env), getFrameScope(env), getFieldFingerprint(element, env));
  }

  function getSanitizedStorageKey(element, env) {
    if (!element) return "";
    return buildStorageKey(getSiteScope(env), SANITIZED_FRAME_SCOPE, getFieldFingerprint(element, env));
  }

  function readOverrideMap(env) {
    const storage = getEnvStorage(env);
    if (!storage || typeof storage.getItem !== "function") return {};
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeOverrideMap(nextMap, env) {
    const storage = getEnvStorage(env);
    if (!storage || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") return false;
    const keys = Object.keys(nextMap || {});
    try {
      if (!keys.length) {
        storage.removeItem(STORAGE_KEY);
        return true;
      }
      storage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
      return true;
    } catch (_) {
      return false;
    }
  }

  function getNormalizedOverrideMap(env) {
    const nextMap = {};
    const overrides = readOverrideMap(env);
    Object.keys(overrides).forEach(function (key) {
      if (!parseStorageKey(key)) return;
      if (!isSupportedFieldKey(overrides[key])) return;
      nextMap[key] = overrides[key];
    });
    return nextMap;
  }

  function getManualFieldOverride(element, env) {
    const exactKey = getTargetStorageKey(element, env);
    const siteKey = getSanitizedStorageKey(element, env);
    const overrides = getNormalizedOverrideMap(env);
    const override = overrides[exactKey] || overrides[siteKey];
    return isSupportedFieldKey(override) ? override : null;
  }

  function setManualFieldOverride(element, fieldKey, env) {
    if (!element || !isSupportedFieldKey(fieldKey)) return false;
    const key = getTargetStorageKey(element, env);
    if (!key) return false;
    const overrides = getNormalizedOverrideMap(env);
    overrides[key] = fieldKey;
    return writeOverrideMap(overrides, env);
  }

  function clearManualFieldOverride(element, env) {
    if (!element) return false;
    const key = getTargetStorageKey(element, env);
    if (!key) return false;
    const overrides = getNormalizedOverrideMap(env);
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) return true;
    delete overrides[key];
    return writeOverrideMap(overrides, env);
  }

  function exportManualFieldOverrides(env) {
    return {
      format: EXPORT_FORMAT,
      storageKey: STORAGE_KEY,
      type: "raw",
      version: EXPORT_VERSION,
      overrides: getNormalizedOverrideMap(env)
    };
  }

  function exportSanitizedManualFieldOverrides(env) {
    const entries = [];
    const seenFingerprints = new Map();

    Object.entries(getNormalizedOverrideMap(env)).forEach(function ([key, fieldKey]) {
      const parsed = parseStorageKey(key);
      if (!parsed) return;
      seenFingerprints.set(parsed.fieldFingerprint, fieldKey);
    });

    Array.from(seenFingerprints.entries())
      .sort(function (left, right) {
        return left[0].localeCompare(right[0]);
      })
      .forEach(function ([fieldFingerprint, fieldKey]) {
        entries.push({ fieldFingerprint, fieldKey });
      });

    return {
      entries,
      format: EXPORT_FORMAT,
      type: "sanitized",
      version: EXPORT_VERSION
    };
  }

  function assertImportPackageShape(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invalid override import payload");
    }
    if (payload.format !== EXPORT_FORMAT) {
      throw new Error("Invalid override import format");
    }
    if (payload.version !== EXPORT_VERSION) {
      throw new Error("Unsupported override import version");
    }
    if (payload.type !== "raw" && payload.type !== "sanitized") {
      throw new Error("Invalid override import type");
    }
  }

  function assertImportFieldKey(fieldKey) {
    if (!isSupportedFieldKey(fieldKey)) {
      throw new Error("Invalid override field key: " + fieldKey);
    }
  }

  function importRawOverrides(payload, env) {
    if (!payload.overrides || typeof payload.overrides !== "object" || Array.isArray(payload.overrides)) {
      throw new Error("Invalid raw override payload");
    }
    const overrides = getNormalizedOverrideMap(env);
    const entries = Object.entries(payload.overrides);

    entries.forEach(function ([key, fieldKey]) {
      if (!parseStorageKey(key)) throw new Error("Invalid override storage key");
      assertImportFieldKey(fieldKey);
      overrides[key] = fieldKey;
    });

    if (!writeOverrideMap(overrides, env)) throw new Error("Failed to persist override import");
    return { importedCount: entries.length, type: "raw" };
  }

  function importSanitizedOverrides(payload, env) {
    if (!Array.isArray(payload.entries)) throw new Error("Invalid sanitized override payload");
    const siteScope = getSiteScope(env);
    if (!siteScope) throw new Error("Cannot infer current site scope");
    const overrides = getNormalizedOverrideMap(env);

    payload.entries.forEach(function (entry) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error("Invalid sanitized override entry");
      }
      if (!String(entry.fieldFingerprint || "").trim()) {
        throw new Error("Invalid sanitized field fingerprint");
      }
      assertImportFieldKey(entry.fieldKey);
      overrides[buildStorageKey(siteScope, SANITIZED_FRAME_SCOPE, entry.fieldFingerprint)] = entry.fieldKey;
    });

    if (!writeOverrideMap(overrides, env)) throw new Error("Failed to persist override import");
    return { importedCount: payload.entries.length, type: "sanitized" };
  }

  function importManualFieldOverrides(payload, env) {
    assertImportPackageShape(payload);
    if (payload.type === "raw") return importRawOverrides(payload, env);
    return importSanitizedOverrides(payload, env);
  }

  function inferByAutocomplete(element) {
    const autocomplete = normalizeText(element && element.getAttribute && element.getAttribute("autocomplete"));
    return AUTOCOMPLETE_MAP[autocomplete] || null;
  }

  function inferFieldKeyForSmartFill(element, env) {
    if (!element) return null;

    const override = getManualFieldOverride(element, env);
    if (override) return override;

    const byAutocomplete = inferByAutocomplete(element);
    if (byAutocomplete) return byAutocomplete;

    const normalizedHints = collectHints(element).map(normalizeText).filter(Boolean);
    const rawHints = collectHints(element);

    for (const matcher of FIELD_MATCHERS) {
      if (
        normalizedHints.some(function (hint) {
          return matcher.exact.includes(hint);
        })
      ) {
        return matcher.fieldKey;
      }
      if (
        rawHints.some(function (hint) {
          return matcher.patterns.some(function (pattern) {
            return pattern.test(String(hint || ""));
          });
        })
      ) {
        return matcher.fieldKey;
      }
    }

    return null;
  }

  function formatSmartFillButtonLabel(fieldKey) {
    return fieldMetaApi.getFieldLabel(fieldKey) || "智能填充";
  }

  function getFieldIconName(fieldKey) {
    return fieldMetaApi.getFieldIconName(fieldKey) || "id-card";
  }

  function getSmartFillMenuFieldKeys(primaryFieldKey) {
    const fieldKeys = getSupportedFieldKeys();
    if (!fieldKeys.includes(primaryFieldKey)) return fieldKeys.slice();
    return fieldKeys.filter(function (fieldKey) {
      return fieldKey !== primaryFieldKey;
    });
  }

  const api = {
    clearManualFieldOverride,
    exportManualFieldOverrides,
    exportSanitizedManualFieldOverrides,
    formatSmartFillButtonLabel,
    getFieldIconName,
    getSmartFillMenuFieldKeys,
    getSupportedFieldKeys,
    importManualFieldOverrides,
    inferFieldKeyForSmartFill,
    setManualFieldOverride
  };

  rootScope.ChromeTestDataSmartFill = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
