export const MAX_OFFLINE_FORM_FIELD_COUNT = 80;

const MAX_TEXT_LENGTH = 60;
const MAX_CONTEXT_TEXT_LENGTH = 160;
const CANDIDATE_SELECTOR = 'input, textarea, select, [contenteditable], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';
const UNSUPPORTED_INPUT_TYPES = new Set([
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

export type OfflineFormSnapshotOptions = {
  document?: Document | null;
  maxFields?: number;
};

export type OfflineFormFieldSnapshot = {
  ariaLabel: string;
  autocomplete: string;
  contextText: string;
  describedByTexts: string[];
  fieldsetLegends: string[];
  fingerprint: string;
  id: string;
  labels: string[];
  labelledByTexts: string[];
  name: string;
  optionTexts: string[];
  placeholder: string;
  sectionHeadings: string[];
  siblingTexts: string[];
  tableHeaders: string[];
  tag: string;
  type: string;
};

export type OfflineFormSnapshot = {
  fields: OfflineFormFieldSnapshot[];
};

type ElementWithLabels = Element & {
  disabled?: boolean;
  hidden?: boolean;
  innerText?: string;
  isContentEditable?: boolean;
  labels?: ArrayLike<Element> | Iterable<Element> | null;
  nextElementSibling?: Element | null;
  options?: ArrayLike<Element & { label?: string }> | Iterable<Element & { label?: string }> | null;
  previousElementSibling?: Element | null;
  readOnly?: boolean;
  type?: string;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeFingerprintText(value: unknown): string {
  return String(value || "").trim().toLowerCase().replace(/[\s_\-:]+/g, "");
}

function truncateText(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  const text = normalizeText(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function getText(element: Element | null | undefined, maxLength = MAX_TEXT_LENGTH): string {
  if (!element) return "";
  const node = element as ElementWithLabels;
  return truncateText(node.textContent || node.innerText || "", maxLength);
}

function getAttribute(element: Element | null | undefined, name: string): string {
  if (!element || typeof element.getAttribute !== "function") return "";
  return truncateText(element.getAttribute(name) || "");
}

function uniqueTexts(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach(function (value) {
    const text = truncateText(value);
    if (!text || seen.has(text)) return;
    seen.add(text);
    result.push(text);
  });
  return result;
}

function labelsToArray(labels: ElementWithLabels["labels"]): Element[] {
  if (!labels) return [];
  return Array.from(labels as ArrayLike<Element>);
}

function getLabelTexts(element: ElementWithLabels): string[] {
  return uniqueTexts(labelsToArray(element.labels).map(function (label) {
    return getText(label);
  }));
}

function getDocument(optionsDocument: Document | null | undefined, element: Element): Document | null {
  return optionsDocument || element.ownerDocument || (typeof document !== "undefined" ? document : null);
}

function getReferencedTexts(element: Element, attributeName: string, doc: Document | null | undefined): string[] {
  const currentDocument = getDocument(doc, element);
  if (!currentDocument || typeof currentDocument.getElementById !== "function") return [];
  return uniqueTexts(
    String(element.getAttribute(attributeName) || "")
      .split(/\s+/)
      .map(function (id) {
        return id ? getText(currentDocument.getElementById(id)) : "";
      })
  );
}

function getSiblingTexts(element: ElementWithLabels): string[] {
  return uniqueTexts([
    getText(element.previousElementSibling),
    getText(element.nextElementSibling)
  ]);
}

function getOptionTexts(element: ElementWithLabels): string[] {
  const tag = String(element.tagName || "").toLowerCase();
  if (tag !== "select" || !element.options) return [];
  return uniqueTexts(Array.from(element.options as ArrayLike<Element & { label?: string }>).map(function (option) {
    return getText(option) || truncateText(option.label || "");
  }));
}

function isVisibleElement(element: ElementWithLabels): boolean {
  if (element.hidden || getAttribute(element, "hidden") || getAttribute(element, "aria-hidden") === "true") return false;
  if (typeof element.getClientRects === "function" && element.getClientRects().length === 0) return false;
  const win = element.ownerDocument && element.ownerDocument.defaultView;
  if (win && typeof win.getComputedStyle === "function") {
    const style = win.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  }
  return true;
}

function isFillableCandidate(element: ElementWithLabels): boolean {
  if (!element || element.disabled || element.readOnly || !isVisibleElement(element)) return false;
  const tag = String(element.tagName || "").toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag === "input") {
    const type = String(element.type || getAttribute(element, "type") || "text").toLowerCase();
    return !UNSUPPORTED_INPUT_TYPES.has(type);
  }
  return element.isContentEditable === true;
}

function findFieldsetLegends(element: Element): string[] {
  const fieldset = typeof element.closest === "function" ? element.closest("fieldset") : null;
  const legend = fieldset && typeof fieldset.querySelector === "function" ? fieldset.querySelector("legend") : null;
  return uniqueTexts([getText(legend)]);
}

function findSectionHeadings(element: Element): string[] {
  const section = typeof element.closest === "function"
    ? element.closest('section, article, main, form, [role="form"]')
    : null;
  if (!section) return [];
  const heading = typeof section.querySelector === "function"
    ? section.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]')
    : null;
  return uniqueTexts([getText(heading || section)]);
}

function findTableHeaders(element: Element): string[] {
  const cell = typeof element.closest === "function" ? element.closest("td, th") : null;
  const row = cell && cell.parentElement;
  if (!row || typeof row.querySelectorAll !== "function") return [];
  return uniqueTexts(Array.from(row.querySelectorAll("th")).map(function (header) {
    return getText(header);
  }));
}

function buildFingerprintBase(field: Omit<OfflineFormFieldSnapshot, "fingerprint" | "contextText">): string {
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

function createFieldSnapshot(element: ElementWithLabels, doc?: Document | null): Omit<OfflineFormFieldSnapshot, "fingerprint"> {
  const tag = String(element.tagName || "").toLowerCase();
  const labels = getLabelTexts(element);
  const labelledByTexts = getReferencedTexts(element, "aria-labelledby", doc);
  const describedByTexts = getReferencedTexts(element, "aria-describedby", doc);
  const fieldsetLegends = findFieldsetLegends(element);
  const optionTexts = getOptionTexts(element);
  const sectionHeadings = findSectionHeadings(element);
  const siblingTexts = getSiblingTexts(element);
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
      ...labelledByTexts,
      ...describedByTexts,
      ...fieldsetLegends,
      ...optionTexts,
      ...sectionHeadings,
      ...siblingTexts,
      ...tableHeaders,
      attributes.ariaLabel,
      attributes.placeholder,
      nearbyText
    ]).join(" "),
    describedByTexts,
    fieldsetLegends,
    labelledByTexts,
    optionTexts,
    sectionHeadings,
    siblingTexts,
    tableHeaders
  };
}

export function buildOfflineFormSnapshot(options: OfflineFormSnapshotOptions = {}): OfflineFormSnapshot {
  const doc = options.document || (typeof document !== "undefined" ? document : null);
  const maxFields = Math.max(0, options.maxFields ?? MAX_OFFLINE_FORM_FIELD_COUNT);
  const fields: OfflineFormFieldSnapshot[] = [];
  if (!doc || typeof doc.querySelectorAll !== "function") return { fields };

  const candidates = Array.from(doc.querySelectorAll(CANDIDATE_SELECTOR)) as ElementWithLabels[];
  const fingerprintCounts = new Map<string, number>();
  for (const candidate of candidates) {
    if (fields.length >= maxFields) break;
    if (!isFillableCandidate(candidate)) continue;

    const field = createFieldSnapshot(candidate, doc);
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

export function buildOfflineFormFieldSnapshot(element: Element, options: OfflineFormSnapshotOptions = {}): OfflineFormFieldSnapshot | null {
  const candidate = element as ElementWithLabels;
  if (!isFillableCandidate(candidate)) return null;

  const doc = options.document || candidate.ownerDocument || (typeof document !== "undefined" ? document : null);
  const field = createFieldSnapshot(candidate, doc);
  const fingerprintBase = buildFingerprintBase(field);
  if (!doc || typeof doc.querySelectorAll !== "function") {
    return { ...field, fingerprint: fingerprintBase };
  }

  let matchingIndex = 0;
  const candidates = Array.from(doc.querySelectorAll(CANDIDATE_SELECTOR)) as ElementWithLabels[];
  for (const item of candidates) {
    if (!isFillableCandidate(item)) continue;
    const itemField = createFieldSnapshot(item, doc);
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
