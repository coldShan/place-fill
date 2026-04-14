(function (rootScope) {
  "use strict";

  const MAX_RECOMMENDATION_ITEMS = 10;
  const RECOMMENDATION_SUCCESS_MESSAGE = "已填充推荐数据";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildRecommendationContext(profile) {
    const parts = [];
    const fullName = profile && typeof profile.fullName === "string" ? profile.fullName.trim() : "";
    const companyName = profile && typeof profile.companyName === "string" ? profile.companyName.trim() : "";
    if (fullName) parts.push(fullName);
    if (companyName) parts.push(companyName);
    return parts.join(" / ");
  }

  function buildRecommendationItems(fieldKey, favoriteProfiles) {
    if (!fieldKey || !Array.isArray(favoriteProfiles)) return [];
    return favoriteProfiles
      .map(function (entry) {
        const profile = entry && entry.profile && typeof entry.profile === "object" ? entry.profile : null;
        const primaryText = profile && typeof profile[fieldKey] === "string" ? profile[fieldKey].trim() : "";
        if (!primaryText) return null;
        return {
          id: String(entry && entry.id ? entry.id : ""),
          primaryText: primaryText,
          secondaryText: buildRecommendationContext(profile)
        };
      })
      .filter(Boolean)
      .slice(0, MAX_RECOMMENDATION_ITEMS);
  }

  function createContentScriptSmartFillController(options) {
    const opts = options || {};
    const editableTargetApi = opts.editableTargetApi;
    const iconAssetsApi = opts.iconAssetsApi;
    const smartFillApi = opts.smartFillApi;
    const doc = opts.document;
    const win = opts.window;
    const getFieldValue = typeof opts.getFieldValue === "function" ? opts.getFieldValue : function () { return ""; };
    const getCurrentScope = typeof opts.getCurrentScope === "function" ? opts.getCurrentScope : function () { return ""; };
    const getVisibleFieldKeys = typeof opts.getVisibleFieldKeys === "function" ? opts.getVisibleFieldKeys : function () { return smartFillApi.getSupportedFieldKeys(); };
    const isEnabled = typeof opts.isEnabled === "function" ? opts.isEnabled : function () { return true; };
    const listRecommendedProfiles = typeof opts.listRecommendedProfiles === "function"
      ? opts.listRecommendedProfiles
      : function () { return Promise.resolve([]); };
    const openDataManagerPage = typeof opts.openDataManagerPage === "function"
      ? opts.openDataManagerPage
      : function () { return Promise.resolve(); };
    const onFieldFilled = typeof opts.onFieldFilled === "function" ? opts.onFieldFilled : function () {};
    const FOCUS_RING_FADE_OUT_MS = 120;

    let smartButton = null;
    let activeSmartTarget = null;
    let activeSmartFieldKey = null;
    let lastContextTarget = null;
    let focusTargetClearTimer = null;
    let fillInProgress = false;
    let recommendationOpen = false;
    let recommendationLoading = false;
    let recommendationItems = [];
    let recommendationMessage = "";
    let recommendationRequestId = 0;
    let preserveFocusOut = false;
    let preserveFocusOutTimer = null;
    let statusMessage = "";
    let statusTimer = null;

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
        target.style.removeProperty("--ctdp-focus-radius");
        target.style.removeProperty("--ctdp-smartfocus-surface");
      }
      target.removeAttribute("data-ctdp-smartfocus-visible");
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
        if (target.getAttribute && target.getAttribute("data-ctdp-smartfocus-visible") === "true" && activeSmartTarget === target) return;
        clearFocusTargetMarker(target);
        focusTargetClearTimer = null;
      }, FOCUS_RING_FADE_OUT_MS);
    }

    function resolveFocusTargetRadius(target) {
      if (!target || !win || typeof win.getComputedStyle !== "function") return "14px";
      try {
        return win.getComputedStyle(target).borderRadius || "14px";
      } catch (_) {
        return "14px";
      }
    }

    function syncFocusTargetMarker(target) {
      cancelFocusTargetMarkerClear();
      if (activeSmartTarget && activeSmartTarget !== target) clearFocusTargetMarker(activeSmartTarget);
      if (!target || typeof target.setAttribute !== "function") return;
      if (target.style && typeof target.style.setProperty === "function") {
        target.style.setProperty("--ctdp-focus-radius", resolveFocusTargetRadius(target));
        target.style.setProperty("--ctdp-smartfocus-surface", resolveFocusTargetSurfaceColor(target));
      }
      target.setAttribute("data-ctdp-smartfocus-target", "true");
      target.setAttribute("data-ctdp-smartfocus-visible", "true");
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

    function renderRecommendationTriggerMarkup() {
      return [
        '<button class="ctdp-smartfill-recommend-trigger" type="button" data-role="smart-fill-recommend-trigger" aria-label="推荐数据" title="推荐数据">',
        '  <span class="ctdp-smartfill-recommend-trigger-text" aria-hidden="true">推荐数据</span>',
        "</button>"
      ].join("");
    }

    function renderRecommendationItemsMarkup() {
      if (recommendationLoading) {
        return '<div class="ctdp-smartfill-recommend-state" data-role="smart-fill-recommend-state">正在读取推荐数据</div>';
      }
      if (!recommendationItems.length) {
        return [
          '<div class="ctdp-smartfill-recommend-empty" data-role="smart-fill-recommend-empty">',
          '  <p class="ctdp-smartfill-recommend-empty-text">' + escapeHtml(recommendationMessage) + "</p>",
          recommendationMessage === "当前站点还没有常用数据"
            ? '  <button class="ctdp-smartfill-recommend-link" type="button" data-role="smart-fill-open-data-manager">去数据管理页</button>'
            : "",
          "</div>"
        ].join("");
      }
      return [
        '<div class="ctdp-smartfill-recommend-list" data-role="smart-fill-recommend-list">',
        recommendationItems
          .map(function (item) {
            return [
              '<button class="ctdp-smartfill-recommend-item" type="button" data-role="smart-fill-recommend-item" data-id="' + escapeHtml(item.id) + '" aria-label="填充推荐数据" title="' + escapeHtml(item.primaryText) + '">',
              '  <span class="ctdp-smartfill-recommend-item-primary">' + escapeHtml(item.primaryText) + "</span>",
              item.secondaryText
                ? '  <span class="ctdp-smartfill-recommend-item-secondary">' + escapeHtml(item.secondaryText) + "</span>"
                : "",
              "</button>"
            ].join("");
          })
          .join(""),
        "</div>"
      ].join("");
    }

    function renderRecommendationPanelMarkup() {
      if (!recommendationOpen) return "";
      return [
        '<section class="ctdp-smartfill-recommend-panel" data-role="smart-fill-recommend-panel" aria-label="推荐数据">',
        '  <div class="ctdp-smartfill-recommend-title">推荐数据</div>',
        renderRecommendationItemsMarkup(),
        "</section>"
      ].join("");
    }

    function renderStatusMarkup() {
      if (!statusMessage) return "";
      return '<div class="ctdp-smartfill-status" data-role="smart-fill-status">' + escapeHtml(statusMessage) + "</div>";
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
        renderRecommendationTriggerMarkup(),
        smartFillApi
          .getSmartFillMenuFieldKeys(primaryFieldKey, visibleFieldKeys)
          .map(function (fieldKey) {
            return renderSmartFillMenuItemMarkup(fieldKey);
          })
          .join(""),
        "</div>",
        renderRecommendationPanelMarkup(),
        renderStatusMarkup()
      ].join("");
    }

    function setSmartButtonPosition(target) {
      if (!smartButton || !target || typeof target.getBoundingClientRect !== "function") return;
      const rect = target.getBoundingClientRect();
      const scrollX = win.pageXOffset || 0;
      const scrollY = win.pageYOffset || 0;
      const buttonWidth = smartButton.children[0].offsetWidth || 42;
      const buttonHeight = smartButton.children[0].offsetHeight || 42;
      const viewportWidth = win.innerWidth || doc.documentElement.clientWidth || 0;
      const viewportHeight = win.innerHeight || doc.documentElement.clientHeight || 0;
      const left = Math.min(Math.max(rect.right + 10, 8), Math.max(viewportWidth - buttonWidth - 8, 8));
      const top = Math.min(Math.max(rect.top + rect.height / 2 - buttonHeight / 2, 8), Math.max(viewportHeight - buttonHeight - 8, 8));

      smartButton.style.left = left + scrollX + "px";
      smartButton.style.top = top + scrollY + "px";
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

    function renderSmartButton() {
      if (!smartButton) return;
      smartButton.innerHTML = renderSmartFillMenuMarkup(activeSmartFieldKey);
      scheduleSmartButtonPosition();
    }

    function hideFocusTargetMarker() {
      if (!activeSmartTarget || typeof activeSmartTarget.removeAttribute !== "function") return;
      activeSmartTarget.removeAttribute("data-ctdp-smartfocus-visible");
      scheduleFocusTargetMarkerClear(activeSmartTarget);
    }

    function clearStatusMessage() {
      if (statusTimer) {
        win.clearTimeout(statusTimer);
        statusTimer = null;
      }
      statusMessage = "";
    }

    function holdFocusOutSync() {
      preserveFocusOut = true;
      if (preserveFocusOutTimer) win.clearTimeout(preserveFocusOutTimer);
      preserveFocusOutTimer = win.setTimeout(function () {
        preserveFocusOut = false;
        preserveFocusOutTimer = null;
      }, 180);
    }

    function showStatusMessage(message) {
      clearStatusMessage();
      statusMessage = String(message || "").trim();
      renderSmartButton();
      if (!statusMessage) return;
      statusTimer = win.setTimeout(function () {
        statusMessage = "";
        statusTimer = null;
        renderSmartButton();
      }, 1400);
    }

    function resetRecommendationState() {
      recommendationOpen = false;
      recommendationLoading = false;
      recommendationItems = [];
      recommendationMessage = "";
      recommendationRequestId += 1;
    }

    function hideSmartButton() {
      if (!smartButton) return;
      resetRecommendationState();
      clearStatusMessage();
      smartButton.hidden = true;
      smartButton.setAttribute("data-visible", "false");
      smartButton.setAttribute("data-expanded", "false");
      hideFocusTargetMarker();
      activeSmartTarget = null;
      activeSmartFieldKey = null;
    }

    function showSmartButton(target, fieldKey) {
      if (!smartButton || !target) return;
      if (!fieldKey || !smartFillApi.getSupportedFieldKeys(getVisibleFieldKeys()).includes(fieldKey)) {
        hideSmartButton();
        return;
      }
      if (activeSmartTarget && activeSmartTarget !== target) clearFocusTargetMarker(activeSmartTarget);
      activeSmartTarget = target;
      activeSmartFieldKey = fieldKey;
      smartButton.hidden = false;
      smartButton.setAttribute("data-visible", "true");
      syncFocusTargetMarker(target);
      resetRecommendationState();
      renderSmartButton();
      smartButton.setAttribute("aria-label", fieldKey ? "智能填充" + smartFillApi.formatSmartFillButtonLabel(fieldKey) : "选择测试数据类型");
      smartButton.title = fieldKey ? smartFillApi.formatSmartFillButtonLabel(fieldKey) : "选择测试数据类型";
      setSmartButtonExpanded(false);
      scheduleSmartButtonPosition();
    }

    function fillCurrentTargetValue(value) {
      if (!isEnabled()) {
        hideSmartButton();
        return;
      }
      const target = editableTargetApi.findEditableTarget(activeSmartTarget) || editableTargetApi.findEditableTarget(doc.activeElement);
      if (!target || typeof value !== "string") return;
      fillInProgress = true;
      editableTargetApi.fillEditableTarget(target, value);
      fillInProgress = false;
      showSmartButton(target, smartFillApi.inferFieldKeyForSmartFill(target) || activeSmartFieldKey);
    }

    function fillCurrentTarget(fieldKey) {
      const value = getFieldValue(fieldKey);
      if (!fieldKey || typeof value !== "string") return;
      fillCurrentTargetValue(value);
      onFieldFilled(fieldKey);
    }

    function fillRecommendedValue(id) {
      const item = recommendationItems.find(function (entry) {
        return entry.id === id;
      });
      if (!item) return;
      fillCurrentTargetValue(item.primaryText);
      showStatusMessage(RECOMMENDATION_SUCCESS_MESSAGE);
    }

    function focusFirstRecommendationItem() {
      if (!smartButton || !recommendationOpen) return;
      const firstItem = smartButton.querySelector('[data-role="smart-fill-recommend-item"]');
      if (firstItem && typeof firstItem.focus === "function") firstItem.focus();
    }

    async function openRecommendationPanel() {
      if (!activeSmartFieldKey) return;
      recommendationOpen = true;
      recommendationLoading = true;
      recommendationItems = [];
      recommendationMessage = "";
      renderSmartButton();
      setSmartButtonExpanded(true);
      const requestId = recommendationRequestId + 1;
      recommendationRequestId = requestId;
      let favorites = [];
      try {
        favorites = await listRecommendedProfiles(getCurrentScope());
      } catch (_) {
        favorites = [];
      }
      if (!smartButton || requestId !== recommendationRequestId || !recommendationOpen) return;
      recommendationItems = buildRecommendationItems(activeSmartFieldKey, favorites);
      recommendationLoading = false;
      recommendationMessage = favorites.length
        ? "没有可用于当前字段的推荐数据"
        : "当前站点还没有常用数据";
      renderSmartButton();
      if (recommendationItems.length) focusFirstRecommendationItem();
    }

    function closeRecommendationPanel() {
      if (!recommendationOpen && !recommendationLoading && !recommendationItems.length && !recommendationMessage) return;
      resetRecommendationState();
      renderSmartButton();
    }

    function toggleRecommendationPanel() {
      if (recommendationOpen) {
        closeRecommendationPanel();
        return;
      }
      openRecommendationPanel();
    }

    function moveRecommendationFocus(step) {
      if (!smartButton || !recommendationOpen) return;
      const items = Array.from(smartButton.querySelectorAll('[data-role="smart-fill-recommend-item"]'));
      if (!items.length) return;
      const activeElement = doc.activeElement;
      const currentIndex = items.indexOf(activeElement);
      const nextIndex = currentIndex === -1
        ? 0
        : (currentIndex + step + items.length) % items.length;
      const nextItem = items[nextIndex];
      if (nextItem && typeof nextItem.focus === "function") nextItem.focus();
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
      fillCurrentTargetValue(value);
      onFieldFilled(fieldKey);
    }

    function syncTarget(target) {
      if (fillInProgress) return;
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
        if (event.target.closest("[data-role]")) {
          holdFocusOutSync();
          event.preventDefault();
        }
      });

      smartButton.addEventListener("mouseenter", function () {
        setSmartButtonExpanded(true);
      });

      smartButton.addEventListener("mouseleave", function () {
        setSmartButtonExpanded(false);
        closeRecommendationPanel();
      });

      smartButton.addEventListener("focusin", function () {
        setSmartButtonExpanded(true);
      });

      smartButton.addEventListener("focusout", function () {
        setSmartButtonExpanded(false);
        win.setTimeout(function () {
          if (smartButton && typeof smartButton.contains === "function" && smartButton.contains(doc.activeElement)) return;
          closeRecommendationPanel();
        }, 0);
      });

      smartButton.addEventListener("click", function (event) {
        const trigger = event.target.closest("[data-role]");
        if (!trigger) return;
        const role = trigger.getAttribute("data-role");
        if (role === "smart-fill-item") {
          closeRecommendationPanel();
          fillCurrentTarget(trigger.getAttribute("data-key"));
          return;
        }
        if (role === "smart-fill-recommend-trigger") {
          toggleRecommendationPanel();
          return;
        }
        if (role === "smart-fill-recommend-item") {
          fillRecommendedValue(trigger.getAttribute("data-id"));
          return;
        }
        if (role === "smart-fill-open-data-manager") {
          openDataManagerPage();
          return;
        }
        if (role === "smart-fill-trigger") {
          if (!activeSmartFieldKey) {
            setSmartButtonExpanded(true);
            return;
          }
          closeRecommendationPanel();
          fillCurrentTarget(activeSmartFieldKey);
        }
      });

      smartButton.addEventListener("keydown", function (event) {
        if (!recommendationOpen) return;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveRecommendationFocus(1);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          moveRecommendationFocus(-1);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeRecommendationPanel();
          setSmartButtonExpanded(true);
        }
      });
    }

    return {
      fillTarget,
      hide: hideSmartButton,
      isInteractionTarget(node) {
        return !!(smartButton && node && typeof smartButton.contains === "function" && smartButton.contains(node));
      },
      mount,
      refreshPosition,
      resolveManualOverrideTarget,
      setContextTarget,
      shouldPreserveOnFocusOut() {
        return preserveFocusOut || recommendationOpen || recommendationLoading;
      },
      syncTarget
    };
  }

  const api = {
    MAX_RECOMMENDATION_ITEMS,
    buildRecommendationItems,
    createContentScriptSmartFillController
  };

  rootScope.ChromeTestDataContentScriptSmartFill = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
