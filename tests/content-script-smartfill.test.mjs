import test from "node:test";
import assert from "node:assert/strict";
import smartfillControllerPkg from "../extension/src/content-script-smartfill.js";

const { createContentScriptSmartFillController } = smartfillControllerPkg;

test("star action adds the current page to favorites and fills yellow when already saved", async () => {
  const listeners = {};
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
  const controller = createContentScriptSmartFillController({
    document,
    editableTargetApi: {
      findEditableTarget(node) {
        return node === target ? target : null;
      }
    },
    getVisibleFieldKeys() {
      return ["mobile"];
    },
    iconAssetsApi: {
      renderIconMarkup(icon, className, label) {
        return '<i data-icon="' + icon + '" class="' + className + '" aria-label="' + label + '"></i>';
      }
    },
    onAddCurrentPageToFavorites() {
      addCalls += 1;
      return Promise.resolve(true);
    },
    isCurrentPageFavorite() {
      return Promise.resolve(true);
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

  assert.match(smartButton.innerHTML, /data-favorite="true"/);
  assert.match(smartButton.innerHTML, /aria-label="已加入常用"/);
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

  assert.match(smartButton.innerHTML, /data-role="smart-fill-add-favorite"/);
  assert.match(smartButton.innerHTML, /data-favorite="true"/);
  assert.doesNotMatch(smartButton.innerHTML, /recommend|推荐数据/);
  assert.equal(addCalls, 1);
});
