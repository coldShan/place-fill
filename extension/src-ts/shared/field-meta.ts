export const FIELD_DEFINITIONS = [
  { key: "creditCode", label: "统一社会信用代码" },
  { key: "companyName", label: "公司名称" },
  { key: "fullName", label: "姓名" },
  { key: "idNumber", label: "身份证号" },
  { key: "bankCard", label: "银行卡号" },
  { key: "mobile", label: "手机号" },
  { key: "email", label: "邮箱" },
  { key: "landline", label: "固定电话" },
  { key: "address", label: "地址" }
] as const;

export type ProfileFieldKey = (typeof FIELD_DEFINITIONS)[number]["key"];
export type ProfileFieldMap = Record<ProfileFieldKey, string>;

export const FIELD_KEYS = FIELD_DEFINITIONS.map(function (definition) {
  return definition.key;
});

export function getFieldLabel(fieldKey: string): string {
  const definition = FIELD_DEFINITIONS.find(function (item) {
    return item.key === fieldKey;
  });
  return definition ? definition.label : fieldKey;
}

export function createEmptyProfile(): ProfileFieldMap {
  return Object.fromEntries(
    FIELD_KEYS.map(function (fieldKey) {
      return [fieldKey, ""];
    })
  ) as ProfileFieldMap;
}

export function normalizeProfile(profile: Partial<Record<string, unknown>> | null | undefined): ProfileFieldMap {
  const nextProfile = createEmptyProfile();

  FIELD_KEYS.forEach(function (fieldKey) {
    const value = profile && typeof profile[fieldKey] === "string" ? profile[fieldKey] : "";
    nextProfile[fieldKey] = String(value || "");
  });

  return nextProfile;
}

export function formatProfileForCopy(profile: Partial<Record<string, unknown>> | null | undefined): string {
  const normalized = normalizeProfile(profile);
  return FIELD_DEFINITIONS.map(function (definition) {
    return definition.label + "：" + normalized[definition.key];
  }).join("\n");
}
