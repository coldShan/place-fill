import test from "node:test";
import assert from "node:assert/strict";
import editablePkg from "../src/editable-target.js";

const { fillEditableTarget, findEditableTarget } = editablePkg;

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
