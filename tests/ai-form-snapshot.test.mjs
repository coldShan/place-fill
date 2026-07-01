import test from "node:test";
import assert from "node:assert/strict";
import snapshotPkg from "../extension/src/ai-form-snapshot.js";

const { MAX_AI_FIELD_COUNT, buildAiFormSnapshot, redactSensitiveText, truncateText } = snapshotPkg;

function createInput(props) {
  return {
    tagName: "INPUT",
    type: "text",
    disabled: false,
    readOnly: false,
    isContentEditable: false,
    textContent: "",
    value: "13800138000",
    labels: [],
    parentElement: null,
    getAttribute(name) {
      if (name === "type") return this.type;
      if (name === "name") return this.name || "";
      if (name === "id") return this.id || "";
      if (name === "placeholder") return this.placeholder || "";
      if (name === "aria-label") return this.ariaLabel || "";
      if (name === "autocomplete") return this.autocomplete || "";
      return "";
    },
    ...props
  };
}

function createDocument(elements) {
  return {
    querySelectorAll() {
      return elements;
    }
  };
}

test("ai form snapshot redacts sensitive text and never includes current values", () => {
  const nearby = { textContent: "联系人 手机 13800138000 邮箱 user@example.com" };
  const input = createInput({
    name: "contactPhone",
    id: "phone",
    placeholder: "请输入 13800138000",
    labels: [{ textContent: "联系电话" }],
    parentElement: nearby
  });
  const snapshot = buildAiFormSnapshot({
    document: createDocument([input]),
    smartFillApi: {
      getFieldFingerprint() {
        return "fingerprint-1";
      },
      inferLocalFieldKeyForSmartFill() {
        return "mobile";
      }
    },
    allowedFieldKeys: ["mobile", "email"]
  });

  assert.equal(snapshot.allowedFieldKeys.includes("mobile"), true);
  assert.equal(snapshot.fields.length, 1);
  assert.equal(snapshot.fields[0].fingerprint, "fingerprint-1");
  assert.equal(snapshot.fields[0].localFieldKey, "mobile");
  assert.equal(JSON.stringify(snapshot).includes("13800138000"), false);
  assert.equal(JSON.stringify(snapshot).includes("user@example.com"), false);
  assert.equal(JSON.stringify(snapshot).includes("value"), false);
});

test("ai form snapshot filters unsupported controls and caps field count", () => {
  const elements = [
    createInput({ type: "hidden", name: "secret" }),
    createInput({ type: "password", name: "password" }),
    createInput({ type: "checkbox", name: "agree" })
  ].concat(
    Array.from({ length: MAX_AI_FIELD_COUNT + 5 }, function (_item, index) {
      return createInput({ name: "field" + index, placeholder: "字段" + index });
    })
  );

  const snapshot = buildAiFormSnapshot({
    document: createDocument(elements),
    smartFillApi: {
      getFieldFingerprint(element) {
        return element.name;
      },
      inferLocalFieldKeyForSmartFill() {
        return null;
      }
    },
    allowedFieldKeys: ["mobile"]
  });

  assert.equal(snapshot.fields.length, MAX_AI_FIELD_COUNT);
  assert.equal(snapshot.fields.some(function (field) { return field.fingerprint === "secret"; }), false);
  assert.equal(snapshot.fields[0].fingerprint, "field0");
});

test("snapshot text helpers redact likely private values and truncate long labels", () => {
  assert.equal(redactSensitiveText("电话 13800138000 身份证 11010119900307451X 银行卡 6222020202020202020 邮箱 a@b.com"), "电话 [redacted] 身份证 [redacted] 银行卡 [redacted] 邮箱 [redacted]");
  assert.equal(truncateText("1234567890", 4), "1234");
});
