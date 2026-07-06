var ChromeTestDataOfflineFormSnapshotBundle = (function() {
  "use strict";
  const MAX_OFFLINE_FORM_FIELD_COUNT = 80;
  const MAX_TEXT_LENGTH = 60;
  const MAX_CONTEXT_TEXT_LENGTH = 160;
  const CANDIDATE_SELECTOR = 'input, textarea, select, [contenteditable], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';
  const UNSUPPORTED_INPUT_TYPES = /* @__PURE__ */ new Set([
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "password",
    "radio",
    "range",
    "reset",
    "submit"
  ]);
  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
  function normalizeFingerprintText(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s_\-:]+/g, "");
  }
  function truncateText(value, maxLength = MAX_TEXT_LENGTH) {
    const text = normalizeText(value);
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  }
  function getText(element, maxLength = MAX_TEXT_LENGTH) {
    if (!element) return "";
    const node = element;
    return truncateText(node.textContent || node.innerText || "", maxLength);
  }
  function getAttribute(element, name) {
    if (!element || typeof element.getAttribute !== "function") return "";
    return truncateText(element.getAttribute(name) || "");
  }
  function uniqueTexts(values) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    values.forEach(function(value) {
      const text = truncateText(value);
      if (!text || seen.has(text)) return;
      seen.add(text);
      result.push(text);
    });
    return result;
  }
  function labelsToArray(labels) {
    if (!labels) return [];
    return Array.from(labels);
  }
  function getLabelTexts(element) {
    return uniqueTexts(labelsToArray(element.labels).map(function(label) {
      return getText(label);
    }));
  }
  function isVisibleElement(element) {
    if (element.hidden || getAttribute(element, "hidden") || getAttribute(element, "aria-hidden") === "true") return false;
    if (typeof element.getClientRects === "function" && element.getClientRects().length === 0) return false;
    const win = element.ownerDocument && element.ownerDocument.defaultView;
    if (win && typeof win.getComputedStyle === "function") {
      const style = win.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    }
    return true;
  }
  function isFillableCandidate(element) {
    if (!element || element.disabled || element.readOnly || !isVisibleElement(element)) return false;
    const tag = String(element.tagName || "").toLowerCase();
    if (tag === "textarea" || tag === "select") return true;
    if (tag === "input") {
      const type = String(element.type || getAttribute(element, "type") || "text").toLowerCase();
      return !UNSUPPORTED_INPUT_TYPES.has(type);
    }
    return element.isContentEditable === true;
  }
  function findFieldsetLegends(element) {
    const fieldset = typeof element.closest === "function" ? element.closest("fieldset") : null;
    const legend = fieldset && typeof fieldset.querySelector === "function" ? fieldset.querySelector("legend") : null;
    return uniqueTexts([getText(legend)]);
  }
  function findSectionHeadings(element) {
    const section = typeof element.closest === "function" ? element.closest('section, article, main, form, [role="form"]') : null;
    if (!section) return [];
    const heading = typeof section.querySelector === "function" ? section.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]') : null;
    return uniqueTexts([getText(heading || section)]);
  }
  function findTableHeaders(element) {
    const cell = typeof element.closest === "function" ? element.closest("td, th") : null;
    const row = cell && cell.parentElement;
    if (!row || typeof row.querySelectorAll !== "function") return [];
    return uniqueTexts(Array.from(row.querySelectorAll("th")).map(function(header) {
      return getText(header);
    }));
  }
  function buildFingerprintBase(field) {
    return [
      "tag=" + normalizeFingerprintText(field.tag),
      "type=" + normalizeFingerprintText(field.type),
      "id=" + normalizeFingerprintText(field.id),
      "name=" + normalizeFingerprintText(field.name),
      "autocomplete=" + normalizeFingerprintText(field.autocomplete),
      "placeholder=" + normalizeFingerprintText(field.placeholder),
      "aria=" + normalizeFingerprintText(field.ariaLabel),
      "labels=" + field.labels.map(normalizeFingerprintText).join("|")
    ].join("&");
  }
  function createFieldSnapshot(element) {
    const tag = String(element.tagName || "").toLowerCase();
    const labels = getLabelTexts(element);
    const fieldsetLegends = findFieldsetLegends(element);
    const sectionHeadings = findSectionHeadings(element);
    const tableHeaders = findTableHeaders(element);
    const nearbyText = getText(element.parentElement, MAX_CONTEXT_TEXT_LENGTH);
    const attributes = {
      ariaLabel: getAttribute(element, "aria-label"),
      autocomplete: getAttribute(element, "autocomplete"),
      id: getAttribute(element, "id"),
      labels,
      name: getAttribute(element, "name"),
      placeholder: getAttribute(element, "placeholder"),
      tag,
      type: tag === "input" ? String(element.type || getAttribute(element, "type") || "text").toLowerCase() : ""
    };
    return {
      ...attributes,
      contextText: uniqueTexts([
        ...labels,
        ...fieldsetLegends,
        ...sectionHeadings,
        ...tableHeaders,
        attributes.ariaLabel,
        attributes.placeholder,
        nearbyText
      ]).join(" "),
      fieldsetLegends,
      sectionHeadings,
      tableHeaders
    };
  }
  function buildOfflineFormSnapshot(options = {}) {
    const doc = options.document || (typeof document !== "undefined" ? document : null);
    const maxFields = Math.max(0, options.maxFields ?? MAX_OFFLINE_FORM_FIELD_COUNT);
    const fields = [];
    if (!doc || typeof doc.querySelectorAll !== "function") return { fields };
    const candidates = Array.from(doc.querySelectorAll(CANDIDATE_SELECTOR));
    const fingerprintCounts = /* @__PURE__ */ new Map();
    for (const candidate of candidates) {
      if (fields.length >= maxFields) break;
      if (!isFillableCandidate(candidate)) continue;
      const field = createFieldSnapshot(candidate);
      const fingerprintBase = buildFingerprintBase(field);
      const count = fingerprintCounts.get(fingerprintBase) || 0;
      fingerprintCounts.set(fingerprintBase, count + 1);
      fields.push({
        ...field,
        fingerprint: count ? fingerprintBase + "#" + String(count + 1) : fingerprintBase
      });
    }
    return { fields };
  }
  function buildOfflineFormFieldSnapshot(element, options = {}) {
    const candidate = element;
    if (!isFillableCandidate(candidate)) return null;
    const field = createFieldSnapshot(candidate);
    const fingerprintBase = buildFingerprintBase(field);
    const doc = options.document || candidate.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!doc || typeof doc.querySelectorAll !== "function") {
      return { ...field, fingerprint: fingerprintBase };
    }
    let matchingIndex = 0;
    const candidates = Array.from(doc.querySelectorAll(CANDIDATE_SELECTOR));
    for (const item of candidates) {
      if (!isFillableCandidate(item)) continue;
      const itemField = createFieldSnapshot(item);
      if (buildFingerprintBase(itemField) !== fingerprintBase) continue;
      matchingIndex += 1;
      if (item === candidate) {
        return {
          ...field,
          fingerprint: matchingIndex > 1 ? fingerprintBase + "#" + String(matchingIndex) : fingerprintBase
        };
      }
    }
    return { ...field, fingerprint: fingerprintBase };
  }
  const offlineFormSnapshotApi = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    MAX_OFFLINE_FORM_FIELD_COUNT,
    buildOfflineFormFieldSnapshot,
    buildOfflineFormSnapshot
  }, Symbol.toStringTag, { value: "Module" }));
  const rootScope = globalThis;
  rootScope.ChromeTestDataOfflineFormSnapshot = offlineFormSnapshotApi;
  return offlineFormSnapshotApi;
})();
