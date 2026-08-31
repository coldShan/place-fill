(function (rootScope) {
  "use strict";

  const MAX_RECOMMENDATION_ITEMS = 10;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildRecommendationItems(fieldKey, favoriteProfiles) {
    if (!fieldKey || !Array.isArray(favoriteProfiles)) return [];
    return favoriteProfiles
      .map(function (entry) {
        const profile = entry && entry.profile && typeof entry.profile === "object" ? entry.profile : null;
        const primaryText = profile && typeof profile[fieldKey] === "string" ? profile[fieldKey].trim() : "";
        if (!primaryText) return null;
        const context = [profile.fullName, profile.companyName].map(function (value) {
          return typeof value === "string" ? value.trim() : "";
        }).filter(Boolean);
        return {
          id: String(entry && entry.id ? entry.id : ""),
          primaryText,
          secondaryText: context.join(" / ")
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
    const getCurrentPageFavorite = typeof opts.getCurrentPageFavorite === "function" ? opts.getCurrentPageFavorite : function () { return Promise.resolve(null); };
    const listRecommendedProfiles = typeof opts.listRecommendedProfiles === "function" ? opts.listRecommendedProfiles : function () { return Promise.resolve([]); };
    const onAddCurrentPageToFavorites = typeof opts.onAddCurrentPageToFavorites === "function" ? opts.onAddCurrentPageToFavorites : function () {};
    const onFieldFilled = typeof opts.onFieldFilled === "function" ? opts.onFieldFilled : function () {};
    const onRemoveFavorite = typeof opts.onRemoveFavorite === "function" ? opts.onRemoveFavorite : function () { return Promise.resolve(false); };
    const FOCUS_RING_FADE_OUT_MS = 120;

    let smartButton = null;
    let activeSmartTarget = null;
    let activeSmartFieldKey = null;
    let lastContextTarget = null;
    let focusTargetClearTimer = null;
    let focusTargetClearTarget = null;
    let fillInProgress = false;
    let currentFavoriteId = "";
    let favoriteStatusRequestId = 0;
    const favoriteByTarget = new WeakMap();
    let recommendationItems = [];
    let recommendationRequestId = 0;
    let preserveFocusOut = false;
    let preserveFocusOutTimer = null;

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

    function cancelFocusTargetMarkerClear(nextTarget) {
      if (!focusTargetClearTimer) return;
      win.clearTimeout(focusTargetClearTimer);
      if (focusTargetClearTarget && focusTargetClearTarget !== nextTarget) clearFocusTargetMarker(focusTargetClearTarget);
      focusTargetClearTimer = null;
      focusTargetClearTarget = null;
    }

    function scheduleFocusTargetMarkerClear(target) {
      cancelFocusTargetMarkerClear(target);
      if (!target) return;
      focusTargetClearTarget = target;
      focusTargetClearTimer = win.setTimeout(function () {
        if (target.getAttribute && target.getAttribute("data-ctdp-smartfocus-visible") === "true" && activeSmartTarget === target) return;
        clearFocusTargetMarker(target);
        focusTargetClearTimer = null;
        focusTargetClearTarget = null;
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
      cancelFocusTargetMarkerClear(target);
      if (activeSmartTarget && activeSmartTarget !== target) clearFocusTargetMarker(activeSmartTarget);
      if (!target || typeof target.setAttribute !== "function") return;
      if (target.style && typeof target.style.setProperty === "function") {
        target.style.setProperty("--ctdp-focus-radius", resolveFocusTargetRadius(target));
        target.style.setProperty("--ctdp-smartfocus-surface", resolveFocusTargetSurfaceColor(target));
      }
      target.setAttribute("data-ctdp-smartfocus-target", "true");
      target.setAttribute("data-ctdp-smartfocus-visible", "true");
    }

    function renderAddFavoriteTriggerMarkup() {
      const label = currentFavoriteId ? "从常用中移除" : "添加到常用";
      return [
        '<button class="ctdp-smartfill-favorite-trigger" type="button" data-role="smart-fill-add-favorite" data-favorite="' + String(!!currentFavoriteId) + '" aria-label="' + label + '" title="' + label + '">',
        '  ' + iconAssetsApi.renderIconMarkup("star", "ctdp-smartfill-favorite-icon", label),
        "</button>"
      ].join("");
    }

    function renderRecommendationPanelMarkup() {
      if (!recommendationItems.length) return "";
      return [
        '<section class="ctdp-smartfill-recommend-panel" data-role="smart-fill-recommend-panel" aria-label="常用数据">',
        '  <div class="ctdp-smartfill-recommend-title">常用数据</div>',
        '  <div class="ctdp-smartfill-recommend-list" data-role="smart-fill-recommend-list">',
        recommendationItems.map(function (item) {
          return [
            '<button class="ctdp-smartfill-recommend-item" type="button" data-role="smart-fill-recommend-item" data-id="' + escapeHtml(item.id) + '" aria-label="填充常用数据" title="' + escapeHtml(item.primaryText) + '">',
            '  <span class="ctdp-smartfill-recommend-item-primary">' + escapeHtml(item.primaryText) + "</span>",
            item.secondaryText ? '  <span class="ctdp-smartfill-recommend-item-secondary">' + escapeHtml(item.secondaryText) + "</span>" : "",
            "</button>"
          ].join("");
        }).join(""),
        "  </div>",
        "</section>"
      ].join("");
    }

    function renderSmartFillMenuMarkup(primaryFieldKey) {
      const triggerLabel = primaryFieldKey ? smartFillApi.formatSmartFillButtonLabel(primaryFieldKey) : "选择测试数据类型";
      const triggerIconName = primaryFieldKey ? smartFillApi.getFieldIconName(primaryFieldKey) : iconAssetsApi.PRIMARY_LOGO_ICON;
      return [
        '<button class="ctdp-smartfill-trigger" type="button" data-role="smart-fill-trigger" aria-label="' + triggerLabel + '" title="' + triggerLabel + '">',
        "  " + iconAssetsApi.renderIconMarkup(triggerIconName, "ctdp-smartfill-icon", triggerLabel),
        "</button>",
        '<div class="ctdp-smartfill-menu" data-role="smart-fill-menu">',
        renderAddFavoriteTriggerMarkup(),
        "</div>",
        renderRecommendationPanelMarkup()
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

    function renderSmartButton() {
      if (!smartButton) return;
      smartButton.innerHTML = renderSmartFillMenuMarkup(activeSmartFieldKey);
      scheduleSmartButtonPosition();
    }

    function readTargetValue(target) {
      if (!target) return "";
      if (typeof target.value === "string") return target.value;
      return typeof target.textContent === "string" ? target.textContent : "";
    }

    function setCurrentFavorite(id, render) {
      favoriteStatusRequestId += 1;
      currentFavoriteId = id ? String(id) : "";
      if (render !== false) renderSmartButton();
    }

    function rememberTargetFavorite(target, id) {
      if (!target || !id) return;
      favoriteByTarget.set(target, { id: String(id), value: readTargetValue(target) });
    }

    function getTargetFavoriteId(target) {
      const favorite = target && favoriteByTarget.get(target);
      return favorite && favorite.value === readTargetValue(target) ? favorite.id : "";
    }

    function forgetTargetFavorite(target, id) {
      const favorite = target && favoriteByTarget.get(target);
      if (favorite && (!id || favorite.id === id)) favoriteByTarget.delete(target);
    }

    function hideFocusTargetMarker() {
      if (!activeSmartTarget || typeof activeSmartTarget.removeAttribute !== "function") return;
      activeSmartTarget.removeAttribute("data-ctdp-smartfocus-visible");
      scheduleFocusTargetMarkerClear(activeSmartTarget);
    }

    function holdFocusOutSync() {
      preserveFocusOut = true;
      if (preserveFocusOutTimer) win.clearTimeout(preserveFocusOutTimer);
      preserveFocusOutTimer = win.setTimeout(function () {
        preserveFocusOut = false;
        preserveFocusOutTimer = null;
      }, 180);
    }

    function hideSmartButton() {
      if (!smartButton) return;
      setCurrentFavorite("", false);
      recommendationRequestId += 1;
      recommendationItems = [];
      smartButton.hidden = true;
      smartButton.setAttribute("data-visible", "false");
      hideFocusTargetMarker();
      activeSmartTarget = null;
      activeSmartFieldKey = null;
    }

    function refreshFavoriteState(target) {
      const requestId = favoriteStatusRequestId + 1;
      favoriteStatusRequestId = requestId;
      Promise.resolve(getCurrentPageFavorite()).then(function (favorite) {
        if (!smartButton || requestId !== favoriteStatusRequestId || activeSmartTarget !== target) return;
        const favoriteId = favorite && favorite.id ? String(favorite.id) : "";
        if (favoriteId) rememberTargetFavorite(target, favoriteId);
        setCurrentFavorite(favoriteId);
      }, function () {});
    }

    async function refreshRecommendationItems(target, fieldKey) {
      const requestId = recommendationRequestId + 1;
      recommendationRequestId = requestId;
      let favorites;
      try {
        favorites = await listRecommendedProfiles(getCurrentScope());
      } catch (_) {
        return;
      }
      if (requestId !== recommendationRequestId || activeSmartTarget !== target || activeSmartFieldKey !== fieldKey) return;
      const linkedFavorite = favoriteByTarget.get(target);
      if (linkedFavorite && !favorites.some(function (favorite) { return String(favorite && favorite.id || "") === linkedFavorite.id; })) {
        forgetTargetFavorite(target, linkedFavorite.id);
        if (currentFavoriteId === linkedFavorite.id) setCurrentFavorite("", false);
      }
      recommendationItems = buildRecommendationItems(fieldKey, favorites);
      renderSmartButton();
    }

    function showSmartButton(target, fieldKey, showRecommendations) {
      if (!smartButton || !target) return;
      if (!fieldKey || !smartFillApi.getSupportedFieldKeys(getVisibleFieldKeys()).includes(fieldKey)) {
        hideSmartButton();
        return;
      }
      if (activeSmartTarget && activeSmartTarget !== target) clearFocusTargetMarker(activeSmartTarget);
      activeSmartTarget = target;
      activeSmartFieldKey = fieldKey;
      setCurrentFavorite(getTargetFavoriteId(target), false);
      recommendationItems = [];
      recommendationRequestId += 1;
      smartButton.hidden = false;
      smartButton.setAttribute("data-visible", "true");
      syncFocusTargetMarker(target);
      renderSmartButton();
      smartButton.setAttribute("aria-label", fieldKey ? "智能填充" + smartFillApi.formatSmartFillButtonLabel(fieldKey) : "选择测试数据类型");
      smartButton.title = fieldKey ? smartFillApi.formatSmartFillButtonLabel(fieldKey) : "选择测试数据类型";
      scheduleSmartButtonPosition();
      if (!currentFavoriteId) refreshFavoriteState(target);
      if (showRecommendations !== false) refreshRecommendationItems(target, fieldKey);
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
      showSmartButton(target, smartFillApi.inferFieldKeyForSmartFill(target) || activeSmartFieldKey, false);
    }

    function fillCurrentTarget(fieldKey) {
      const value = getFieldValue(fieldKey);
      if (!fieldKey || typeof value !== "string") return;
      fillCurrentTargetValue(value);
      onFieldFilled(fieldKey);
    }

    function fillRecommendedValue(id) {
      const item = recommendationItems.find(function (entry) { return entry.id === id; });
      if (!item) return;
      const target = activeSmartTarget;
      fillCurrentTargetValue(item.primaryText);
      rememberTargetFavorite(target, item.id);
      setCurrentFavorite(item.id);
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

    function isInteractionTarget(node) {
      return !!(smartButton && node && typeof smartButton.contains === "function" && smartButton.contains(node));
    }

    function handleDocumentPointerDown(target) {
      if (!smartButton || smartButton.hidden || isInteractionTarget(target)) return;
      const editableTarget = editableTargetApi.findEditableTarget(target);
      if (editableTarget === activeSmartTarget) return;
      const focusedTarget = activeSmartTarget;
      hideSmartButton();
      if (focusedTarget === doc.activeElement && typeof focusedTarget.blur === "function") focusedTarget.blur();
    }

    function mount() {
      if (smartButton || !doc || !doc.documentElement) return;
      smartButton = doc.createElement("div");
      smartButton.className = "ctdp-smartfill";
      smartButton.hidden = true;
      smartButton.setAttribute("data-visible", "false");
      smartButton.setAttribute("aria-label", "智能填充当前字段");
      doc.documentElement.appendChild(smartButton);

      smartButton.addEventListener("mousedown", function (event) {
        if (event.target.closest("[data-role]")) {
          holdFocusOutSync();
          event.preventDefault();
        }
      });

      if (typeof doc.addEventListener === "function") doc.addEventListener("input", function (event) {
        if (fillInProgress) return;
        const target = editableTargetApi.findEditableTarget(event.target);
        if (!target || target !== activeSmartTarget) return;
        const favoriteId = getTargetFavoriteId(target);
        if (currentFavoriteId === favoriteId) return;
        setCurrentFavorite(favoriteId);
      });

      smartButton.addEventListener("click", function (event) {
        const trigger = event.target.closest("[data-role]");
        if (!trigger) return;
        const role = trigger.getAttribute("data-role");
        if (role === "smart-fill-add-favorite") {
          if (currentFavoriteId) {
            const favoriteId = currentFavoriteId;
            const favoriteTarget = activeSmartTarget;
            if (typeof win.confirm === "function" && !win.confirm("确认从常用中移除这组数据？")) return;
            Promise.resolve(onRemoveFavorite(favoriteId)).then(function (removed) {
              if (removed !== true) return;
              forgetTargetFavorite(favoriteTarget, favoriteId);
              if (!smartButton || smartButton.hidden || activeSmartTarget !== favoriteTarget || currentFavoriteId !== favoriteId) return;
              setCurrentFavorite("");
              refreshRecommendationItems(activeSmartTarget, activeSmartFieldKey);
            });
            return;
          }
          const favoriteTarget = activeSmartTarget;
          Promise.resolve(onAddCurrentPageToFavorites()).then(function (favorite) {
            if (!favorite || !favorite.id) return;
            rememberTargetFavorite(favoriteTarget, favorite.id);
            if (!smartButton || smartButton.hidden || activeSmartTarget !== favoriteTarget) return;
            setCurrentFavorite(favorite.id);
            refreshRecommendationItems(activeSmartTarget, activeSmartFieldKey);
          });
          return;
        }
        if (role === "smart-fill-recommend-item") {
          fillRecommendedValue(trigger.getAttribute("data-id"));
          return;
        }
        if (role === "smart-fill-trigger") {
          if (!activeSmartFieldKey) return;
          fillCurrentTarget(activeSmartFieldKey);
        }
      });
    }

    return {
      fillTarget,
      handleDocumentPointerDown,
      hide: hideSmartButton,
      isInteractionTarget,
      mount,
      refreshPosition,
      resolveManualOverrideTarget,
      setContextTarget,
      shouldPreserveOnFocusOut() {
        return preserveFocusOut;
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
