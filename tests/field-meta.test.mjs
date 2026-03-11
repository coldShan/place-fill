import test from "node:test";
import assert from "node:assert/strict";
import fieldMetaPkg from "../extension/src/field-meta.js";

const {
  getFieldDefinitions,
  getFieldIconName,
  getFieldKeys,
  getFieldLabel,
  isSupportedFieldKey
} = fieldMetaPkg;

test("field metadata exposes stable ordered definitions for all supported fields", () => {
  const definitions = getFieldDefinitions();

  assert.deepEqual(
    definitions.map(function (item) {
      return item.key;
    }),
    ["creditCode", "companyName", "fullName", "idNumber", "bankCard", "mobile", "email", "landline", "address"]
  );
  assert.deepEqual(definitions[0], {
    key: "creditCode",
    label: "统一社会信用代码",
    iconName: "landmark"
  });
  assert.deepEqual(definitions[definitions.length - 1], {
    key: "address",
    label: "地址",
    iconName: "map-pinned"
  });
});

test("field metadata returns cloned field definitions and derived helper lookups", () => {
  const definitions = getFieldDefinitions();
  definitions[0].label = "changed";

  assert.equal(getFieldDefinitions()[0].label, "统一社会信用代码");
  assert.deepEqual(getFieldKeys(), ["creditCode", "companyName", "fullName", "idNumber", "bankCard", "mobile", "email", "landline", "address"]);
  assert.equal(getFieldLabel("email"), "邮箱");
  assert.equal(getFieldIconName("landline"), "phone");
  assert.equal(getFieldLabel("unknown"), "");
  assert.equal(getFieldIconName("unknown"), "");
  assert.equal(isSupportedFieldKey("address"), true);
  assert.equal(isSupportedFieldKey("unknown"), false);
});
