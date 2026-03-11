import test from "node:test";
import assert from "node:assert/strict";
import generatorsPkg from "../src/generators.js";
import fieldMetaPkg from "../src/field-meta.js";

const {
  CREDIT_CODE_ALPHABET,
  GeneratedFieldLabels,
  formatProfileForCopy,
  generateAddress,
  generateFieldValue,
  generateBankCardNumber,
  generateCompanyName,
  generateChineseIdNumber,
  generateChineseName,
  generateEmailAddress,
  generateLandlineNumber,
  generateMobileNumber,
  generateProfile,
  generateUnifiedSocialCreditCode,
  validateBankCardNumber,
  validateChineseIdNumber,
  validateUnifiedSocialCreditCode
} = generatorsPkg;
const { getFieldDefinitions, getFieldKeys } = fieldMetaPkg;

function createRng(values) {
  let index = 0;
  return function rng() {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

test("generateUnifiedSocialCreditCode returns 18 chars with valid checksum", () => {
  const code = generateUnifiedSocialCreditCode(createRng([0.02, 0.14, 0.31, 0.48, 0.52, 0.67, 0.73, 0.89]));

  assert.equal(code.length, 18);
  assert.match(code, /^[0-9A-Z]{18}$/);
  for (const char of code) {
    assert.equal(CREDIT_CODE_ALPHABET.includes(char), true);
  }
  assert.equal(validateUnifiedSocialCreditCode(code), true);
});

test("generateChineseName returns a compact Chinese full name", () => {
  const name = generateChineseName(createRng([0.01, 0.24, 0.77, 0.41]));

  assert.match(name, /^[\u4e00-\u9fa5]{2,3}$/);
});

test("generateCompanyName returns a compact Chinese company name", () => {
  const companyName = generateCompanyName(createRng([0.05, 0.21, 0.34, 0.48, 0.62]));

  assert.match(companyName, /^[\u4e00-\u9fa5]{4,}(有限责任公司|有限公司|集团有限公司|科技有限公司)$/);
});

test("generateChineseIdNumber returns legal birthday and checksum", () => {
  const idNumber = generateChineseIdNumber(createRng([0.05, 0.17, 0.39, 0.44, 0.62, 0.86, 0.21]));

  assert.equal(idNumber.length, 18);
  assert.match(idNumber, /^\d{17}[\dX]$/);
  assert.equal(validateChineseIdNumber(idNumber), true);

  const birth = idNumber.slice(6, 14);
  const year = Number(birth.slice(0, 4));
  const month = Number(birth.slice(4, 6));
  const day = Number(birth.slice(6, 8));

  assert.equal(year >= 1980 && year <= 2004, true);
  assert.equal(month >= 1 && month <= 12, true);
  assert.equal(day >= 1 && day <= 31, true);
});

test("generateBankCardNumber returns number with luhn checksum", () => {
  const bankCard = generateBankCardNumber(createRng([0.11, 0.28, 0.35, 0.57, 0.63, 0.79, 0.91]));

  assert.match(bankCard, /^\d{16,19}$/);
  assert.equal(validateBankCardNumber(bankCard), true);
});

test("generateMobileNumber returns a mainland mobile number", () => {
  const mobile = generateMobileNumber(createRng([0.08, 0.33, 0.49, 0.61, 0.75, 0.94]));

  assert.match(mobile, /^1[3-9]\d{9}$/);
});

test("generateEmailAddress returns a common email shape", () => {
  const email = generateEmailAddress(createRng([0.07, 0.18, 0.29, 0.41, 0.55, 0.68, 0.82]));

  assert.match(email, /^[a-z][a-z0-9]{4,10}@(qq\.com|163\.com|gmail\.com|outlook\.com)$/);
});

test("generateLandlineNumber returns a mainland landline number", () => {
  const landline = generateLandlineNumber(createRng([0.09, 0.22, 0.37, 0.44, 0.58, 0.63, 0.79, 0.91]));

  assert.match(landline, /^0\d{2,3}-\d{7,8}$/);
});

test("generateAddress returns a constrained Chinese address format", () => {
  const address = generateAddress(createRng([0.03, 0.16, 0.28, 0.35, 0.47, 0.59, 0.66, 0.74, 0.83, 0.95]));

  assert.match(address, /^[\u4e00-\u9fa5]{2,6}路\d{1,3}号[\u4e00-\u9fa5]{2,6}小区\d{1,2}栋\d{1,2}单元\d{2,4}室$/);
  assert.equal(address.length >= 8 && address.length <= 30, true);
});

test("generateProfile returns all fixed fields and formatProfileForCopy keeps stable order", () => {
  const profile = generateProfile(createRng([0.04, 0.12, 0.27, 0.36, 0.48, 0.58, 0.67, 0.81, 0.93]));

  assert.deepEqual(Object.keys(profile), getFieldKeys());
  assert.equal(validateUnifiedSocialCreditCode(profile.creditCode), true);
  assert.match(profile.companyName, /^[\u4e00-\u9fa5]{4,}(有限责任公司|有限公司|集团有限公司|科技有限公司)$/);
  assert.equal(validateChineseIdNumber(profile.idNumber), true);
  assert.equal(validateBankCardNumber(profile.bankCard), true);
  assert.match(profile.fullName, /^[\u4e00-\u9fa5]{2,3}$/);
  assert.match(profile.mobile, /^1[3-9]\d{9}$/);
  assert.match(profile.email, /^[a-z][a-z0-9]{4,10}@(qq\.com|163\.com|gmail\.com|outlook\.com)$/);
  assert.match(profile.landline, /^0\d{2,3}-\d{7,8}$/);
  assert.match(profile.address, /^[\u4e00-\u9fa5]{2,6}路\d{1,3}号[\u4e00-\u9fa5]{2,6}小区\d{1,2}栋\d{1,2}单元\d{2,4}室$/);
  assert.equal(profile.address.length >= 8 && profile.address.length <= 30, true);

  const formatted = formatProfileForCopy(profile);
  const lines = formatted.split("\n");

  assert.deepEqual(
    lines,
    getFieldDefinitions().map(function (definition) {
      return `${GeneratedFieldLabels[definition.key]}: ${profile[definition.key]}`;
    })
  );
});

test("generateFieldValue regenerates only the requested field shape", () => {
  const mobile = generateFieldValue("mobile", createRng([0.08, 0.33, 0.49, 0.61, 0.75, 0.94]));
  const email = generateFieldValue("email", createRng([0.07, 0.18, 0.29, 0.41, 0.55, 0.68, 0.82]));
  const landline = generateFieldValue("landline", createRng([0.09, 0.22, 0.37, 0.44, 0.58, 0.63, 0.79, 0.91]));
  const address = generateFieldValue("address", createRng([0.03, 0.16, 0.28, 0.35, 0.47, 0.59, 0.66, 0.74, 0.83, 0.95]));
  const idNumber = generateFieldValue("idNumber", createRng([0.05, 0.17, 0.39, 0.44, 0.62, 0.86, 0.21]));
  const creditCode = generateFieldValue("creditCode", createRng([0.02, 0.14, 0.31, 0.48, 0.52, 0.67, 0.73, 0.89]));
  const companyName = generateFieldValue("companyName", createRng([0.05, 0.21, 0.34, 0.48, 0.62]));

  assert.match(mobile, /^1[3-9]\d{9}$/);
  assert.match(email, /^[a-z][a-z0-9]{4,10}@(qq\.com|163\.com|gmail\.com|outlook\.com)$/);
  assert.match(landline, /^0\d{2,3}-\d{7,8}$/);
  assert.match(address, /^[\u4e00-\u9fa5]{2,6}路\d{1,3}号[\u4e00-\u9fa5]{2,6}小区\d{1,2}栋\d{1,2}单元\d{2,4}室$/);
  assert.equal(validateChineseIdNumber(idNumber), true);
  assert.equal(validateUnifiedSocialCreditCode(creditCode), true);
  assert.match(companyName, /^[\u4e00-\u9fa5]{4,}(有限责任公司|有限公司|集团有限公司|科技有限公司)$/);
  assert.equal(generateFieldValue("unknown"), "");
});
