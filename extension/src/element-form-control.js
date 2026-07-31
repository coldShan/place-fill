(function (rootScope) {
  "use strict";

  const ELEMENT_TEMPORAL_TYPES = [
    "datetimerange",
    "datetime",
    "monthrange",
    "daterange",
    "timerange",
    "time",
    "month",
    "week",
    "year",
    "dates",
    "date"
  ];

  function closest(node, selector) {
    return node && typeof node.closest === "function" ? node.closest(selector) : null;
  }

  function hasClass(node, className) {
    return !!(node && node.classList && node.classList.contains(className));
  }

  function isDisabled(root) {
    if (!root || hasClass(root, "is-disabled") || root.getAttribute && root.getAttribute("aria-disabled") === "true") {
      return true;
    }
    const input = typeof root.querySelector === "function" ? root.querySelector("input") : null;
    return !!(input && input.disabled);
  }

  function describeElementControl(node) {
    const selectRoot = closest(node, ".el-select");
    if (selectRoot && !isDisabled(selectRoot)) {
      const trigger = selectRoot.querySelector(".el-select__wrapper") ||
        selectRoot.querySelector(".el-input") ||
        selectRoot.querySelector("input") ||
        selectRoot;
      return {
        adapter: "element",
        kind: "select",
        root: selectRoot,
        target: trigger,
        targets: [selectRoot]
      };
    }

    const temporalRoot = closest(node, ".el-date-editor");
    if (temporalRoot && !isDisabled(temporalRoot)) {
      const inputs = Array.from(temporalRoot.querySelectorAll("input")).filter(function (input) {
        return !input.disabled;
      });
      if (inputs.length) {
        return {
          adapter: "element",
          kind: "temporal",
          root: temporalRoot,
          target: inputs[0],
          targets: inputs
        };
      }
    }

    const switchRoot = closest(node, ".el-switch");
    if (switchRoot && !isDisabled(switchRoot)) {
      const input = switchRoot.querySelector('input[type="checkbox"]');
      if (input) {
        return {
          adapter: "element",
          kind: "choice",
          root: switchRoot,
          target: switchRoot,
          targets: [input]
        };
      }
    }

    const type = String(node && node.type || "").toLowerCase();
    if (type !== "checkbox" && type !== "radio") return null;
    const choiceRoot = closest(
      node,
      type === "radio"
        ? ".el-radio, .el-radio-button"
        : ".el-checkbox, .el-checkbox-button"
    );
    if (!choiceRoot) return null;
    const groupRoot = closest(
      choiceRoot,
      type === "radio" ? ".el-radio-group" : ".el-checkbox-group"
    );
    const root = groupRoot || choiceRoot;
    const targets = Array.from(root.querySelectorAll('input[type="' + type + '"]')).filter(function (input) {
      return !input.disabled;
    });
    if (!targets.length) return null;
    return {
      adapter: "element",
      kind: "choice",
      root,
      target: choiceRoot,
      targets
    };
  }

  function normalizeRandom(randomFn) {
    const value = Number((typeof randomFn === "function" ? randomFn : Math.random)());
    if (!Number.isFinite(value) || value < 0) return 0;
    return value >= 1 ? 0.999999999999 : value;
  }

  function pickRandom(items, randomFn) {
    return items[Math.floor(normalizeRandom(randomFn) * items.length)];
  }

  function wait(ms, env) {
    if (env && typeof env.wait === "function") return Promise.resolve(env.wait(ms));
    return new Promise(function (resolve) {
      rootScope.setTimeout(resolve, ms);
    });
  }

  function isVisible(node) {
    if (!node || node.hidden) return false;
    if (typeof node.getClientRects === "function" && node.getClientRects().length === 0) return false;
    const win = node.ownerDocument && node.ownerDocument.defaultView;
    if (win && typeof win.getComputedStyle === "function") {
      const style = win.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
    }
    return true;
  }

  function getSelectOptionContainer(root, doc) {
    const combobox = root.querySelector('input[role="combobox"]');
    const controlledId = combobox && combobox.getAttribute("aria-controls");
    const controlled = controlledId && typeof doc.getElementById === "function"
      ? doc.getElementById(controlledId)
      : null;
    if (controlled) return controlled;
    const dropdowns = Array.from(doc.querySelectorAll(".el-select-dropdown")).filter(isVisible);
    return dropdowns[dropdowns.length - 1] || null;
  }

  function getVisibleSelectOptions(container) {
    if (!container || typeof container.querySelectorAll !== "function") return [];
    return Array.from(container.querySelectorAll(".el-select-dropdown__item, [role=\"option\"]")).filter(function (option) {
      return isVisible(option) &&
        !hasClass(option, "is-disabled") &&
        !(option.getAttribute && option.getAttribute("aria-disabled") === "true");
    });
  }

  function getSelectOptions(root, doc) {
    if (!doc || typeof doc.querySelectorAll !== "function") return [];
    return getVisibleSelectOptions(getSelectOptionContainer(root, doc));
  }

  function isSelectedOption(option) {
    return hasClass(option, "selected") ||
      hasClass(option, "is-selected") ||
      !!(option.getAttribute && option.getAttribute("aria-selected") === "true");
  }

  function createKeyboardEvent(node, key) {
    const win = node && node.ownerDocument && node.ownerDocument.defaultView;
    const keyCode = key === "Escape" ? 27 : 0;
    let event;
    if (win && typeof win.KeyboardEvent === "function") {
      event = new win.KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: key,
        key
      });
    } else {
      event = { type: "keydown", key, code: key };
    }
    if (!event.keyCode) Object.defineProperty(event, "keyCode", { value: keyCode });
    if (!event.which) Object.defineProperty(event, "which", { value: keyCode });
    return event;
  }

  function closeElementPicker(input) {
    if (input && typeof input.dispatchEvent === "function") {
      input.dispatchEvent(createKeyboardEvent(input, "Escape"));
    }
    if (input && typeof input.blur === "function") input.blur();
  }

  async function confirmElementPicker(type, doc, env) {
    if (!doc || typeof doc.querySelectorAll !== "function") return false;
    const panelSelector = type.indexOf("time") === 0
      ? ".el-time-panel.el-popper"
      : ".el-date-picker.el-popper";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const panels = Array.from(doc.querySelectorAll(panelSelector)).filter(isVisible);
      const panel = panels[panels.length - 1];
      const button = panel && typeof panel.querySelector === "function"
        ? panel.querySelector(
          type.indexOf("time") === 0
            ? ".el-time-panel__btn.confirm"
            : ".el-picker-panel__footer .el-button--default"
        )
        : null;
      if (button && typeof button.click === "function") {
        button.click();
        return true;
      }
      await wait(40, env);
    }
    return false;
  }

  async function fillElementSelect(entry, env) {
    const root = entry.root;
    const doc = env && env.document || root.ownerDocument;
    const trigger = root.querySelector(".el-select__wrapper") ||
      root.querySelector(".el-input") ||
      root.querySelector("input") ||
      root;
    if (typeof trigger.click !== "function") return false;
    trigger.click();
    await wait(60, env);

    let options = getSelectOptions(root, doc);
    if (!options.length) return false;
    const unselected = options.filter(function (option) {
      return !isSelectedOption(option);
    });
    const initialOption = pickRandom(unselected.length ? unselected : options, env && env.random);
    initialOption.click();
    await wait(60, env);

    const combobox = root.querySelector('input[role="combobox"]');
    const isMultiple = !!root.querySelector(".el-select__tags") ||
      !!root.querySelector(".el-tag");
    if (!isMultiple) {
      await wait(180, env);
      return true;
    }

    const desiredCount = 1 + Math.floor(normalizeRandom(env && env.random) * 2);
    options = getSelectOptions(root, doc);
    let selected = options.filter(isSelectedOption);
    while (selected.length > desiredCount) {
      selected[selected.length - 1].click();
      await wait(20, env);
      options = getSelectOptions(root, doc);
      selected = options.filter(isSelectedOption);
    }
    while (selected.length < Math.min(desiredCount, options.length)) {
      const candidate = pickRandom(options.filter(function (option) {
        return !isSelectedOption(option);
      }), env && env.random);
      if (!candidate) break;
      candidate.click();
      await wait(20, env);
      options = getSelectOptions(root, doc);
      selected = options.filter(isSelectedOption);
    }

    const input = combobox || root.querySelector("input");
    if (input && typeof input.dispatchEvent === "function") {
      input.dispatchEvent(createKeyboardEvent(input, "Escape"));
      if (typeof input.blur === "function") input.blur();
    }
    await wait(180, env);
    return selected.length > 0;
  }

  function padNumber(value) {
    return String(value).padStart(2, "0");
  }

  function formatIsoWeek(date) {
    const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((day - yearStart) / 86400000) + 1) / 7);
    return day.getUTCFullYear() + "w" + padNumber(week);
  }

  function getTemporalType(root) {
    return ELEMENT_TEMPORAL_TYPES.find(function (type) {
      return hasClass(root, "el-date-editor--" + type);
    }) || "";
  }

  function formatTemporalValue(type, date) {
    const day = [
      date.getFullYear(),
      padNumber(date.getMonth() + 1),
      padNumber(date.getDate())
    ].join("-");
    const time = padNumber(date.getHours()) + ":" + padNumber(date.getMinutes()) + ":" + padNumber(date.getSeconds());
    if (type.indexOf("datetime") === 0) return day + " " + time;
    if (type.indexOf("time") === 0) return time;
    if (type.indexOf("month") === 0) return day.slice(0, 7);
    if (type === "week") return formatIsoWeek(date);
    if (type === "year") return String(date.getFullYear());
    return day;
  }

  function createEvent(node, type) {
    const win = node && node.ownerDocument && node.ownerDocument.defaultView;
    if (win && typeof win.Event === "function") {
      return new win.Event(type, { bubbles: true, composed: true });
    }
    return { type };
  }

  function setFormValue(node, value) {
    let proto = Object.getPrototypeOf(node);
    while (proto) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      if (descriptor && typeof descriptor.set === "function") {
        descriptor.set.call(node, value);
        return;
      }
      proto = Object.getPrototypeOf(proto);
    }
    node.value = value;
  }

  async function fillElementTemporal(entry, env) {
    const type = getTemporalType(entry.root);
    if (!type) return false;
    const now = env && env.now instanceof Date ? new Date(env.now) : new Date();
    const end = new Date(now);
    if (type === "timerange") end.setHours(end.getHours() + 1);
    else if (type === "monthrange") end.setMonth(end.getMonth() + 1);
    else end.setDate(end.getDate() + 1);

    const isRange = type.indexOf("range") > -1;
    const baseType = type.replace("range", "");
    const values = isRange
      ? [formatTemporalValue(baseType, now), formatTemporalValue(baseType, end)]
      : [formatTemporalValue(type, now)];
    const inputs = entry.targets.slice(0, values.length);
    if (inputs.length !== values.length) return false;

    inputs.forEach(function (input, index) {
      if (typeof input.focus === "function") input.focus();
      setFormValue(input, values[index]);
      input.dispatchEvent(createEvent(input, "input"));
    });
    await wait(20, env);
    inputs.forEach(function (input) {
      input.dispatchEvent(createEvent(input, "change"));
    });
    await wait(20, env);
    const activeInput = inputs[inputs.length - 1];
    const doc = env && env.document || entry.root.ownerDocument || activeInput && activeInput.ownerDocument;
    await confirmElementPicker(type, doc, env);
    closeElementPicker(activeInput);
    await wait(350, env);
    return true;
  }

  async function fillElementControl(entry, env) {
    if (!entry) return false;
    if (entry.kind === "select") return fillElementSelect(entry, env);
    if (entry.kind === "temporal") return fillElementTemporal(entry, env);
    if (entry.kind === "choice") {
      const editableTargetApi = env && env.editableTargetApi;
      return !!(editableTargetApi && editableTargetApi.fillGenericFormControl(entry.targets, env));
    }
    return false;
  }

  const api = {
    describeElementControl,
    fillElementControl
  };

  rootScope.ChromeTestDataElementFormControl = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
