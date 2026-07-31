(function (rootScope) {
  "use strict";

  const BLOCKED_INPUT_TYPES = {
    button: true,
    checkbox: true,
    color: true,
    file: true,
    hidden: true,
    image: true,
    radio: true,
    range: true,
    reset: true,
    submit: true
  };
  const TEMPORAL_INPUT_TYPES = {
    date: true,
    "datetime-local": true,
    month: true,
    time: true,
    week: true
  };

  function getTagName(node) {
    return String(node && node.tagName ? node.tagName : "").toUpperCase();
  }

  function isInputLike(node) {
    const tagName = getTagName(node);
    if (tagName !== "INPUT" && tagName !== "TEXTAREA") return false;
    if (node.disabled || node.readOnly) return false;
    if (tagName === "TEXTAREA") return true;
    const type = String(node.type || "text").toLowerCase();
    return !BLOCKED_INPUT_TYPES[type];
  }

  function isContentEditableTarget(node) {
    return !!(node && node.nodeType === 1 && node.isContentEditable);
  }

  function isEditableTarget(node) {
    return isInputLike(node) || isContentEditableTarget(node);
  }

  function normalizeNode(node) {
    if (!node) return null;
    if (node.nodeType === 1) return node;
    return node.parentElement || null;
  }

  function findEditableTarget(node) {
    let cursor = normalizeNode(node);
    while (cursor) {
      if (isEditableTarget(cursor)) return cursor;
      cursor = cursor.parentElement || null;
    }
    return null;
  }

  function createEvent(type) {
    if (typeof Event === "function") return new Event(type, { bubbles: true, composed: true });
    return { type };
  }

  function dispatchEditableEvent(node, type, factory) {
    if (!node || typeof node.dispatchEvent !== "function") return;
    node.dispatchEvent((factory || createEvent)(type));
  }

  function setFormProperty(node, property, value) {
    let proto = Object.getPrototypeOf(node);
    while (proto) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, property);
      if (descriptor && typeof descriptor.set === "function") {
        descriptor.set.call(node, value);
        return;
      }
      proto = Object.getPrototypeOf(proto);
    }
    node[property] = value;
  }

  function setFormValue(node, value) {
    setFormProperty(node, "value", value);
  }

  function normalizeRandom(randomFn) {
    const value = Number((typeof randomFn === "function" ? randomFn : Math.random)());
    if (!Number.isFinite(value) || value < 0) return 0;
    return value >= 1 ? 0.999999999999 : value;
  }

  function pickRandom(items, randomFn) {
    return items[Math.floor(normalizeRandom(randomFn) * items.length)];
  }

  function getOptionText(option) {
    return String(option && (option.textContent || option.label) || "").replace(/\s+/g, "").trim();
  }

  function isPlaceholderOption(option, index) {
    const value = String(option && option.value != null ? option.value : "");
    if (!value) return true;
    return index === 0 && /^(请选择|请选一项|选择)$/.test(getOptionText(option));
  }

  function getSelectableOptions(node) {
    return Array.from(node && node.options || []).filter(function (option, index) {
      return option && !option.disabled && !option.hidden && !isPlaceholderOption(option, index);
    });
  }

  function fillSelectTarget(node, env) {
    const options = Array.from(node && node.options || []);
    const selectableOptions = getSelectableOptions(node);
    if (!selectableOptions.length) return false;

    if (node.multiple) {
      const maxCount = Math.min(2, selectableOptions.length);
      const count = 1 + Math.floor(normalizeRandom(env && env.random) * maxCount);
      const pool = selectableOptions.slice();
      const selected = [];
      while (selected.length < count) {
        selected.push(pool.splice(Math.floor(normalizeRandom(env && env.random) * pool.length), 1)[0]);
      }
      options.forEach(function (option) {
        option.selected = selected.includes(option);
      });
    } else {
      const option = pickRandom(selectableOptions, env && env.random);
      (env && env.setFormValue ? env.setFormValue : setFormValue)(node, option.value);
      options.forEach(function (item) {
        item.selected = item === option;
      });
    }

    dispatchEditableEvent(node, "input", env && env.createEvent);
    dispatchEditableEvent(node, "change", env && env.createEvent);
    return true;
  }

  function setCheckableState(node, checked, env) {
    if (!!node.checked === checked) return;
    if (typeof node.click === "function") {
      node.click();
      return;
    }
    (env && env.setFormProperty ? env.setFormProperty : setFormProperty)(node, "checked", checked);
    dispatchEditableEvent(node, "input", env && env.createEvent);
    dispatchEditableEvent(node, "change", env && env.createEvent);
  }

  function fillChoiceTargets(nodes, env) {
    const targets = Array.from(nodes || []).filter(function (node) {
      return node && !node.disabled;
    });
    if (!targets.length) return false;

    const type = String(targets[0].type || "").toLowerCase();
    if (type === "radio") {
      setCheckableState(pickRandom(targets, env && env.random), true, env);
      return true;
    }

    const maxCount = Math.min(2, targets.length);
    const count = targets.length === 1 ? 1 : 1 + Math.floor(normalizeRandom(env && env.random) * maxCount);
    const pool = targets.slice();
    const selected = [];
    while (selected.length < count) {
      selected.push(pool.splice(Math.floor(normalizeRandom(env && env.random) * pool.length), 1)[0]);
    }
    targets.forEach(function (node) {
      setCheckableState(node, selected.includes(node), env);
    });
    return true;
  }

  function padNumber(value) {
    return String(value).padStart(2, "0");
  }

  function formatIsoWeek(date) {
    const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((day - yearStart) / 86400000) + 1) / 7);
    return day.getUTCFullYear() + "-W" + padNumber(week);
  }

  function formatTemporalValue(type, date) {
    const day = [
      date.getFullYear(),
      padNumber(date.getMonth() + 1),
      padNumber(date.getDate())
    ].join("-");
    const time = padNumber(date.getHours()) + ":" + padNumber(date.getMinutes());
    if (type === "date") return day;
    if (type === "datetime-local") return day + "T" + time;
    if (type === "month") return day.slice(0, 7);
    if (type === "time") return time;
    if (type === "week") return formatIsoWeek(date);
    return "";
  }

  function clampTemporalValue(value, node) {
    const min = String(node && (node.min || node.getAttribute && node.getAttribute("min")) || "");
    const max = String(node && (node.max || node.getAttribute && node.getAttribute("max")) || "");
    if (min && value < min) return min;
    if (max && value > max) return max;
    return value;
  }

  function fillTemporalTarget(node, env) {
    const type = String(node && node.type || "").toLowerCase();
    const now = env && env.now instanceof Date ? env.now : new Date();
    const value = clampTemporalValue(formatTemporalValue(type, now), node);
    if (!value) return false;
    return fillEditableTarget(node, value, env);
  }

  function getGenericFormControlKind(node) {
    if (!node || node.disabled || node.readOnly) return "";
    const tagName = getTagName(node);
    if (tagName === "SELECT") return "select";
    if (tagName !== "INPUT") return "";
    const type = String(node.type || "text").toLowerCase();
    if (type === "checkbox" || type === "radio") return type;
    return TEMPORAL_INPUT_TYPES[type] ? "temporal" : "";
  }

  function fillGenericFormControl(target, env) {
    const nodes = Array.isArray(target) ? target : [target];
    const node = nodes[0];
    const kind = getGenericFormControlKind(node);
    if (kind === "select") return fillSelectTarget(node, env);
    if (kind === "checkbox" || kind === "radio") return fillChoiceTargets(nodes, env);
    if (kind === "temporal") return fillTemporalTarget(node, env);
    return false;
  }

  function fillEditableTarget(node, value, env) {
    if (!isEditableTarget(node)) return false;
    const text = String(value);
    const createEventFn = env && env.createEvent;

    if (typeof node.focus === "function") node.focus();

    if (isInputLike(node)) {
      (env && env.setFormValue ? env.setFormValue : setFormValue)(node, text);
      dispatchEditableEvent(node, "input", createEventFn);
      dispatchEditableEvent(node, "change", createEventFn);
      return true;
    }

    node.textContent = text;
    dispatchEditableEvent(node, "input", createEventFn);
    return true;
  }

  const api = {
    fillEditableTarget,
    fillGenericFormControl,
    findEditableTarget,
    getGenericFormControlKind,
    isEditableTarget
  };

  rootScope.ChromeTestDataEditableTarget = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
