import { readAppearance, saveAppearance } from "./preferences.js";

const storage = () => window.localStorage;
const root = document.documentElement;
const selector = document.querySelector("#appearance");
const year = document.querySelector("#footer-year");

function apply(value) {
  root.dataset.theme = value;
  selector.value = value;
}

apply(readAppearance(storage));
selector.addEventListener("change", () => apply(saveAppearance(storage, selector.value)));
year.textContent = String(new Date().getFullYear());
