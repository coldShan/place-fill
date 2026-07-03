(function (rootScope) {
  "use strict";

  const MAX_AI_FIELD_COUNT = 80;
  const MAX_TEXT_LENGTH = 40;
  const MAX_NEARBY_TEXT_LENGTH = 80;
  const REDACTED_TEXT = "[redacted]";
  const UNSUPPORTED_INPUT_TYPES = ["button", "checkbox", "color", "file", "hidden", "image", "password", "radio", "range", "reset", "submit"];

  function truncateText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  }

  function redactSensitiveText(value) {
    return String(value || "")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED_TEXT)
      .replace(/\b1[3-9]\d{9}\b/g, REDACTED_TEXT)
      .replace(/\b\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, REDACTED_TEXT)
      .replace(/\b\d{16,19}\b/g, REDACTED_TEXT);
  }

  function sanitizeText(value, maxLength) {
    return truncateText(redactSensitiveText(value), maxLength || MAX_TEXT_LENGTH);
  }

  function getAttribute(element, name) {
    if (!element || typeof element.getAttribute !== "function") return "";
    return element.getAttribute(name) || "";
  }

  function isEditableCandidate(element) {
    if (!element || element.disabled || element.readOnly) return false;
    const tagName = String(element.tagName || "").toUpperCase();
    if (tagName === "TEXTAREA") return true;
    if (tagName === "INPUT") {
      const type = String(element.type || getAttribute(element, "type") || "text").toLowerCase();
      return !UNSUPPORTED_INPUT_TYPES.includes(type);
    }
    return !!element.isContentEditable;
  }

  function getLabelTexts(element) {
    if (!Array.isArray(element && element.labels)) return [];
    return element.labels
      .map(function (label) {
        return label && (label.textContent || label.innerText || "");
      })
      .filter(Boolean);
  }

  function getNearbyText(element) {
    const parent = element && element.parentElement;
    if (!parent) return "";
    return parent.textContent || parent.innerText || "";
  }

  function createFieldSnapshot(element, smartFillApi) {
    const fingerprint = smartFillApi && typeof smartFillApi.getFieldFingerprint === "function"
      ? smartFillApi.getFieldFingerprint(element)
      : "";
    if (!fingerprint) return null;
    const tagName = String(element.tagName || "").toLowerCase();
    const type = tagName === "input" ? String(element.type || getAttribute(element, "type") || "text").toLowerCase() : "";
    const field = {
      ariaLabel: sanitizeText(getAttribute(element, "aria-label")),
      autocomplete: sanitizeText(getAttribute(element, "autocomplete")),
      fingerprint,
      id: sanitizeText(getAttribute(element, "id")),
      labels: getLabelTexts(element).map(function (label) {
        return sanitizeText(label);
      }).filter(Boolean),
      localFieldKey: smartFillApi && typeof smartFillApi.inferLocalFieldKeyForSmartFill === "function"
        ? smartFillApi.inferLocalFieldKeyForSmartFill(element) || ""
        : "",
      name: sanitizeText(getAttribute(element, "name")),
      nearbyText: sanitizeText(getNearbyText(element), MAX_NEARBY_TEXT_LENGTH),
      placeholder: sanitizeText(getAttribute(element, "placeholder")),
      tag: tagName,
      type
    };
    return field;
  }

  function buildAiFormSnapshot(options) {
    const opts = options || {};
    const doc = opts.document || (typeof document !== "undefined" ? document : null);
    const smartFillApi = opts.smartFillApi || rootScope.ChromeTestDataSmartFill;
    const allowedFieldKeys = Array.isArray(opts.allowedFieldKeys) ? opts.allowedFieldKeys.slice() : [];
    const fields = [];
    if (!doc || typeof doc.querySelectorAll !== "function") {
      return { allowedFieldKeys, fields };
    }
    const candidates = Array.from(doc.querySelectorAll('input, textarea, [contenteditable], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'));
    for (const candidate of candidates) {
      if (fields.length >= MAX_AI_FIELD_COUNT) break;
      if (!isEditableCandidate(candidate)) continue;
      const field = createFieldSnapshot(candidate, smartFillApi);
      if (field) fields.push(field);
    }
    return { allowedFieldKeys, fields };
  }

  const api = {
    MAX_AI_FIELD_COUNT,
    MAX_TEXT_LENGTH,
    buildAiFormSnapshot,
    redactSensitiveText,
    truncateText
  };

  rootScope.ChromeTestDataAiFormSnapshot = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
