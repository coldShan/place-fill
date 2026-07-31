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

test("generic form control fills native temporal inputs and clamps min/max", () => {
  const now = new Date(2026, 6, 31, 9, 5);
  const cases = [
    ["date", "2026-07-31"],
    ["datetime-local", "2026-07-31T09:05"],
    ["month", "2026-07"],
    ["time", "09:05"],
    ["week", "2026-W31"]
  ];

  cases.forEach(function ([type, expected]) {
    const input = createElement({ tagName: "INPUT", type });
    assert.equal(fillGenericFormControl(input, {
      createEvent(eventType) {
        return { type: eventType };
      },
      now,
      setFormValue(element, value) {
        element.value = value;
      }
    }), true);
    assert.equal(input.value, expected);
    assert.deepEqual(input.events, ["input", "change"]);
  });

  const futureDate = createElement({
    tagName: "INPUT",
    type: "date",
    min: "2027-01-01"
  });
  fillGenericFormControl(futureDate, {
    now,
    setFormValue(element, value) {
      element.value = value;
    }
  });
  assert.equal(futureDate.value, "2027-01-01");
});
