import test from "node:test";
import assert from "node:assert/strict";

const elementFormControlPkg = await import("../extension/src/element-form-control.js");
const elementFormControlApi = elementFormControlPkg.default || elementFormControlPkg;

function classList(...names) {
  const values = new Set(names);
  return {
    add(name) {
      values.add(name);
    },
    contains(name) {
      return values.has(name);
    },
    remove(name) {
      values.delete(name);
    }
  };
}

function createInput(type) {
  const events = [];
  const eventObjects = [];
  return {
    disabled: false,
    type,
    value: "",
    blur() {
      events.push("blur");
    },
    dispatchEvent(event) {
      events.push(event.type);
      eventObjects.push(event);
      return true;
    },
    focus() {
      events.push("focus");
    },
    get events() {
      return events;
    },
    get eventObjects() {
      return eventObjects;
    }
  };
}

test("describes Element select, temporal and grouped choice controls", () => {
  const selectInput = createInput("text");
  const selectTrigger = {};
  const selectRoot = {
    classList: classList("el-select"),
    getAttribute() {
      return null;
    },
    querySelector(selector) {
      if (selector === ".el-select__wrapper") return selectTrigger;
      if (selector === "input") return selectInput;
      return null;
    }
  };
  selectInput.closest = function (selector) {
    return selector === ".el-select" ? selectRoot : null;
  };

  const dateInput = createInput("text");
  const dateRoot = {
    classList: classList("el-date-editor", "el-date-editor--date"),
    getAttribute() {
      return null;
    },
    querySelector() {
      return dateInput;
    },
    querySelectorAll() {
      return [dateInput];
    }
  };
  dateInput.closest = function (selector) {
    return selector === ".el-date-editor" ? dateRoot : null;
  };

  const radioA = createInput("radio");
  const radioB = createInput("radio");
  const radioLabel = {
    closest(selector) {
      return selector === ".el-radio-group" ? radioGroup : null;
    }
  };
  const radioGroup = {
    querySelectorAll() {
      return [radioA, radioB];
    }
  };
  radioA.closest = function (selector) {
    if (selector === ".el-radio, .el-radio-button") return radioLabel;
    return null;
  };

  const select = elementFormControlApi.describeElementControl(selectInput);
  const temporal = elementFormControlApi.describeElementControl(dateInput);
  const choice = elementFormControlApi.describeElementControl(radioA);

  assert.deepEqual(
    { adapter: select.adapter, kind: select.kind, root: select.root, target: select.target },
    { adapter: "element", kind: "select", root: selectRoot, target: selectTrigger }
  );
  assert.deepEqual(
    { adapter: temporal.adapter, kind: temporal.kind, root: temporal.root, target: temporal.target },
    { adapter: "element", kind: "temporal", root: dateRoot, target: dateInput }
  );
  assert.equal(choice.kind, "choice");
  assert.equal(choice.root, radioGroup);
  assert.deepEqual(choice.targets, [radioA, radioB]);
});

test("fills an Element single select from visible enabled options", async () => {
  const trigger = {
    clickCalls: 0,
    click() {
      this.clickCalls += 1;
    }
  };
  const input = {
    getAttribute() {
      return "false";
    }
  };
  const optionA = createOption();
  const optionB = createOption("is-disabled");
  const root = createSelectRoot(trigger, input);
  const document = createSelectDocument([optionA, optionB]);

  const filled = await elementFormControlApi.fillElementControl(
    { kind: "select", root },
    { document, random: function () { return 0; }, wait: function () {} }
  );

  assert.equal(filled, true);
  assert.equal(trigger.clickCalls, 1);
  assert.equal(optionA.clickCalls, 1);
  assert.equal(optionB.clickCalls, 0);
});

test("fills up to two values in an Element multiple select", async () => {
  const trigger = { click() {} };
  const keyboardEvents = [];
  const input = {
    dispatchEvent(event) {
      keyboardEvents.push(event);
    },
    getAttribute() {
      return "true";
    }
  };
  const options = [createOption(), createOption(), createOption()];
  const root = createSelectRoot(trigger, input, true);
  const document = createSelectDocument(options);

  const filled = await elementFormControlApi.fillElementControl(
    { kind: "select", root },
    { document, random: function () { return 0.75; }, wait: function () {} }
  );

  assert.equal(filled, true);
  assert.equal(options.filter(isSelected).length, 2);
  assert.equal(keyboardEvents.at(-1).key, "Escape");
});

test("fills Element temporal inputs and confirms the picker before closing fallbacks", async () => {
  const input = createInput("text");
  let confirmClicks = 0;
  const pickerPanel = {
    getClientRects() {
      return [{}];
    },
    querySelector(selector) {
      if (selector !== ".el-picker-panel__footer .el-button--default") return null;
      return {
        click() {
          confirmClicks += 1;
        }
      };
    }
  };
  const document = {
    querySelectorAll(selector) {
      return selector === ".el-date-picker.el-popper" ? [pickerPanel] : [];
    }
  };
  const root = {
    classList: classList("el-date-editor", "el-date-editor--datetime")
  };

  const filled = await elementFormControlApi.fillElementControl(
    { kind: "temporal", root, targets: [input] },
    { document, now: new Date(2026, 6, 31, 9, 8, 7), wait: function () {} }
  );

  assert.equal(filled, true);
  assert.equal(input.value, "2026-07-31 09:08:07");
  assert.deepEqual(input.events, ["focus", "input", "change", "keydown", "blur"]);
  assert.equal(input.eventObjects.find(function (event) { return event.type === "keydown"; }).keyCode, 27);
  assert.equal(confirmClicks, 1);
});

test("delegates Element radio, checkbox and switch filling to native choice logic", async () => {
  const targets = [createInput("checkbox")];
  let received = null;
  const editableTargetApi = {
    fillGenericFormControl(value) {
      received = value;
      return true;
    }
  };

  const filled = await elementFormControlApi.fillElementControl(
    { kind: "choice", targets },
    { editableTargetApi }
  );

  assert.equal(filled, true);
  assert.equal(received, targets);
});

function createSelectRoot(trigger, input, multiple) {
  return {
    ownerDocument: null,
    querySelector(selector) {
      if (selector === ".el-select__wrapper") return trigger;
      if (selector === 'input[role="combobox"]' || selector === "input") return input;
      if (selector === ".el-select__tags") return multiple ? {} : null;
      return null;
    }
  };
}

function createSelectDocument(options) {
  const dropdown = {
    getClientRects() {
      return [{}];
    },
    querySelectorAll() {
      return options;
    }
  };
  return {
    querySelectorAll() {
      return [dropdown];
    }
  };
}

function createOption(...classes) {
  const option = {
    classList: classList("el-select-dropdown__item", ...classes),
    clickCalls: 0,
    getAttribute(name) {
      if (name === "aria-disabled") return "false";
      if (name === "aria-selected") return isSelected(option) ? "true" : "false";
      return null;
    },
    getClientRects() {
      return [{}];
    },
    click() {
      this.clickCalls += 1;
      if (isSelected(this)) this.classList.remove("is-selected");
      else this.classList.add("is-selected");
    }
  };
  return option;
}

function isSelected(option) {
  return option.classList.contains("is-selected");
}
