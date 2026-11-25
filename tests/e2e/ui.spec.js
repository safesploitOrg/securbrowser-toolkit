import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const VIEWPORTS = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }];

for (const viewport of VIEWPORTS) {
  test(`responsive and accessible controls at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    for (const theme of ["light", "dark"]) {
      await page.locator("#appearance").selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      for (const tab of ["#tab-encrypt", "#tab-decrypt", "#tab-archive-create", "#tab-archive-extract"]) {
        await page.locator(tab.startsWith("#tab-archive") ? "#tab-tool-archive" : "#tab-tool-file").click();
        await page.locator(tab).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(result.violations).toEqual([]);
      }
    }
  });
}

test("system appearance follows OS and manual choice survives reload without task data", async ({ page }) => {
  const external = [];
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1:4173/") && !request.url().startsWith("blob:")) external.push(request.url()); });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#appearance")).toHaveValue("system");
  expect(await page.locator("html").evaluate((node) => getComputedStyle(node).colorScheme)).toBe("dark");
  await page.locator("#appearance").selectOption("light");
  await page.locator("#encrypt-passphrase").fill("synthetic password only");
  await page.reload();
  await expect(page.locator("#appearance")).toHaveValue("light");
  await expect(page.locator("#encrypt-passphrase")).toHaveValue("");
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual({ "securbrowser.preferences.v1": '{"appearance":"light"}' });
  await page.locator("#appearance").selectOption("system");
  await page.emulateMedia({ colorScheme: "light" });
  expect(await page.locator("html").evaluate((node) => getComputedStyle(node).colorScheme)).toBe("light");
  expect(external).toEqual([]);
  await expect(page.locator("footer a")).toHaveAttribute("href", "https://github.com/safesploitOrg/securbrowser-toolkit/");
  await expect(page.locator("#footer-year")).toHaveText(String(new Date().getFullYear()));
});

test("keyboard tab navigation, password toggle geometry and reset clear task state", async ({ page }) => {
  await page.goto("/");
  await page.locator("#tab-tool-file").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-tool-archive")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#tab-tool-file")).toBeFocused();
  const toggle = page.locator('[data-password-toggle="encrypt-passphrase"]');
  const before = await toggle.boundingBox();
  await toggle.click();
  expect(await toggle.boundingBox()).toEqual(before);
  await expect(page.locator("#encrypt-passphrase")).toHaveAttribute("type", "text");
  await page.locator("#reset-app").click();
  await expect(page.locator("#encrypt-passphrase")).toHaveAttribute("type", "password");
});
