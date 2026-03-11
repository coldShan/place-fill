(function (rootScope) {
  "use strict";

  function getFieldMetaApi() {
    if (rootScope.ChromeTestDataFieldMeta) return rootScope.ChromeTestDataFieldMeta;
    if (typeof require === "function") {
      try {
        return require("./field-meta.js");
      } catch (_) {}
    }
    return {
      getFieldDefinitions: function () {
        return [];
      },
      getFieldKeys: function () {
        return [];
      },
      getFieldLabel: function () {
        return "";
      }
    };
  }

  const CREDIT_CODE_ALPHABET = "0123456789ABCDEFGHJKLMNPQRTUWXY";
  const CREDIT_CODE_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
  const ID_CARD_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const ID_CARD_CHECK_CODES = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
  const CREDIT_CODE_ENTITY_TYPES = "159Y";
  const CREDIT_CODE_REGISTRATION_TYPES = "1239";
  const REGION_CODES = ["110101", "120101", "310101", "320106", "330106", "370102", "420102", "440103", "500103", "510107"];
  const BANK_CARD_PREFIXES = ["622202", "622848", "621226", "621700", "955880", "622262"];
  const BANK_CARD_LENGTHS = [16, 19];
  const MOBILE_PREFIXES = ["130", "131", "132", "133", "135", "136", "137", "138", "139", "150", "151", "152", "155", "156", "157", "158", "159", "166", "167", "170", "171", "172", "173", "175", "176", "177", "178", "180", "181", "182", "183", "185", "186", "187", "188", "189", "191", "193", "195", "196", "198", "199"];
  const EMAIL_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
  const EMAIL_DOMAINS = ["qq.com", "163.com", "gmail.com", "outlook.com"];
  const LANDLINE_AREA_CODES = ["010", "020", "021", "022", "023", "024", "025", "027", "028", "029", "0571", "0755"];
  const ADDRESS_ROADS = ["安宁", "朝阳", "长乐", "春和", "德馨", "锦程", "瑞景", "松涛", "文昌", "云栖"];
  const ADDRESS_COMMUNITIES = ["澜庭", "锦苑", "景园", "兰庭", "清苑", "瑞府", "书苑", "星城", "雅苑", "悦府"];
  const COMPANY_REGION_PREFIXES = ["华东", "华南", "华北", "华中", "西南", "中科", "云栖", "青禾", "星海", "远望"];
  const COMPANY_BRAND_CHARS = ["安", "诚", "达", "峰", "光", "航", "华", "嘉", "科", "联", "铭", "诺", "启", "盛", "泰", "信", "远", "云", "智", "众"];
  const COMPANY_INDUSTRIES = ["科技", "信息", "数据", "网络", "电子", "软件", "商贸", "供应链", "生物", "咨询"];
  const COMPANY_SUFFIXES = ["有限公司", "有限责任公司", "集团有限公司", "科技有限公司"];
  const FAMILY_NAMES = ["赵", "钱", "孙", "李", "周", "吴", "郑", "王", "冯", "陈", "褚", "卫", "蒋", "沈", "韩", "杨", "朱", "秦", "许", "何", "吕", "张", "孔", "曹", "严", "华", "金", "魏", "陶", "姜"];
  const GIVEN_NAME_CHARS = ["安", "北", "晨", "岱", "恩", "帆", "歌", "禾", "嘉", "岚", "朗", "铭", "宁", "沛", "清", "然", "舒", "童", "唯", "熙", "言", "予", "舟", "知", "子", "远", "修", "祺", "衡", "悦"];
  const fieldMetaApi = getFieldMetaApi();
  const GeneratedFieldLabels = Object.freeze(
    Object.fromEntries(
      fieldMetaApi.getFieldDefinitions().map(function (definition) {
        return [definition.key, definition.label];
      })
    )
  );

  function pick(list, rng) {
    return list[randomInt(list.length, rng)];
  }

  function randomInt(max, rng) {
    const source = typeof rng === "function" ? rng : Math.random;
    const raw = Number(source());
    if (!Number.isFinite(raw)) return 0;
    const value = raw < 0 ? 0 : raw >= 1 ? 0.999999999999 : raw;
    return Math.floor(value * max);
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function daysInMonth(year, month) {
    if (month === 2) return isLeapYear(year) ? 29 : 28;
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
  }

  function getCreditCodeCheckChar(base17) {
    let sum = 0;
    for (let i = 0; i < base17.length; i += 1) {
      const char = base17[i];
      const index = CREDIT_CODE_ALPHABET.indexOf(char);
      if (index < 0) return "";
      sum += index * CREDIT_CODE_WEIGHTS[i];
    }
    const codePoint = (31 - (sum % 31)) % 31;
    return CREDIT_CODE_ALPHABET[codePoint];
  }

  function validateUnifiedSocialCreditCode(code) {
    if (!/^[0-9A-Z]{18}$/.test(code || "")) return false;
    const base17 = code.slice(0, 17);
    return getCreditCodeCheckChar(base17) === code.slice(17);
  }

  function generateUnifiedSocialCreditCode(rng) {
    const chars = [
      pick(CREDIT_CODE_ENTITY_TYPES, rng),
      pick(CREDIT_CODE_REGISTRATION_TYPES, rng)
    ];
    for (let i = 2; i < 17; i += 1) {
      chars.push(CREDIT_CODE_ALPHABET[randomInt(CREDIT_CODE_ALPHABET.length, rng)]);
    }
    const base17 = chars.join("");
    return base17 + getCreditCodeCheckChar(base17);
  }

  function generateChineseName(rng) {
    const familyName = pick(FAMILY_NAMES, rng);
    const givenA = pick(GIVEN_NAME_CHARS, rng);
    const useTwoChars = randomInt(2, rng) === 1;
    if (!useTwoChars) return familyName + givenA;
    return familyName + givenA + pick(GIVEN_NAME_CHARS, rng);
  }

  function generateCompanyName(rng) {
    return [
      pick(COMPANY_REGION_PREFIXES, rng),
      pick(COMPANY_BRAND_CHARS, rng),
      pick(COMPANY_BRAND_CHARS, rng),
      pick(COMPANY_INDUSTRIES, rng),
      pick(COMPANY_SUFFIXES, rng)
    ].join("");
  }

  function getIdCheckChar(base17) {
    let sum = 0;
    for (let i = 0; i < base17.length; i += 1) sum += Number(base17[i]) * ID_CARD_WEIGHTS[i];
    return ID_CARD_CHECK_CODES[sum % 11];
  }

  function validateChineseIdNumber(idNumber) {
    if (!/^\d{17}[\dX]$/.test(idNumber || "")) return false;
    const birth = idNumber.slice(6, 14);
    const year = Number(birth.slice(0, 4));
    const month = Number(birth.slice(4, 6));
    const day = Number(birth.slice(6, 8));
    if (!year || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return false;
    return getIdCheckChar(idNumber.slice(0, 17)) === idNumber.slice(17);
  }

  function generateChineseIdNumber(rng) {
    const region = pick(REGION_CODES, rng);
    const year = 1980 + randomInt(25, rng);
    const month = 1 + randomInt(12, rng);
    const day = 1 + randomInt(daysInMonth(year, month), rng);
    const serial = String(100 + randomInt(900, rng));
    const base17 = region + year + pad2(month) + pad2(day) + serial;
    return base17 + getIdCheckChar(base17);
  }

  function getLuhnCheckDigit(base) {
    let sum = 0;
    let shouldDouble = true;
    for (let i = base.length - 1; i >= 0; i -= 1) {
      let digit = Number(base[i]);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return String((10 - (sum % 10)) % 10);
  }

  function validateBankCardNumber(cardNumber) {
    const normalized = String(cardNumber || "");
    if (!/^\d{16,19}$/.test(normalized)) return false;
    return getLuhnCheckDigit(normalized.slice(0, -1)) === normalized.slice(-1);
  }

  function generateBankCardNumber(rng) {
    const prefix = pick(BANK_CARD_PREFIXES, rng);
    const totalLength = pick(BANK_CARD_LENGTHS, rng);
    let base = prefix;
    while (base.length < totalLength - 1) base += String(randomInt(10, rng));
    return base + getLuhnCheckDigit(base);
  }

  function generateMobileNumber(rng) {
    let mobile = pick(MOBILE_PREFIXES, rng);
    while (mobile.length < 11) mobile += String(randomInt(10, rng));
    return mobile;
  }

  function generateEmailAddress(rng) {
    const length = 5 + randomInt(7, rng);
    let local = EMAIL_CHARS[randomInt(26, rng)];
    while (local.length < length) local += EMAIL_CHARS[randomInt(EMAIL_CHARS.length, rng)];
    return local + "@" + pick(EMAIL_DOMAINS, rng);
  }

  function generateLandlineNumber(rng) {
    const areaCode = pick(LANDLINE_AREA_CODES, rng);
    const localLength = 7 + randomInt(2, rng);
    let localNumber = "";
    while (localNumber.length < localLength) localNumber += String(randomInt(10, rng));
    return areaCode + "-" + localNumber;
  }

  function generateAddress(rng) {
    const road = pick(ADDRESS_ROADS, rng) + "路";
    const community = pick(ADDRESS_COMMUNITIES, rng) + "小区";
    const roadNo = String(1 + randomInt(300, rng));
    const buildingNo = String(1 + randomInt(20, rng));
    const unitNo = String(1 + randomInt(8, rng));
    const roomNo = String(101 + randomInt(8908, rng));
    return road + roadNo + "号" + community + buildingNo + "栋" + unitNo + "单元" + roomNo + "室";
  }

  function generateFieldValue(fieldKey, rng) {
    if (fieldKey === "creditCode") return generateUnifiedSocialCreditCode(rng);
    if (fieldKey === "companyName") return generateCompanyName(rng);
    if (fieldKey === "fullName") return generateChineseName(rng);
    if (fieldKey === "idNumber") return generateChineseIdNumber(rng);
    if (fieldKey === "bankCard") return generateBankCardNumber(rng);
    if (fieldKey === "mobile") return generateMobileNumber(rng);
    if (fieldKey === "email") return generateEmailAddress(rng);
    if (fieldKey === "landline") return generateLandlineNumber(rng);
    if (fieldKey === "address") return generateAddress(rng);
    return "";
  }

  function generateProfile(rng) {
    return Object.fromEntries(
      fieldMetaApi.getFieldKeys().map(function (fieldKey) {
        return [fieldKey, generateFieldValue(fieldKey, rng)];
      })
    );
  }

  function formatProfileForCopy(profile, fieldKeys) {
    const orderedFieldKeys = Array.isArray(fieldKeys) ? fieldKeys.slice() : fieldMetaApi.getFieldKeys();
    return orderedFieldKeys
      .map(function (key) {
        return fieldMetaApi.getFieldLabel(key) + ": " + (profile && profile[key] ? profile[key] : "");
      })
      .join("\n");
  }

  const api = {
    CREDIT_CODE_ALPHABET,
    GeneratedFieldLabels,
    formatProfileForCopy,
    generateAddress,
    generateBankCardNumber,
    generateCompanyName,
    generateChineseIdNumber,
    generateChineseName,
    generateEmailAddress,
    generateFieldValue,
    generateLandlineNumber,
    generateMobileNumber,
    generateProfile,
    generateUnifiedSocialCreditCode,
    validateBankCardNumber,
    validateChineseIdNumber,
    validateUnifiedSocialCreditCode
  };

  rootScope.ChromeTestDataGenerators = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
