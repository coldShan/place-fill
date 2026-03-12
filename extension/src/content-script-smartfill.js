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
    const FOCUS_RING_FADE_OUT_MS = 520;

    let smartButton = null;
    let focusRing = null;
    let activeSmartTarget = null;
    let activeSmartFieldKey = null;
    let lastContextTarget = null;
    let focusTargetClearTimer = null;

    function isTransparentColor(value) {
      return !value || value === "transparent" || value === "rgba(0, 0, 0, 0)";
    }

    function resolveFocusTargetSurfaceColor(target) {
      let node = target;
      while (node && node.nodeType === 1) {
        try {
          const backgroundColor = win.getComputedStyle(node).backgroundColor;
          if (!isTransparentColor(backgroundColor)) return backgroundColor;
        } catch (_) {
          break;
        }
        node = node.parentElement;
      }
      return "rgba(255, 255, 255, 0.98)";
    }

    function clearFocusTargetMarker(target) {
      if (!target || typeof target.removeAttribute !== "function") return;
      if (target.style && typeof target.style.removeProperty === "function") {
        target.style.removeProperty("--ctdp-smartfocus-surface");
      }
      target.removeAttribute("data-ctdp-smartfocus-target");
    }

    function cancelFocusTargetMarkerClear() {
      if (!focusTargetClearTimer) return;
      win.clearTimeout(focusTargetClearTimer);
      focusTargetClearTimer = null;
    }

    function scheduleFocusTargetMarkerClear(target) {
      cancelFocusTargetMarkerClear();
      if (!target) return;
      focusTargetClearTimer = win.setTimeout(function () {
        if (focusRing && focusRing.getAttribute("data-visible") === "true" && activeSmartTarget === target) return;
        clearFocusTargetMarker(target);
        focusTargetClearTimer = null;
      }, FOCUS_RING_FADE_OUT_MS);
    }

    function syncFocusTargetMarker(target) {
      cancelFocusTargetMarkerClear();
      if (activeSmartTarget && activeSmartTarget !== target) clearFocusTargetMarker(activeSmartTarget);
      if (!target || typeof target.setAttribute !== "function") return;
      if (target.style && typeof target.style.setProperty === "function") {
        target.style.setProperty("--ctdp-smartfocus-surface", resolveFocusTargetSurfaceColor(target));
      }
      target.setAttribute("data-ctdp-smartfocus-target", "true");
    }

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

    function getFocusRingRadius(target) {
      if (!target || !win || typeof win.getComputedStyle !== "function") return "14px";
      try {
        return win.getComputedStyle(target).borderRadius || "14px";
      } catch (_) {
        return "14px";
      }
    }

    function setFocusRingPosition(target) {
      if (!focusRing || !target || typeof target.getBoundingClientRect !== "function") return;
      const rect = target.getBoundingClientRect();
      const inset = 1;
      focusRing.style.left = Math.max(rect.left - inset, 0) + "px";
      focusRing.style.top = Math.max(rect.top - inset, 0) + "px";
      focusRing.style.width = rect.width + inset * 2 + "px";
      focusRing.style.height = rect.height + inset * 2 + "px";
      focusRing.style.setProperty("--ctdp-focus-radius", getFocusRingRadius(target));
    }

    function scheduleSmartButtonPosition() {
      if (!smartButton || !activeSmartTarget || smartButton.hidden) return;
      win.requestAnimationFrame(function () {
        setSmartButtonPosition(activeSmartTarget);
      });
    }

    function scheduleFocusRingPosition() {
      if (!focusRing || !activeSmartTarget || focusRing.getAttribute("data-visible") !== "true") return;
      win.requestAnimationFrame(function () {
        setFocusRingPosition(activeSmartTarget);
      });
    }

    function setSmartButtonExpanded(expanded) {
      if (!smartButton) return;
      smartButton.setAttribute("data-expanded", String(expanded));
      scheduleSmartButtonPosition();
    }

    function showFocusRing(target) {
      if (!focusRing || !target) return;
      syncFocusTargetMarker(target);
      focusRing.setAttribute("data-visible", "true");
      setFocusRingPosition(target);
      scheduleFocusRingPosition();
    }

    function hideFocusRing() {
      if (!focusRing) return;
      focusRing.setAttribute("data-visible", "false");
      scheduleFocusTargetMarkerClear(activeSmartTarget);
    }

    function hideSmartButton() {
      if (!smartButton) return;
      smartButton.hidden = true;
      smartButton.setAttribute("data-visible", "false");
      smartButton.setAttribute("data-expanded", "false");
      hideFocusRing();
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
      showFocusRing(target);
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
      if (activeSmartTarget && focusRing && focusRing.getAttribute("data-visible") === "true") scheduleFocusRingPosition();
    }

    function mount() {
      if (smartButton || !doc || !doc.documentElement) return;
      focusRing = doc.createElement("div");
      focusRing.className = "ctdp-smartfocus";
      focusRing.setAttribute("data-visible", "false");
      focusRing.setAttribute("aria-hidden", "true");
      doc.documentElement.appendChild(focusRing);

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
