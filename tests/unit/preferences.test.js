import assert from "node:assert/strict";
import { test } from "node:test";
import { PREFERENCES_KEY, readAppearance, saveAppearance, validAppearance } from "../../public/assets/js/preferences.js";

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem(key) { assert.equal(key, PREFERENCES_KEY); return value; },
    setItem(key, data) { assert.equal(key, PREFERENCES_KEY); value = data; },
    removeItem(key) { assert.equal(key, PREFERENCES_KEY); value = null; },
  };
}

test("appearance defaults, allowed values, reload and reset", () => {
  const store = memoryStorage();
  const get = () => store;
  assert.equal(readAppearance(get), "system");
  assert.equal(saveAppearance(get, "dark"), "dark");
  assert.equal(readAppearance(get), "dark");
  assert.deepEqual(JSON.parse(store.getItem(PREFERENCES_KEY)), { appearance: "dark" });
  assert.equal(saveAppearance(get, "light"), "light");
  assert.equal(readAppearance(get), "light");
  assert.equal(saveAppearance(get, "system"), "system");
  assert.equal(store.getItem(PREFERENCES_KEY), null);
});

test("corrupt, oversized, unknown or inaccessible preference storage is safe", () => {
  for (const raw of ["{", "null", "[]", '{"appearance":"evil"}', "a".repeat(257)]) {
    assert.equal(readAppearance(() => memoryStorage(raw)), "system");
  }
  assert.equal(validAppearance({}), "system");
  const denied = () => { throw new Error("storage denied"); };
  assert.equal(readAppearance(denied), "system");
  assert.equal(saveAppearance(denied, "dark"), "dark");
});
