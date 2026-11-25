export const PREFERENCES_KEY = "securbrowser.preferences.v1";
const APPEARANCES = new Set(["system", "light", "dark"]);
export const DEFAULT_APPEARANCE = "system";

export function validAppearance(value) {
  return APPEARANCES.has(value) ? value : DEFAULT_APPEARANCE;
}

export function readAppearance(getStorage) {
  try {
    const raw = getStorage().getItem(PREFERENCES_KEY);
    if (typeof raw !== "string" || raw.length > 256) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw);
    return validAppearance(parsed?.appearance);
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(getStorage, value) {
  const appearance = validAppearance(value);
  try {
    if (appearance === DEFAULT_APPEARANCE) getStorage().removeItem(PREFERENCES_KEY);
    else getStorage().setItem(PREFERENCES_KEY, JSON.stringify({ appearance }));
  } catch {
    // Storage is optional; the current document can still use the preference.
  }
  return appearance;
}
