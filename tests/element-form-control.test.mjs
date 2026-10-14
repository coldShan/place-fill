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
  return {
    disabled: false,
    type,
    value: "",
    dispatchEvent(event) {
      events.push(event.type);
      return true;
    },
    focus() {
      events.push("focus");
    },
    get events() {
      return events;
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

test("randomly selects enabled Element calendar cells and preserves component formatting", async () => {
  for (const type of ["date", "datetime", "month", "year", "week", "dates", "daterange", "datetimerange", "monthrange"]) {
    const inputs = [createInput("text")];
    if (type.includes("range")) inputs.push(createInput("text"));
    let selected = 0;
    let confirms = 0;
    const cells = ["disabled", "prev-month", "next-month", "week", "", "", ""].map((name, index) => ({
      classList: classList(name),
      click() {
        assert.ok(index >= 4, "must not click disabled or overflow cells");
        inputs[Math.min(selected++, inputs.length - 1)].value = "custom-date-" + index;
      }
    }));
    const panel = {
      querySelectorAll() { return cells; },
      querySelector() { return { click() { confirms++; } }; }
    };
    const filled = await elementFormControlApi.fillElementControl(
      { kind: "temporal", root: { classList: classList("el-date-editor--" + type) }, targets: inputs },
      { document: { querySelectorAll() { return [panel]; } }, random: () => 0.75, wait() {} }
    );
    assert.equal(filled, true);
    assert.equal(selected, inputs.length);
    assert.equal(inputs[0].value, inputs.length === 1 ? "custom-date-6" : "custom-date-5");
    if (inputs.length === 2) assert.equal(inputs[1].value, "custom-date-6");
    assert.equal(confirms, 1);
    assert.ok(!inputs[0].events.includes("input"), "must use picker instead of direct value writes");
  }
});

test("skips Element calendars with no enabled dates without writing today", async () => {
  const input = createInput("text");
  const panel = { querySelectorAll() { return [{ classList: classList("disabled"), click() { assert.fail(); } }]; } };
  const filled = await elementFormControlApi.fillElementControl(
    { kind: "temporal", root: { classList: classList("el-date-editor--date") }, targets: [input] },
    { document: { querySelectorAll() { return [panel]; } }, wait() {} }
  );
  assert.equal(filled, false);
  assert.equal(input.value, "");
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
