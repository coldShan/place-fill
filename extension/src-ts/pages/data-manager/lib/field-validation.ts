import type { ProfileFieldKey } from "../page-model";
import type { GeneratorsApi } from "./generators";

type Rule = (value: string, api: GeneratorsApi) => string;

function checkWith(validator: keyof GeneratorsApi, message: string): Rule {
  return function (value, api) {
    const validate = api[validator] as ((input: string) => boolean) | undefined;
    if (typeof validate !== "function") return "";
    return validate(value) ? "" : message;
  };
}

function checkPattern(pattern: RegExp, message: string): Rule {
  return function (value) {
    return pattern.test(value) ? "" : message;
  };
}

const RULES: Partial<Record<ProfileFieldKey, Rule>> = {
  bankCard: checkWith("validateBankCardNumber", "银行卡号应为 16–19 位数字且通过 Luhn 校验"),
  creditCode: checkWith("validateUnifiedSocialCreditCode", "统一社会信用代码格式或校验位不正确"),
  email: checkPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "邮箱格式不正确"),
  idNumber: checkWith("validateChineseIdNumber", "身份证号格式、出生日期或校验位不正确"),
  landline: checkPattern(/^0\d{2,3}-?\d{7,8}$/, "固定电话应形如 021-68881234"),
  mobile: checkPattern(/^1[3-9]\d{9}$/, "手机号应为以 1 开头的 11 位数字"),
  postalCode: checkPattern(/^\d{6}$/, "邮政编码应为 6 位数字")
};

export function getFieldWarning(fieldKey: ProfileFieldKey, value: string, api: GeneratorsApi): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const rule = RULES[fieldKey];
  return rule ? rule(trimmed, api) : "";
}
