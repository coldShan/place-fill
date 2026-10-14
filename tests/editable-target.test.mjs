import test from "node:test";
import assert from "node:assert/strict";
import editablePkg from "../extension/src/editable-target.js";

const {
  fillEditableTarget,
  fillGenericFormControl,
  findEditableTarget,
  getGenericFormControlKind
} = editablePkg;

function createElement(overrides) {
  return {
    nodeType: 1,
    tagName: "DIV",
    type: "",
    disabled: false,
    readOnly: false,
    isContentEditable: false,
    parentElement: null,
    textContent: "",
    value: "",
    checked: false,
    events: [],
    dispatchEvent(event) {
      this.events.push(event.type);
    },
    ...overrides
  };
}

test("findEditableTarget resolves supported input, textarea and contenteditable ancestors", () => {
  const input = createElement({ tagName: "INPUT", type: "text" });
  const textarea = createElement({ tagName: "TEXTAREA" });
  const editable = createElement({ isContentEditable: true });
  const child = createElement({ parentElement: editable });

  assert.equal(findEditableTarget(input), input);
  assert.equal(findEditableTarget(textarea), textarea);
  assert.equal(findEditableTarget(child), editable);
  assert.equal(findEditableTarget(createElement({ tagName: "INPUT", type: "checkbox" })), null);
});

test("fillEditableTarget writes value and emits input/change for input-like elements", () => {
  const input = createElement({ tagName: "INPUT", type: "text" });

  const filled = fillEditableTarget(input, "13800138000", {
    createEvent(type) {
      return { type };
    },
    setFormValue(element, value) {
      element.value = value;
    }
  });

  assert.equal(filled, true);
  assert.equal(input.value, "13800138000");
  assert.deepEqual(input.events, ["input", "change"]);
});

test("fillEditableTarget writes plain text into contenteditable and emits input", () => {
  const editable = createElement({ isContentEditable: true });

  const filled = fillEditableTarget(editable, "韩帆", {
    createEvent(type) {
      return { type };
    }
  });

  assert.equal(filled, true);
  assert.equal(editable.textContent, "韩帆");
  assert.deepEqual(editable.events, ["input"]);
});

test("generic form control selects a valid native select option", () => {
  const options = [
    { value: "", textContent: "请选择", selected: true },
    { value: "primary", textContent: "主要联系人", selected: false },
    { value: "disabled", textContent: "不可用", selected: false, disabled: true }
  ];
  const select = createElement({ tagName: "SELECT", options, multiple: false });

  const filled = fillGenericFormControl(select, {
    createEvent(type) {
      return { type };
    },
    random() {
      return 0;
    },
    setFormValue(element, value) {
      element.value = value;
    }
  });

  assert.equal(getGenericFormControlKind(select), "select");
  assert.equal(filled, true);
  assert.equal(select.value, "primary");
  assert.deepEqual(options.map((option) => option.selected), [false, true, false]);
  assert.deepEqual(select.events, ["input", "change"]);
});

test("generic form control selects one or two options for a multiple select", () => {
  const options = [
    { value: "", textContent: "请选择", selected: true },
    { value: "a", textContent: "选项 A", selected: false },
    { value: "b", textContent: "选项 B", selected: false },
    { value: "c", textContent: "选项 C", selected: false }
  ];
  const select = createElement({ tagName: "SELECT", options, multiple: true });

  assert.equal(fillGenericFormControl(select, {
    createEvent(type) {
      return { type };
    },
    random() {
      return 0;
    }
  }), true);
  assert.deepEqual(options.map((option) => option.selected), [false, true, false, false]);
});

test("generic form control chooses one radio and at least one checkbox", () => {
  function createChoice(type) {
    return createElement({
      tagName: "INPUT",
      type,
      click() {
        this.checked = type === "radio" ? true : !this.checked;
        this.events.push("click");
      }
    });
  }

  const radios = [createChoice("radio"), createChoice("radio")];
  assert.equal(fillGenericFormControl(radios, { random: () => 0.9 }), true);
  assert.deepEqual(radios.map((node) => node.checked), [false, true]);

  const randomValues = [0.75, 0, 0];
  const checkboxes = [createChoice("checkbox"), createChoice("checkbox"), createChoice("checkbox")];
  assert.equal(fillGenericFormControl(checkboxes, {
    random() {
      return randomValues.shift() || 0;
    }
  }), true);
  assert.deepEqual(checkboxes.map((node) => node.checked), [true, true, false]);
});

test("generic form control randomizes native temporal inputs within valid ranges", () => {
  const now = new Date(2026, 6, 31, 9, 5);
  const cases = [
    ["date", "2028-01-01", "2028-01-03", "2028-01-02"],
    ["datetime-local", "2028-01-01T10:00", "2028-01-01T10:02", "2028-01-01T10:01"],
    ["month", "2028-01", "2028-03", "2028-02"],
    ["time", "10:00", "10:02", "10:01"],
    ["week", "2028-W01", "2028-W03", "2028-W02"]
  ];

  cases.forEach(function ([type, min, max, expected]) {
    const input = createElement({ tagName: "INPUT", type, min, max });
    assert.equal(fillGenericFormControl(input, {
      createEvent(eventType) {
        return { type: eventType };
      },
      now,
      random: () => 0.5,
      setFormValue(element, value) {
        element.value = value;
      }
    }), true);
    assert.equal(input.value, expected);
    assert.deepEqual(input.events, ["input", "change"]);
  });

  const steppedDate = createElement({ tagName: "INPUT", type: "date", min: "2028-01-01", max: "2028-01-10", step: "3" });
  assert.equal(fillGenericFormControl(steppedDate, { now, random: () => 0.75 }), true);
  assert.equal(steppedDate.value, "2028-01-10");

  const fractionalStep = createElement({ tagName: "INPUT", type: "month", min: "2028-01", max: "2028-07", step: "1.5" });
  assert.equal(fillGenericFormControl(fractionalStep, { now, random: () => 0.5 }), true);
  assert.equal(fractionalStep.value, "2028-04");

  const oneSided = createElement({ tagName: "INPUT", type: "date", min: "2030-01-01" });
  assert.equal(fillGenericFormControl(oneSided, { now, random: () => 0 }), true);
  assert.equal(oneSided.value, "2030-01-01");

  const invalidStep = createElement({ tagName: "INPUT", type: "time", min: "10:00", max: "10:02", step: "0" });
  assert.equal(fillGenericFormControl(invalidStep, { now, random: () => 0.5 }), true);
  assert.equal(invalidStep.value, "10:01");

  const narrow = createElement({ tagName: "INPUT", type: "time", min: "10:00:00.100", max: "10:00:00.105", step: "any" });
  assert.equal(fillGenericFormControl(narrow, { now, random: () => 0.5 }), true);
  assert.equal(narrow.value, "10:00:00.103");

  const ancient = createElement({ tagName: "INPUT", type: "date" });
  const ancientNow = new Date(0);
  ancientNow.setFullYear(1, 0, 1);
  assert.equal(fillGenericFormControl(ancient, { now: ancientNow, random: () => 0 }), true);
  assert.equal(ancient.value, "0001-01-01");

  const overnight = createElement({ tagName: "INPUT", type: "time", min: "22:00", max: "02:00" });
  assert.equal(fillGenericFormControl(overnight, { now, random: () => 0.75 }), true);
  assert.equal(overnight.value, "01:00");

  const impossible = createElement({ tagName: "INPUT", type: "date", min: "2028-01-03", max: "2028-01-02" });
  assert.equal(fillGenericFormControl(impossible, { now }), false);
  assert.equal(impossible.value, "");

  const browserRejected = createElement({
    tagName: "INPUT", type: "date", min: "2028-01-01", max: "2028-01-03",
    ownerDocument: { createElement: () => ({ validity: { valid: false } }) }
  });
  assert.equal(fillGenericFormControl(browserRejected, { now }), false);
  assert.deepEqual(browserRejected.events, []);
});
