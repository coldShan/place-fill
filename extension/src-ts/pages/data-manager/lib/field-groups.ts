import type { ProfileFieldKey } from "../page-model";

export const FIELD_GROUPS: { title: string; fields: ProfileFieldKey[] }[] = [
  { title: "个人", fields: ["fullName", "idNumber", "mobile", "email"] },
  { title: "账户", fields: ["bankCard", "account"] },
  { title: "企业", fields: ["companyName", "creditCode"] },
  { title: "联系地址", fields: ["landline", "address", "postalCode"] }
];

export const DISPLAY_FIELD_ORDER: ProfileFieldKey[] = FIELD_GROUPS.flatMap(function (group) {
  return group.fields;
});
