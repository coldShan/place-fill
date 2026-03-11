(function (rootScope) {
  "use strict";

  function createPanelState() {
    const state = {
      visible: false,
      collapsed: false
    };

    function snapshot() {
      return {
        visible: state.visible,
        collapsed: state.collapsed
      };
    }

    function toggleVisible() {
      state.visible = !state.visible;
      if (!state.visible) state.collapsed = false;
      return snapshot();
    }

    function toggleCollapsed() {
      if (!state.visible) state.visible = true;
      state.collapsed = !state.collapsed;
      return snapshot();
    }

    function expand() {
      state.visible = true;
      state.collapsed = false;
      return snapshot();
    }

    return {
      snapshot,
      toggleVisible,
      toggleCollapsed,
      expand
    };
  }

  const api = {
    createPanelState
  };

  rootScope.ChromeTestDataPanelState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
