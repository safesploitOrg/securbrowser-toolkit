import assert from "node:assert/strict";
import { test } from "node:test";
import { createOperationState } from "../../public/assets/js/operation-state.js";

test("one operation at a time; reset aborts and invalidates old results", () => {
  const state = createOperationState();
  const first = state.begin("encrypt");
  assert.ok(state.isCurrent(first));
  assert.equal(state.begin("extract"), null);
  assert.equal(state.cancel(), first);
  assert.ok(first.controller.signal.aborted);
  assert.equal(state.isCurrent(first), false);
  const second = state.begin("extract");
  assert.equal(state.finish(first), false);
  assert.equal(state.current(), second);
  assert.equal(state.finish(second), true);
  assert.equal(state.current(), null);
});
