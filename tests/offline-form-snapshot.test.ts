import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_OFFLINE_FORM_FIELD_COUNT,
  buildOfflineFormSnapshot
} from "../extension/src-ts/shared/offline-form-snapshot";

type MockElement = {
  tagName: string;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  isContentEditable?: boolean;
  textContent?: string;
  innerText?: string;
  labels?: Array<{ textContent?: string; innerText?: string }>;
  parentElement?: MockElement | null;
  previousElementSibling?: MockElement | null;
  attributes?: Record<string, string>;
  closest?: (selector: string) => MockElement | null;
  querySelector?: (selector: string) => MockElement | null;
  querySelectorAll?: (selector: string) => MockElement[];
  getAttribute?: (name: string) => string | null;
  getClientRects?: () => unknown[];
  options?: Array<{ textContent?: string; label?: string }>;
};

function createElement(input: Partial<MockElement> & { tagName?: string } = {}): MockElement {
  const element: MockElement = {
    tagName: input.tagName || "INPUT",
    type: input.type || "text",
    disabled: false,
    readOnly: false,
    hidden: false,
    isContentEditable: false,
    labels: [],
    parentElement: null,
    previousElementSibling: null,
    attributes: {},
    getAttribute(name: string) {
      if (name === "type") return this.type || "";
      return this.attributes?.[name] || "";
    },
    getClientRects() {
      return [{}];
    },
    ...input
  };
  return element;
}

function createDocument(elements: MockElement[], byId: Record<string, MockElement> = {}) {
  return {
    getElementById(id: string) {
      return byId[id] || null;
    },
    querySelectorAll() {
      return elements;
    }
  } as unknown as Document;
}

test("offline form snapshot collects field context from labels, fieldsets, sections and tables", () => {
  const heading = createElement({ tagName: "H2", textContent: "企业信息" });
  const section = createElement({
    tagName: "SECTION",
    querySelector(selector: string) {
      return selector === "h1, h2, h3, h4, h5, h6, [role=\"heading\"]" ? heading : null;
    }
  });
  const legend = createElement({ tagName: "LEGEND", textContent: "联系人资料" });
  const fieldset = createElement({
    tagName: "FIELDSET",
    querySelector(selector: string) {
      return selector === "legend" ? legend : null;
    }
  });
  const header = createElement({ tagName: "TH", textContent: "联系电话" });
  const row = createElement({
    tagName: "TR",
    querySelectorAll(selector: string) {
      return selector === "th" ? [header] : [];
    }
  });
  const cell = createElement({
    tagName: "TD",
    parentElement: row
  });
  const input = createElement({
    attributes: {
      "aria-label": "手机号码",
      autocomplete: "tel",
      id: "contact-mobile",
      name: "contactMobile",
      placeholder: "请输入手机号"
    },
    labels: [{ textContent: "联系人手机号" }],
    parentElement: cell,
    closest(selector: string) {
      if (selector === "fieldset") return fieldset;
      if (selector === "section, article, main, form, [role=\"form\"]") return section;
      if (selector === "td, th") return cell;
      return null;
    }
  });

  const snapshot = buildOfflineFormSnapshot({
    document: createDocument([input])
  });

  assert.equal(snapshot.fields.length, 1);
  assert.equal(snapshot.fields[0]?.tag, "input");
  assert.equal(snapshot.fields[0]?.type, "text");
  assert.equal(snapshot.fields[0]?.labels.includes("联系人手机号"), true);
  assert.equal(snapshot.fields[0]?.fieldsetLegends.includes("联系人资料"), true);
  assert.equal(snapshot.fields[0]?.sectionHeadings.includes("企业信息"), true);
  assert.equal(snapshot.fields[0]?.tableHeaders.includes("联系电话"), true);
  assert.equal(snapshot.fields[0]?.contextText.includes("企业信息"), true);
  assert.equal(snapshot.fields[0]?.contextText.includes("联系人资料"), true);
  assert.equal(JSON.stringify(snapshot).includes("value"), false);
});

test("offline form snapshot collects referenced, sibling and option context", () => {
  const label = createElement({ tagName: "SPAN", textContent: "联系人姓名" });
  const help = createElement({ tagName: "DIV", textContent: "请填写真实姓名" });
  const previous = createElement({ tagName: "SPAN", textContent: "经办人" });
  const input = createElement({
    attributes: {
      "aria-describedby": "name-help",
      "aria-labelledby": "name-label",
      name: "field1"
    },
    previousElementSibling: previous
  });
  const select = createElement({
    attributes: { name: "contactType" },
    options: [
      { textContent: "请选择" },
      { label: "手机号" },
      { textContent: "固定电话" }
    ],
    tagName: "SELECT"
  });

  const snapshot = buildOfflineFormSnapshot({
    document: createDocument([input, select], {
      "name-help": help,
      "name-label": label
    })
  });

  assert.equal(snapshot.fields[0]?.labelledByTexts.includes("联系人姓名"), true);
  assert.equal(snapshot.fields[0]?.describedByTexts.includes("请填写真实姓名"), true);
  assert.equal(snapshot.fields[0]?.siblingTexts.includes("经办人"), true);
  assert.equal(snapshot.fields[0]?.contextText.includes("联系人姓名"), true);
  assert.equal(snapshot.fields[0]?.contextText.includes("经办人"), true);
  assert.deepEqual(snapshot.fields[1]?.optionTexts, ["请选择", "手机号", "固定电话"]);
});

test("offline form snapshot does not use an unheaded field grid as section context", () => {
  const grid = createElement({
    tagName: "SECTION",
    textContent: "统一社会信用代码 姓名 身份证号 银行卡号 账号 手机号 邮箱 固定电话 地址",
    querySelector() {
      return null;
    }
  });
  const field = createElement({ tagName: "DIV", textContent: "姓名" });
  const input = createElement({
    attributes: { id: "fullName" },
    labels: [{ textContent: "姓名" }],
    parentElement: field,
    closest(selector: string) {
      if (selector === "section, article, main, form, [role=\"form\"]") return grid;
      return null;
    }
  });

  const snapshot = buildOfflineFormSnapshot({
    document: createDocument([input])
  });

  assert.deepEqual(snapshot.fields[0]?.sectionHeadings, []);
  assert.equal(snapshot.fields[0]?.contextText.includes("统一社会信用代码"), false);
  assert.equal(snapshot.fields[0]?.contextText.includes("姓名"), true);
});

test("offline form snapshot filters non-fillable controls and caps fields", () => {
  const elements = [
    createElement({ attributes: { name: "hidden" }, type: "hidden" }),
    createElement({ attributes: { name: "password" }, type: "password" }),
    createElement({ attributes: { name: "disabled" }, disabled: true }),
    createElement({ attributes: { name: "invisible" }, hidden: true })
  ].concat(
    Array.from({ length: MAX_OFFLINE_FORM_FIELD_COUNT + 5 }, function (_item, index) {
      return createElement({ attributes: { name: "field" + index } });
    })
  );

  const snapshot = buildOfflineFormSnapshot({
    document: createDocument(elements)
  });

  assert.equal(snapshot.fields.length, MAX_OFFLINE_FORM_FIELD_COUNT);
  assert.equal(snapshot.fields[0]?.name, "field0");
  assert.equal(snapshot.fields.some(function (field) { return field.name === "hidden"; }), false);
  assert.equal(snapshot.fields.some(function (field) { return field.name === "disabled"; }), false);
});
