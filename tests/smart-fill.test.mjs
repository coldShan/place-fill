import test from "node:test";
import assert from "node:assert/strict";
import smartFillPkg from "../extension/src/smart-fill.js";
import fieldMetaPkg from "../extension/src/field-meta.js";

const {
  clearManualFieldOverride,
  exportManualFieldOverrides,
  exportSanitizedManualFieldOverrides,
  formatSmartFillButtonLabel,
  getFieldIconName,
  getSmartFillMenuFieldKeys,
  getSupportedFieldKeys,
  importManualFieldOverrides,
  inferFieldKeyForSmartFill,
  loadManualFieldOverrides,
  setManualFieldOverride
} = smartFillPkg;
const { getFieldDefinitions, getFieldKeys } = fieldMetaPkg;

function createElement(props) {
  return {
    tagName: "INPUT",
    type: "text",
    autocomplete: "",
    id: "",
    name: "",
    placeholder: "",
    ariaLabel: "",
    labels: [],
    getAttribute(name) {
      if (name === "aria-label") return this.ariaLabel;
      if (name === "placeholder") return this.placeholder;
      if (name === "autocomplete") return this.autocomplete;
      if (name === "name") return this.name;
      if (name === "id") return this.id;
      return "";
    },
    ...props
  };
}

function createStorageArea(initialState) {
  const state = { ...(initialState || {}) };
  return {
    get(keys, callback) {
      const result = Array.isArray(keys)
        ? Object.fromEntries(
            keys
              .filter(function (key) {
                return Object.prototype.hasOwnProperty.call(state, key);
              })
              .map(function (key) {
                return [key, state[key]];
              })
          )
        : { ...state };
      if (callback) callback(result);
      return Promise.resolve(result);
    },
    set(values, callback) {
      Object.assign(state, values || {});
      if (callback) callback();
      return Promise.resolve();
    },
    remove(key, callback) {
      delete state[key];
      if (callback) callback();
      return Promise.resolve();
    }
  };
}

function createEnv(overrides) {
  return {
    location: {
      origin: (overrides && overrides.origin) || "https://example.com",
      pathname: (overrides && overrides.pathname) || "/apply/form",
      search: "?ignored=1",
      hash: "#ignored"
    },
    storageArea: (overrides && overrides.storageArea) || createStorageArea(
      overrides && Object.prototype.hasOwnProperty.call(overrides, "storageValue")
        ? { "ctdp.smartFillOverrides.v1": overrides.storageValue }
        : undefined
    ),
    document: {
      querySelectorAll() {
        return overrides && overrides.elements ? overrides.elements : [];
      }
    }
  };
}

test("smart fill infers phone, id card, name, bank card and credit code from common attributes", () => {
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "mobilePhone" })), "mobile");
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "emailAddress" })), "email");
  assert.equal(inferFieldKeyForSmartFill(createElement({ placeholder: "请输入固定电话" })), "landline");
  assert.equal(inferFieldKeyForSmartFill(createElement({ ariaLabel: "开户地址" })), "address");
  assert.equal(inferFieldKeyForSmartFill(createElement({ placeholder: "请输入身份证号" })), "idNumber");
  assert.equal(inferFieldKeyForSmartFill(createElement({ placeholder: "请输入公司名称" })), "companyName");
  assert.equal(inferFieldKeyForSmartFill(createElement({ ariaLabel: "企业名称联系人姓名" })), "fullName");
  assert.equal(inferFieldKeyForSmartFill(createElement({ id: "bankCardNo" })), "bankCard");
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "loginAccount" })), "account");
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "unifiedSocialCreditCode" })), "creditCode");
});

test("smart fill uses autocomplete hints before generic text matches", () => {
  assert.equal(inferFieldKeyForSmartFill(createElement({ autocomplete: "tel", name: "contact" })), "mobile");
  assert.equal(inferFieldKeyForSmartFill(createElement({ autocomplete: "name", id: "user-profile" })), "fullName");
});

test("smart fill infers pinyin aliases and initials for supported fields", () => {
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "xingming" })), "fullName");
  assert.equal(inferFieldKeyForSmartFill(createElement({ id: "xm" })), "fullName");
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "qymc" })), "companyName");
  assert.equal(inferFieldKeyForSmartFill(createElement({ id: "gsmc" })), "companyName");
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "sfzh" })), "idNumber");
  assert.equal(inferFieldKeyForSmartFill(createElement({ id: "zjhm" })), "idNumber");
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "yhkh" })), "bankCard");
  assert.equal(inferFieldKeyForSmartFill(createElement({ id: "zhanghao" })), "account");
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "username" })), "account");
  assert.equal(inferFieldKeyForSmartFill(createElement({ id: "sjh" })), "mobile");
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "gddh" })), "landline");
  assert.equal(inferFieldKeyForSmartFill(createElement({ id: "dizhi" })), "address");
  assert.equal(inferFieldKeyForSmartFill(createElement({ name: "tyshxydm" })), "creditCode");
});

test("smart fill returns null for unsupported or ambiguous fields", () => {
  assert.equal(inferFieldKeyForSmartFill(createElement({ placeholder: "请输入备注" })), null);
  assert.equal(inferFieldKeyForSmartFill(createElement({ tagName: "TEXTAREA", name: "description" })), null);
});

test("smart fill button label only uses the matched field name", () => {
  assert.equal(formatSmartFillButtonLabel("companyName"), "公司名称");
  assert.equal(formatSmartFillButtonLabel("account"), "账号");
  assert.equal(formatSmartFillButtonLabel("mobile"), "手机号");
  assert.equal(formatSmartFillButtonLabel("email"), "邮箱");
  assert.equal(formatSmartFillButtonLabel("landline"), "固定电话");
  assert.equal(formatSmartFillButtonLabel("address"), "地址");
  assert.equal(formatSmartFillButtonLabel("idNumber"), "身份证号");
  assert.equal(formatSmartFillButtonLabel("unknown"), "智能填充");
});

test("smart fill exposes field icon mapping for all supported field types", () => {
  assert.deepEqual(
    Object.fromEntries(
      getFieldDefinitions().map(function (definition) {
        return [definition.key, getFieldIconName(definition.key)];
      })
    ),
    Object.fromEntries(
      getFieldDefinitions().map(function (definition) {
        return [definition.key, definition.iconName];
      })
    )
  );
});

test("smart fill menu does not expose alternate field actions", () => {
  assert.deepEqual(getSmartFillMenuFieldKeys("mobile"), []);
  assert.deepEqual(getSmartFillMenuFieldKeys("idNumber"), []);
  assert.deepEqual(getSmartFillMenuFieldKeys("companyName"), []);
});

test("smart fill exposes supported field keys for menu creation", () => {
  assert.deepEqual(getSupportedFieldKeys(), getFieldKeys());
  assert.deepEqual(getSupportedFieldKeys(["companyName", "mobile", "unknown"]), ["companyName", "mobile"]);
  assert.deepEqual(getSmartFillMenuFieldKeys("companyName", ["companyName", "mobile", "address"]), []);
});

test("manual smart fill override takes precedence over heuristic inference", async () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });

  await setManualFieldOverride(element, "companyName", env);

  assert.equal(inferFieldKeyForSmartFill(element, env), "companyName");
});

test("manual smart fill override is scoped to the current field fingerprint", async () => {
  const left = createElement({ name: "contact", placeholder: "请输入内容" });
  const right = createElement({ name: "contact", placeholder: "请输入内容" });
  const env = createEnv({ elements: [left, right] });

  await setManualFieldOverride(left, "fullName", env);

  assert.equal(inferFieldKeyForSmartFill(left, env), "fullName");
  assert.equal(inferFieldKeyForSmartFill(right, env), null);
});

test("manual smart fill override is shared within the same domain and first-level path", async () => {
  const element = createElement({ name: "contact", id: "shared-input" });
  const sharedStorage = createStorageArea();
  const envA = createEnv({ elements: [element], pathname: "/apply/form", storageArea: sharedStorage });
  const envB = createEnv({ elements: [element], pathname: "/apply/step-two", storageArea: sharedStorage });

  await setManualFieldOverride(element, "fullName", envA);

  assert.equal(inferFieldKeyForSmartFill(element, envB), "fullName");
});

test("manual smart fill override stays isolated across different first-level paths", async () => {
  const element = createElement({ name: "contact", id: "scoped-input" });
  const sharedStorage = createStorageArea();
  const envA = createEnv({ elements: [element], pathname: "/apply/form", storageArea: sharedStorage });
  const envB = createEnv({ elements: [element], pathname: "/review/form", storageArea: sharedStorage });

  await setManualFieldOverride(element, "fullName", envA);

  assert.equal(inferFieldKeyForSmartFill(element, envB), null);
});

test("manual overrides can be loaded from chrome storage before inference", async () => {
  const element = createElement({ name: "contact", id: "loaded-input" });
  const env = createEnv({
    elements: [element],
    storageValue: {
      "https://example.com/apply::top::tag=input&type=text&id=loadedinput&name=contact&autocomplete=&placeholder=&aria=&labels=":
        "fullName"
    }
  });

  await loadManualFieldOverrides(env);

  assert.equal(inferFieldKeyForSmartFill(element, env), "fullName");
});

test("clearing manual smart fill override falls back to heuristic inference", async () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });

  await setManualFieldOverride(element, "companyName", env);
  await clearManualFieldOverride(element, env);

  assert.equal(inferFieldKeyForSmartFill(element, env), "mobile");
});

test("invalid override storage is ignored safely", async () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element], storageValue: "broken" });

  await loadManualFieldOverrides(env);
  assert.equal(inferFieldKeyForSmartFill(element, env), "mobile");
});

test("raw override export keeps the full stored override map with metadata", async () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });
  await setManualFieldOverride(element, "companyName", env);

  const exported = await exportManualFieldOverrides(env);

  assert.equal(exported.format, "ctdp-smart-fill-overrides");
  assert.equal(exported.type, "raw");
  assert.equal(exported.version, 1);
  assert.equal(exported.storageKey, "ctdp.smartFillOverrides.v1");
  assert.equal(Object.keys(exported.overrides).length, 1);
  assert.equal(Object.values(exported.overrides)[0], "companyName");
  assert.match(Object.keys(exported.overrides)[0], /^https:\/\/example\.com\/apply::top::tag=input/);
});

test("sanitized override export strips page address and only keeps field fingerprint data", async () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });
  await setManualFieldOverride(element, "companyName", env);

  const exported = await exportSanitizedManualFieldOverrides(env);

  assert.equal(exported.format, "ctdp-smart-fill-overrides");
  assert.equal(exported.type, "sanitized");
  assert.equal(exported.version, 1);
  assert.deepEqual(exported.entries, [
    {
      fieldFingerprint: "tag=input&type=text&id=contactinput&name=mobilephone&autocomplete=&placeholder=&aria=&labels=",
      fieldKey: "companyName"
    }
  ]);
  assert.doesNotMatch(JSON.stringify(exported), /https:\/\/example\.com/);
  assert.doesNotMatch(JSON.stringify(exported), /apply\/form/);
});

test("raw override import merges data and overwrites the same key", async () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });
  await setManualFieldOverride(element, "fullName", env);
  const existing = await exportManualFieldOverrides(env);
  const targetKey = Object.keys(existing.overrides)[0];

  const result = await importManualFieldOverrides(
    {
      format: "ctdp-smart-fill-overrides",
      type: "raw",
      version: 1,
      overrides: {
        [targetKey]: "companyName"
      }
    },
    env
  );

  assert.deepEqual(result, { importedCount: 1, type: "raw" });
  assert.equal(inferFieldKeyForSmartFill(element, env), "companyName");
});

test("sanitized override import applies to the current site domain without restoring the source path", async () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element], pathname: "/another/page" });

  const result = await importManualFieldOverrides(
    {
      format: "ctdp-smart-fill-overrides",
      type: "sanitized",
      version: 1,
      entries: [
        {
          fieldFingerprint: "tag=input&type=text&id=contactinput&name=mobilephone&autocomplete=&placeholder=&aria=&labels=",
          fieldKey: "companyName"
        }
      ]
    },
    env
  );

  assert.deepEqual(result, { importedCount: 1, type: "sanitized" });
  assert.equal(inferFieldKeyForSmartFill(element, env), "companyName");
  assert.deepEqual((await exportManualFieldOverrides(env)).overrides, {
    "https://example.com::*::tag=input&type=text&id=contactinput&name=mobilephone&autocomplete=&placeholder=&aria=&labels=":
      "companyName"
  });
});

test("invalid override import payloads fail fast", async () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });

  await assert.rejects(
    () =>
      importManualFieldOverrides(
        {
          format: "ctdp-smart-fill-overrides",
          type: "raw",
          version: 1,
          overrides: {
            "https://example.com/apply::top::tag=input": "unsupportedField"
          }
        },
        env
      ),
    /Invalid override field key/
  );
});
