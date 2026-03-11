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
    findEditableTarget,
    isEditableTarget
  };

  rootScope.ChromeTestDataEditableTarget = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
