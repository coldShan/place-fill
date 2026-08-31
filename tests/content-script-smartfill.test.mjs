import test from "node:test";
import assert from "node:assert/strict";
import smartfillControllerPkg from "../extension/src/content-script-smartfill.js";

const { buildRecommendationItems, createContentScriptSmartFillController, MAX_RECOMMENDATION_ITEMS } = smartfillControllerPkg;

function createFavorite(id, profile) {
  return { id, profile: { account: "", companyName: "", fullName: "", mobile: "", ...profile } };
}

test("favorite recommendations keep matching values and context", () => {
  const favorites = Array.from({ length: 12 }, function (_value, index) {
    return createFavorite("mobile-" + index, {
      companyName: index === 0 ? "星海科技" : "",
      fullName: "用户" + index,
      mobile: "133000000" + String(index).padStart(2, "0")
    });
  });
  favorites.splice(1, 0, createFavorite("empty", { mobile: "" }));

  const items = buildRecommendationItems("mobile", favorites);

  assert.equal(items.length, MAX_RECOMMENDATION_ITEMS);
  assert.deepEqual(items[0], {
    id: "mobile-0",
    primaryText: "13300000000",
    secondaryText: "用户0 / 星海科技"
  });
  assert.doesNotMatch(items.map(function (item) { return item.id; }).join(","), /empty/);
});

test("switching inputs clears the previous recognition effect", () => {
  const timers = new Map();
  let timerId = 0;
  const smartButton = {
    children: [{ offsetHeight: 42, offsetWidth: 42 }],
    hidden: true,
    innerHTML: "",
    style: {},
    addEventListener() {},
    contains() {
      return false;
    },
    setAttribute() {}
  };
  const document = {
    activeElement: null,
    addEventListener() {},
    createElement() {
      return smartButton;
    },
    documentElement: {
      clientHeight: 720,
      clientWidth: 1280,
      appendChild() {}
    }
  };
  function createTarget() {
    const attributes = new Map();
    return {
      attributes,
      nodeType: 1,
      parentElement: null,
      style: {
        removeProperty() {},
        setProperty() {}
      },
      getAttribute(name) {
        return attributes.get(name) || null;
      },
      getBoundingClientRect() {
        return { height: 40, right: 400, top: 100 };
      },
      removeAttribute(name) {
        attributes.delete(name);
      },
      setAttribute(name, value) {
        attributes.set(name, value);
      }
    };
  }
  const firstTarget = createTarget();
  const secondTarget = createTarget();
  const controller = createContentScriptSmartFillController({
    document,
    editableTargetApi: {
      findEditableTarget(target) {
        return target === firstTarget || target === secondTarget ? target : null;
      }
    },
    getVisibleFieldKeys() {
      return ["fullName"];
    },
    iconAssetsApi: {
      PRIMARY_LOGO_ICON: "logo",
      renderIconMarkup() {
        return "";
      }
    },
    listRecommendedProfiles() {
      return Promise.resolve([]);
    },
    smartFillApi: {
      formatSmartFillButtonLabel() {
        return "姓名";
      },
      getFieldIconName() {
        return "user";
      },
      getSupportedFieldKeys() {
        return ["fullName"];
      },
      inferFieldKeyForSmartFill() {
        return "fullName";
      }
    },
    window: {
      clearTimeout(id) {
        timers.delete(id);
      },
      getComputedStyle() {
        return { backgroundColor: "rgb(255, 255, 255)", borderRadius: "8px" };
      },
      innerHeight: 720,
      innerWidth: 1280,
      pageXOffset: 0,
      pageYOffset: 0,
      requestAnimationFrame(callback) {
        callback();
      },
      setTimeout(callback) {
        timerId += 1;
        timers.set(timerId, callback);
        return timerId;
      }
    }
  });

  controller.mount();
  controller.syncTarget(firstTarget);
  controller.handleDocumentPointerDown(secondTarget);
  controller.syncTarget(secondTarget);

  assert.equal(firstTarget.getAttribute("data-ctdp-smartfocus-target"), null);
  assert.equal(firstTarget.getAttribute("data-ctdp-smartfocus-visible"), null);
  assert.equal(secondTarget.getAttribute("data-ctdp-smartfocus-target"), "true");
  assert.equal(secondTarget.getAttribute("data-ctdp-smartfocus-visible"), "true");
});

test("yellow favorite star confirms removal and can add the page again", async () => {
  const listeners = {};
  const documentListeners = {};
  const smartButton = {
    children: [{ offsetHeight: 42, offsetWidth: 42 }],
    hidden: true,
    innerHTML: "",
    style: {},
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    contains() {
      return false;
    },
    setAttribute() {}
  };
  const document = {
    activeElement: null,
    addEventListener(type, listener) {
      documentListeners[type] = listener;
    },
    createElement() {
      return smartButton;
    },
    documentElement: {
      clientHeight: 720,
      clientWidth: 1280,
      appendChild() {}
    }
  };
  const target = {
    nodeType: 1,
    parentElement: null,
    value: "",
    style: {
      removeProperty() {},
      setProperty() {}
    },
    getAttribute() {
      return "true";
    },
    getBoundingClientRect() {
      return { height: 40, right: 400, top: 100 };
    },
    removeAttribute() {},
    setAttribute() {}
  };
  let addCalls = 0;
  let confirmRemoval = false;
  let delayFavoriteLookup = false;
  let resolveFavoriteLookup = null;
  let filledValue = "";
  let favorites = [createFavorite("saved-mobile", { fullName: "张三", mobile: "13800138000" })];
  const removeCalls = [];
  const controller = createContentScriptSmartFillController({
    document,
    editableTargetApi: {
      findEditableTarget(node) {
        return node === target ? target : null;
      },
      fillEditableTarget(_target, value) {
        _target.value = value;
        filledValue = value;
      }
    },
    getVisibleFieldKeys() {
      return ["mobile"];
    },
    getCurrentScope() {
      return "localhost";
    },
    iconAssetsApi: {
      renderIconMarkup(icon, className, label) {
        return '<i data-icon="' + icon + '" class="' + className + '" aria-label="' + label + '"></i>';
      }
    },
    onAddCurrentPageToFavorites() {
      addCalls += 1;
      const favorite = createFavorite("added-page", { mobile: "13800138000" });
      favorites = [favorite];
      return Promise.resolve(favorite);
    },
    getCurrentPageFavorite() {
      if (delayFavoriteLookup) return new Promise(function (resolve) { resolveFavoriteLookup = resolve; });
      return Promise.resolve(null);
    },
    onRemoveFavorite(id) {
      removeCalls.push(id);
      favorites = favorites.filter(function (favorite) { return favorite.id !== id; });
      return Promise.resolve(true);
    },
    listRecommendedProfiles() {
      return Promise.resolve(favorites);
    },
    smartFillApi: {
      formatSmartFillButtonLabel() {
        return "手机号";
      },
      getFieldIconName() {
        return "smartphone";
      },
      getSupportedFieldKeys() {
        return ["mobile"];
      },
      inferFieldKeyForSmartFill() {
        return "mobile";
      }
    },
    window: {
      clearTimeout() {},
      confirm() {
        return confirmRemoval;
      },
      getComputedStyle() {
        return { backgroundColor: "rgb(255, 255, 255)", borderRadius: "8px" };
      },
      innerHeight: 720,
      innerWidth: 1280,
      pageXOffset: 0,
      pageYOffset: 0,
      requestAnimationFrame(callback) {
        callback();
      },
      setTimeout() {
        return 1;
      }
    }
  });

  controller.mount();
  controller.syncTarget(target);
  await Promise.resolve();
  await Promise.resolve();

  assert.match(smartButton.innerHTML, /data-favorite="false"/);
  assert.match(smartButton.innerHTML, /data-role="smart-fill-recommend-panel"/);
  assert.match(smartButton.innerHTML, /13800138000/);
  assert.match(smartButton.innerHTML, /张三/);
  listeners.click({
    target: {
      closest() {
        return {
          getAttribute(name) {
            return name === "data-role" ? "smart-fill-recommend-item" : "saved-mobile";
          }
        };
      }
    }
  });
  await Promise.resolve();
  assert.equal(filledValue, "13800138000");
  assert.match(smartButton.innerHTML, /data-role="smart-fill-add-favorite"/);
  assert.match(smartButton.innerHTML, /data-favorite="true"/);
  assert.match(smartButton.innerHTML, /aria-label="从常用中移除"/);
  controller.hide();
  controller.syncTarget(target);
  await Promise.resolve();
  await Promise.resolve();
  assert.match(smartButton.innerHTML, /data-favorite="true"/);
  assert.match(smartButton.innerHTML, /aria-label="从常用中移除"/);
  listeners.click({
    target: {
      closest() {
        return {
          getAttribute() {
            return "smart-fill-add-favorite";
          }
        };
      }
    }
  });
  await Promise.resolve();

  assert.deepEqual(removeCalls, []);
  assert.match(smartButton.innerHTML, /data-favorite="true"/);

  confirmRemoval = true;
  listeners.click({
    target: {
      closest() {
        return {
          getAttribute() {
            return "smart-fill-add-favorite";
          }
        };
      }
    }
  });
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(removeCalls, ["saved-mobile"]);
  assert.match(smartButton.innerHTML, /data-favorite="false"/);
  assert.match(smartButton.innerHTML, /aria-label="添加到常用"/);
  assert.equal(addCalls, 0);

  delayFavoriteLookup = true;
  controller.hide();
  controller.syncTarget(target);
  await Promise.resolve();
  assert.equal(typeof resolveFavoriteLookup, "function");
  listeners.click({
    target: {
      closest() {
        return {
          getAttribute() {
            return "smart-fill-add-favorite";
          }
        };
      }
    }
  });
  await Promise.resolve();
  await Promise.resolve();
  delayFavoriteLookup = false;
  resolveFavoriteLookup(null);
  await Promise.resolve();

  assert.match(smartButton.innerHTML, /data-role="smart-fill-add-favorite"/);
  assert.match(smartButton.innerHTML, /data-favorite="true"/);
  assert.match(smartButton.innerHTML, /aria-label="从常用中移除"/);
  assert.equal(addCalls, 1);

  target.value = "13900139000";
  documentListeners.input({ target });
  assert.match(smartButton.innerHTML, /data-favorite="false"/);

  target.value = "13800138000";
  documentListeners.input({ target });
  assert.match(smartButton.innerHTML, /data-favorite="true"/);
  assert.match(smartButton.innerHTML, /aria-label="从常用中移除"/);

  favorites = [];
  controller.hide();
  controller.syncTarget(target);
  await Promise.resolve();
  await Promise.resolve();
  assert.match(smartButton.innerHTML, /data-favorite="false"/);
});
