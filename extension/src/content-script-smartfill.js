(function (rootScope) {
  "use strict";

  function createContentScriptSmartFillController(options) {
    const opts = options || {};
    const editableTargetApi = opts.editableTargetApi;
    const iconAssetsApi = opts.iconAssetsApi;
    const smartFillApi = opts.smartFillApi;
    const doc = opts.document;
    const win = opts.window;
    const getFieldValue = typeof opts.getFieldValue === "function" ? opts.getFieldValue : function () { return ""; };
    const getVisibleFieldKeys = typeof opts.getVisibleFieldKeys === "function" ? opts.getVisibleFieldKeys : function () { return smartFillApi.getSupportedFieldKeys(); };
    const isEnabled = typeof opts.isEnabled === "function" ? opts.isEnabled : function () { return true; };
    const onFieldFilled = typeof opts.onFieldFilled === "function" ? opts.onFieldFilled : function () {};

    let smartButton = null;
    let activeSmartTarget = null;
    let activeSmartFieldKey = null;
    let lastContextTarget = null;

    function renderSmartFillMenuItemMarkup(fieldKey) {
      const label = smartFillApi.formatSmartFillButtonLabel(fieldKey);
      const iconName = smartFillApi.getFieldIconName(fieldKey);
      return [
        '<button class="ctdp-smartfill-item" type="button" data-role="smart-fill-item" data-key="' + fieldKey + '" aria-label="填充' + label + '" title="' + label + '">',
        "  " + iconAssetsApi.renderIconMarkup(iconName, "ctdp-smartfill-item-icon", label),
        "</button>"
      ].join("");
    }

    function renderSmartFillMenuMarkup(primaryFieldKey) {
      const triggerLabel = primaryFieldKey ? smartFillApi.formatSmartFillButtonLabel(primaryFieldKey) : "选择测试数据类型";
      const triggerIconName = primaryFieldKey ? smartFillApi.getFieldIconName(primaryFieldKey) : iconAssetsApi.PRIMARY_LOGO_ICON;
      const visibleFieldKeys = getVisibleFieldKeys();
      return [
        '<button class="ctdp-smartfill-trigger" type="button" data-role="smart-fill-trigger" aria-label="' + triggerLabel + '" title="' + triggerLabel + '">',
        "  " + iconAssetsApi.renderIconMarkup(triggerIconName, "ctdp-smartfill-icon", triggerLabel),
        "</button>",
        '<div class="ctdp-smartfill-menu" data-role="smart-fill-menu">',
        smartFillApi
          .getSmartFillMenuFieldKeys(primaryFieldKey, visibleFieldKeys)
          .map(function (fieldKey) {
            return renderSmartFillMenuItemMarkup(fieldKey);
          })
          .join(""),
        "</div>"
      ].join("");
    }

    function setSmartButtonPosition(target) {
      if (!smartButton || !target || typeof target.getBoundingClientRect !== "function") return;
      const rect = target.getBoundingClientRect();
      const buttonWidth = smartButton.children[0].offsetWidth || 42;
      const buttonHeight = smartButton.children[0].offsetHeight || 42;
      const viewportWidth = win.innerWidth || doc.documentElement.clientWidth || 0;
      const viewportHeight = win.innerHeight || doc.documentElement.clientHeight || 0;
      const left = Math.min(Math.max(rect.right + 10, 8), Math.max(viewportWidth - buttonWidth - 8, 8));
      const top = Math.min(Math.max(rect.top + rect.height / 2 - buttonHeight / 2, 8), Math.max(viewportHeight - buttonHeight - 8, 8));

      smartButton.style.left = left + "px";
      smartButton.style.top = top + "px";
    }

    function scheduleSmartButtonPosition() {
      if (!smartButton || !activeSmartTarget || smartButton.hidden) return;
      win.requestAnimationFrame(function () {
        setSmartButtonPosition(activeSmartTarget);
      });
    }

    function setSmartButtonExpanded(expanded) {
      if (!smartButton) return;
      smartButton.setAttribute("data-expanded", String(expanded));
      scheduleSmartButtonPosition();
    }

    function hideSmartButton() {
      if (!smartButton) return;
      smartButton.hidden = true;
      smartButton.setAttribute("data-visible", "false");
      smartButton.setAttribute("data-expanded", "false");
      activeSmartTarget = null;
      activeSmartFieldKey = null;
    }

    function showSmartButton(target, fieldKey) {
      if (!smartButton || !target) return;
      if (!fieldKey || !smartFillApi.getSupportedFieldKeys(getVisibleFieldKeys()).includes(fieldKey)) {
        hideSmartButton();
        return;
      }
      activeSmartTarget = target;
      activeSmartFieldKey = fieldKey;
      smartButton.hidden = false;
      smartButton.setAttribute("data-visible", "true");
      smartButton.innerHTML = renderSmartFillMenuMarkup(fieldKey);
      smartButton.setAttribute("aria-label", fieldKey ? "智能填充" + smartFillApi.formatSmartFillButtonLabel(fieldKey) : "选择测试数据类型");
      smartButton.title = fieldKey ? smartFillApi.formatSmartFillButtonLabel(fieldKey) : "选择测试数据类型";
      setSmartButtonExpanded(false);
      scheduleSmartButtonPosition();
    }

    function fillCurrentTarget(fieldKey) {
      if (!isEnabled()) {
        hideSmartButton();
        return;
      }
      const target = editableTargetApi.findEditableTarget(activeSmartTarget) || editableTargetApi.findEditableTarget(doc.activeElement);
      const value = getFieldValue(fieldKey);
      if (!target || !fieldKey || typeof value !== "string") return;
      editableTargetApi.fillEditableTarget(target, value);
      onFieldFilled(fieldKey);
      showSmartButton(target, smartFillApi.inferFieldKeyForSmartFill(target));
    }

    function fillTarget(target, fieldKey) {
      if (!isEnabled()) {
        hideSmartButton();
        return;
      }
      if (!fieldKey) {
        hideSmartButton();
        return;
      }
      const editableTarget = editableTargetApi.findEditableTarget(target);
      const value = getFieldValue(fieldKey);
      if (!editableTarget || !fieldKey || typeof value !== "string") return;
      activeSmartTarget = editableTarget;
      activeSmartFieldKey = fieldKey;
      editableTargetApi.fillEditableTarget(editableTarget, value);
      onFieldFilled(fieldKey);
      showSmartButton(editableTarget, smartFillApi.inferFieldKeyForSmartFill(editableTarget));
    }

    function syncTarget(target) {
      if (!isEnabled()) {
        hideSmartButton();
        return;
      }
      const editableTarget = editableTargetApi.findEditableTarget(target);
      if (!editableTarget) {
        hideSmartButton();
        return;
      }
      const fieldKey = smartFillApi.inferFieldKeyForSmartFill(editableTarget);
      if (!fieldKey) {
        hideSmartButton();
        return;
      }
      showSmartButton(editableTarget, fieldKey);
    }

    function resolveManualOverrideTarget() {
      const target = editableTargetApi.findEditableTarget(lastContextTarget);
      if (target && target.isConnected !== false) return target;
      return editableTargetApi.findEditableTarget(doc.activeElement);
    }

    function setContextTarget(target) {
      lastContextTarget = editableTargetApi.findEditableTarget(target);
    }

    function refreshPosition() {
      if (activeSmartTarget && smartButton && !smartButton.hidden) scheduleSmartButtonPosition();
    }

    function mount() {
      if (smartButton || !doc || !doc.documentElement) return;
      smartButton = doc.createElement("div");
      smartButton.className = "ctdp-smartfill";
      smartButton.hidden = true;
      smartButton.setAttribute("data-visible", "false");
      smartButton.setAttribute("data-expanded", "false");
      smartButton.setAttribute("aria-label", "智能填充当前字段");
      doc.documentElement.appendChild(smartButton);

      smartButton.addEventListener("mousedown", function (event) {
        if (event.target.closest("[data-role]")) event.preventDefault();
      });

      smartButton.addEventListener("mouseenter", function () {
        setSmartButtonExpanded(true);
      });

      smartButton.addEventListener("mouseleave", function () {
        setSmartButtonExpanded(false);
      });

      smartButton.addEventListener("focusin", function () {
        setSmartButtonExpanded(true);
      });

      smartButton.addEventListener("focusout", function () {
        setSmartButtonExpanded(false);
      });

      smartButton.addEventListener("click", function (event) {
        const trigger = event.target.closest("[data-role]");
        if (!trigger) return;
        const role = trigger.getAttribute("data-role");
        if (role === "smart-fill-item") {
          fillCurrentTarget(trigger.getAttribute("data-key"));
          return;
        }
        if (role === "smart-fill-trigger") {
          if (!activeSmartFieldKey) {
            setSmartButtonExpanded(true);
            return;
          }
          fillCurrentTarget(activeSmartFieldKey);
        }
      });
    }

    return {
      fillTarget,
      hide: hideSmartButton,
      mount,
      refreshPosition,
      resolveManualOverrideTarget,
      setContextTarget,
      syncTarget
    };
  }

  const api = {
    createContentScriptSmartFillController
  };

  rootScope.ChromeTestDataContentScriptSmartFill = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
