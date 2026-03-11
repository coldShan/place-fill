import test from "node:test";
import assert from "node:assert/strict";
import smartFillPkg from "../src/smart-fill.js";
import fieldMetaPkg from "../src/field-meta.js";

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

function createStorage(initialValue) {
  const state = new Map();
  if (initialValue !== undefined) state.set("ctdp.smartFillOverrides.v1", initialValue);
  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    },
    removeItem(key) {
      state.delete(key);
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
    localStorage: createStorage(overrides && overrides.storageValue),
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

test("smart fill menu lists only the other field types in stable order", () => {
  assert.deepEqual(
    getSmartFillMenuFieldKeys("mobile"),
    getFieldKeys().filter(function (fieldKey) {
      return fieldKey !== "mobile";
    })
  );
  assert.deepEqual(
    getSmartFillMenuFieldKeys("idNumber"),
    getFieldKeys().filter(function (fieldKey) {
      return fieldKey !== "idNumber";
    })
  );
  assert.deepEqual(
    getSmartFillMenuFieldKeys("companyName"),
    getFieldKeys().filter(function (fieldKey) {
      return fieldKey !== "companyName";
    })
  );
});

test("smart fill exposes supported field keys for menu creation", () => {
  assert.deepEqual(getSupportedFieldKeys(), getFieldKeys());
  assert.deepEqual(getSupportedFieldKeys(["companyName", "mobile", "unknown"]), ["companyName", "mobile"]);
  assert.deepEqual(getSmartFillMenuFieldKeys("companyName", ["companyName", "mobile", "address"]), ["mobile", "address"]);
});

test("manual smart fill override takes precedence over heuristic inference", () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });

  setManualFieldOverride(element, "companyName", env);

  assert.equal(inferFieldKeyForSmartFill(element, env), "companyName");
});

test("manual smart fill override is scoped to the current field fingerprint", () => {
  const left = createElement({ name: "contact", placeholder: "请输入内容" });
  const right = createElement({ name: "contact", placeholder: "请输入内容" });
  const env = createEnv({ elements: [left, right] });

  setManualFieldOverride(left, "fullName", env);

  assert.equal(inferFieldKeyForSmartFill(left, env), "fullName");
  assert.equal(inferFieldKeyForSmartFill(right, env), null);
});

test("clearing manual smart fill override falls back to heuristic inference", () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });

  setManualFieldOverride(element, "companyName", env);
  clearManualFieldOverride(element, env);

  assert.equal(inferFieldKeyForSmartFill(element, env), "mobile");
});

test("invalid override storage is ignored safely", () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element], storageValue: "{broken-json" });

  assert.equal(inferFieldKeyForSmartFill(element, env), "mobile");
});

test("raw override export keeps the full stored override map with metadata", () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });
  setManualFieldOverride(element, "companyName", env);

  const exported = exportManualFieldOverrides(env);

  assert.equal(exported.format, "ctdp-smart-fill-overrides");
  assert.equal(exported.type, "raw");
  assert.equal(exported.version, 1);
  assert.equal(exported.storageKey, "ctdp.smartFillOverrides.v1");
  assert.equal(Object.keys(exported.overrides).length, 1);
  assert.equal(Object.values(exported.overrides)[0], "companyName");
  assert.match(Object.keys(exported.overrides)[0], /^https:\/\/example\.com\/apply\/form::top::tag=input/);
});

test("sanitized override export strips page address and only keeps field fingerprint data", () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });
  setManualFieldOverride(element, "companyName", env);

  const exported = exportSanitizedManualFieldOverrides(env);

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

test("raw override import merges data and overwrites the same key", () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });
  setManualFieldOverride(element, "fullName", env);
  const existing = exportManualFieldOverrides(env);
  const targetKey = Object.keys(existing.overrides)[0];

  const result = importManualFieldOverrides(
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

test("sanitized override import applies to the current site domain without restoring the source path", () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element], pathname: "/another/page" });

  const result = importManualFieldOverrides(
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
  assert.deepEqual(exportManualFieldOverrides(env).overrides, {
    "https://example.com::*::tag=input&type=text&id=contactinput&name=mobilephone&autocomplete=&placeholder=&aria=&labels=":
      "companyName"
  });
});

test("invalid override import payloads fail fast", () => {
  const element = createElement({ name: "mobilePhone", id: "contact-input" });
  const env = createEnv({ elements: [element] });

  assert.throws(
    () =>
      importManualFieldOverrides(
        {
          format: "ctdp-smart-fill-overrides",
          type: "raw",
          version: 1,
          overrides: {
            "https://example.com/apply/form::top::tag=input": "unsupportedField"
          }
        },
        env
      ),
    /Invalid override field key/
  );
});
