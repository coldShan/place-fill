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
    const day = utcDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
    day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
    const yearStart = utcDay(day.getUTCFullYear(), 1, 1);
    const week = Math.ceil((((day - yearStart) / 86400000) + 1) / 7);
    return String(day.getUTCFullYear()).padStart(4, "0") + "-W" + padNumber(week);
  }

  function formatTemporalValue(type, date) {
    const day = [
      String(date.getFullYear()).padStart(4, "0"),
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

  function utcDay(year, month, day) {
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return date;
  }

  function parseTemporalNumber(type, value) {
    const text = String(value || "");
    if (type === "month") {
      const match = /^(\d{4,})-(0[1-9]|1[0-2])$/.exec(text);
      return match && Number(match[1]) > 0 ? (Number(match[1]) - 1970) * 12 + Number(match[2]) - 1 : NaN;
    }
    if (type === "week") {
      const match = /^(\d{4,})-W(\d{2})$/.exec(text);
      if (!match || Number(match[1]) <= 0) return NaN;
      const januaryFourth = utcDay(Number(match[1]), 1, 4);
      januaryFourth.setUTCDate(januaryFourth.getUTCDate() - (januaryFourth.getUTCDay() || 7) + 1 + (Number(match[2]) - 1) * 7);
      const local = new Date(0);
      local.setFullYear(januaryFourth.getUTCFullYear(), januaryFourth.getUTCMonth(), januaryFourth.getUTCDate());
      return formatIsoWeek(local) === text ? januaryFourth.getTime() : NaN;
    }
    const match = /^(?:(\d{4,})-(\d{2})-(\d{2})(?:T)?)?(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(text);
    if (type === "time" && match && !match[1]) {
      const hours = Number(match[4]);
      const minutes = Number(match[5]);
      const seconds = Number(match[6] || 0);
      return hours < 24 && minutes < 60 && seconds < 60
        ? ((hours * 60 + minutes) * 60 + seconds) * 1000 + Number((match[7] || "").padEnd(3, "0"))
        : NaN;
    }
    const dayMatch = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(text);
    const parts = type === "date" ? dayMatch : type === "datetime-local" && match && match[1] ? match : null;
    if (!parts) return NaN;
    const year = Number(parts[1]);
    const month = Number(parts[2]);
    const day = Number(parts[3]);
    const date = utcDay(year, month, day);
    if (year <= 0 || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return NaN;
    if (type === "date") return date.getTime();
    const time = parseTemporalNumber("time", text.slice(text.indexOf("T") + 1));
    return Number.isFinite(time) ? date.getTime() + time : NaN;
  }

  function formatTemporalNumber(type, number) {
    if (type === "month") {
      const year = 1970 + Math.floor(number / 12);
      return String(year).padStart(4, "0") + "-" + padNumber(((number % 12) + 12) % 12 + 1);
    }
    const date = new Date(number);
    if (type === "week") {
      const local = new Date(0);
      local.setFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      return formatIsoWeek(local);
    }
    const day = String(date.getUTCFullYear()).padStart(4, "0") + "-" + padNumber(date.getUTCMonth() + 1) + "-" + padNumber(date.getUTCDate());
    const time = padNumber(date.getUTCHours()) + ":" + padNumber(date.getUTCMinutes()) +
      (date.getUTCSeconds() || date.getUTCMilliseconds()
        ? ":" + padNumber(date.getUTCSeconds()) + (date.getUTCMilliseconds() ? "." + String(date.getUTCMilliseconds()).padStart(3, "0") : "")
        : "");
    if (type === "date") return day;
    if (type === "time") return time;
    return day + "T" + time;
  }

  function temporalStep(type, node) {
    const raw = String(node.step || node.getAttribute && node.getAttribute("step") || "");
    const scale = type === "month" ? 1 : type === "date" ? 86400000 : type === "week" ? 604800000 : 1000;
    const defaultStep = type === "time" || type === "datetime-local" ? 60 : 1;
    const parsed = Number(raw);
    const seconds = raw === "any" ? (type === "time" || type === "datetime-local" ? 0.001 : 1)
      : raw && Number.isFinite(parsed) && parsed > 0 ? parsed : defaultStep;
    let step = seconds * scale;
    const unit = type === "month" ? 1 : type === "date" ? 86400000 : type === "week" ? 604800000 : 1;
    if (step < unit || step % unit) {
      let multiplier = 1;
      while (multiplier <= 1000 && Math.abs((step * multiplier) / unit - Math.round((step * multiplier) / unit)) > 1e-9) multiplier++;
      if (multiplier > 1000) return NaN;
      step = Math.round(step * multiplier / unit) * unit;
    }
    return step;
  }

  function fillTemporalTarget(node, env) {
    const type = String(node && node.type || "").toLowerCase();
    const now = env && env.now instanceof Date ? env.now : new Date();
    const current = parseTemporalNumber(type, formatTemporalValue(type, now));
    const min = parseTemporalNumber(type, node.min || node.getAttribute && node.getAttribute("min"));
    const max = parseTemporalNumber(type, node.max || node.getAttribute && node.getAttribute("max"));
    const step = temporalStep(type, node);
    if (!Number.isFinite(current) || !Number.isFinite(step)) return false;

    const year = type === "month" ? 12 : type === "week" ? 52 * 604800000 : 365 * 86400000;
    let lower = type === "time" ? 0 : current - year;
    let upper = type === "time" ? 86400000 - 1 : current + year;
    if (Number.isFinite(min) && Number.isFinite(max)) {
      lower = min;
      upper = max;
    } else if (Number.isFinite(min)) {
      lower = Math.max(lower, min);
      upper = Math.max(upper, min + (type === "time" ? 0 : year));
    } else if (Number.isFinite(max)) {
      upper = Math.min(upper, max);
      lower = Math.min(lower, max - (type === "time" ? 0 : year));
    }
    if (type !== "time") {
      const first = parseTemporalNumber(type, type === "month" ? "0001-01" : type === "week" ? "0001-W01" : type === "date" ? "0001-01-01" : "0001-01-01T00:00");
      lower = Math.max(lower, first);
    }

    const stepBase = Number.isFinite(min) ? min : parseTemporalNumber(type, node.getAttribute && node.getAttribute("value"));
    const base = Number.isFinite(stepBase) ? stepBase : type === "week" ? -259200000 : 0;
    const spans = type === "time" && Number.isFinite(min) && Number.isFinite(max) && min > max
      ? [[min, 86400000 - 1], [0, max]] : [[lower, upper]];
    const ranges = spans.map(function ([start, end]) {
      const first = Math.ceil((start - base) / step);
      const last = Math.floor((end - base) / step);
      return { first, count: Math.max(0, last - first + 1) };
    });
    const total = ranges.reduce(function (sum, range) { return sum + range.count; }, 0);
    if (!total) return false;
    let pick = Math.floor(normalizeRandom(env && env.random) * total);
    let number;
    for (const range of ranges) {
      if (pick < range.count) {
        number = base + (range.first + pick) * step;
        break;
      }
      pick -= range.count;
    }
    const value = formatTemporalNumber(type, number);
    const doc = node.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (doc && typeof doc.createElement === "function") {
      const probe = doc.createElement("input");
      probe.type = type;
      probe.min = node.min || node.getAttribute && node.getAttribute("min") || "";
      probe.max = node.max || node.getAttribute && node.getAttribute("max") || "";
      probe.step = node.step || node.getAttribute && node.getAttribute("step") || "";
      const initialValue = node.getAttribute && node.getAttribute("value");
      if (initialValue) probe.setAttribute("value", initialValue);
      probe.value = value;
      if (probe.value !== value || !probe.validity.valid) return false;
    }
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
