import { FIELD_KEYS, normalizeProfile, type ProfileFieldKey, type ProfileFieldMap } from "../page-model";

export type GeneratorsApi = {
  generateFieldValue?: (fieldKey: string) => string;
  validateBankCardNumber?: (value: string) => boolean;
  validateChineseIdNumber?: (value: string) => boolean;
  validateUnifiedSocialCreditCode?: (value: string) => boolean;
};

declare global {
  interface Window {
    ChromeTestDataGenerators?: GeneratorsApi;
  }
}

export function getGeneratorsApi(): GeneratorsApi {
  return (typeof window !== "undefined" && window.ChromeTestDataGenerators) || {};
}

export function generateFieldValue(fieldKey: ProfileFieldKey, api: GeneratorsApi = getGeneratorsApi()): string {
  return typeof api.generateFieldValue === "function" ? String(api.generateFieldValue(fieldKey) || "") : "";
}

export function generateRandomProfile(api: GeneratorsApi = getGeneratorsApi()): ProfileFieldMap {
  return normalizeProfile(Object.fromEntries(FIELD_KEYS.map(function (fieldKey) {
    return [fieldKey, generateFieldValue(fieldKey, api)];
  })));
}
