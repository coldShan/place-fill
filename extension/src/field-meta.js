(function (rootScope) {
  "use strict";

  const FIELD_DEFINITIONS = Object.freeze([
    { key: "creditCode", label: "统一社会信用代码", iconName: "landmark" },
    { key: "companyName", label: "公司名称", iconName: "building-2" },
    { key: "fullName", label: "姓名", iconName: "user-round" },
    { key: "idNumber", label: "身份证号", iconName: "id-card" },
    { key: "bankCard", label: "银行卡号", iconName: "credit-card" },
    { key: "mobile", label: "手机号", iconName: "smartphone" },
    { key: "email", label: "邮箱", iconName: "mail" },
    { key: "landline", label: "固定电话", iconName: "phone" },
    { key: "address", label: "地址", iconName: "map-pinned" }
  ]);

  const FIELD_LABELS = Object.freeze(
    Object.fromEntries(
      FIELD_DEFINITIONS.map(function (definition) {
        return [definition.key, definition.label];
      })
    )
  );
  const FIELD_ICONS = Object.freeze(
    Object.fromEntries(
      FIELD_DEFINITIONS.map(function (definition) {
        return [definition.key, definition.iconName];
      })
    )
  );

  function getFieldDefinitions() {
    return FIELD_DEFINITIONS.map(function (definition) {
      return {
        key: definition.key,
        label: definition.label,
        iconName: definition.iconName
      };
    });
  }

  function getFieldKeys() {
    return FIELD_DEFINITIONS.map(function (definition) {
      return definition.key;
    });
  }

  function getFieldLabel(fieldKey) {
    return FIELD_LABELS[fieldKey] || "";
  }

  function getFieldIconName(fieldKey) {
    return FIELD_ICONS[fieldKey] || "";
  }

  function isSupportedFieldKey(fieldKey) {
    return Object.prototype.hasOwnProperty.call(FIELD_LABELS, fieldKey);
  }

  const api = {
    getFieldDefinitions,
    getFieldIconName,
    getFieldKeys,
    getFieldLabel,
    isSupportedFieldKey
  };

  rootScope.ChromeTestDataFieldMeta = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
