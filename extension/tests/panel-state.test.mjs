import test from "node:test";
import assert from "node:assert/strict";
import statePkg from "../src/panel-state.js";

const { createPanelState } = statePkg;

test("panel state toggles between hidden and expanded from toolbar action", () => {
  const state = createPanelState();

  let snap = state.snapshot();
  assert.equal(snap.visible, false);
  assert.equal(snap.collapsed, false);

  snap = state.toggleVisible();
  assert.equal(snap.visible, true);
  assert.equal(snap.collapsed, false);

  snap = state.toggleVisible();
  assert.equal(snap.visible, false);
  assert.equal(snap.collapsed, false);
});

test("panel state collapses to a dock and can expand back", () => {
  const state = createPanelState();

  state.toggleVisible();
  let snap = state.toggleCollapsed();
  assert.equal(snap.visible, true);
  assert.equal(snap.collapsed, true);

  snap = state.toggleCollapsed();
  assert.equal(snap.visible, true);
  assert.equal(snap.collapsed, false);
});

test("panel state can collapse directly when focus leaves the panel", () => {
  const state = createPanelState();

  state.toggleVisible();
  const snap = state.collapse();

  assert.equal(snap.visible, true);
  assert.equal(snap.collapsed, true);
});
