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

test.describe("system appearance", () => {
  // Configure the context before its page is created, including Firefox.
  test.use({ colorScheme: "dark", reducedMotion: "reduce" });
  test("system appearance follows OS and manual choice survives reload without task data", async ({ page }) => {
    const external = [];
    page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1:4173/") && !request.url().startsWith("blob:")) external.push(request.url()); });
    await page.goto("/");
    await expect(page.locator("#appearance")).toHaveValue("system");
    await expect.poll(() => page.evaluate(() => window.matchMedia("(prefers-color-scheme: dark)").matches)).toBe(true);
    await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
    await page.locator("#appearance").selectOption("light");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    await page.locator("#encrypt-passphrase").fill("synthetic password only");
    await page.reload();
    await expect(page.locator("#appearance")).toHaveValue("light");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    await expect(page.locator("#encrypt-passphrase")).toHaveValue("");
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual({ "securbrowser.preferences.v1": '{"appearance":"light"}' });
    await page.locator("#appearance").selectOption("system");
    await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => page.evaluate(() => window.matchMedia("(prefers-color-scheme: light)").matches)).toBe(true);
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => page.evaluate(() => window.matchMedia("(prefers-color-scheme: dark)").matches)).toBe(true);
    await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
    expect(external).toEqual([]);
    await expect(page.locator("footer a")).toHaveAttribute("href", "https://github.com/safesploitOrg/securbrowser-toolkit/");
    await expect(page.locator("#footer-year")).toHaveText(String(new Date().getFullYear()));
  });
});

test("keyboard tab navigation, password toggle geometry and reset clear task state", async ({ page }) => {
  await page.goto("/");
  await page.locator("#tab-tool-file").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-tool-archive")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#tab-tool-file")).toBeFocused();
  const toggle = page.locator('[data-password-toggle="encrypt-passphrase"]');
  await toggle.scrollIntoViewIfNeeded();
  // Use document coordinates: Playwright may scroll when clicking a control.
  const geometry = () => toggle.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return [rect.x + window.scrollX, rect.y + window.scrollY, rect.width, rect.height];
  });
  const before = await geometry();
  await toggle.click();
  await expect(page.locator("#encrypt-passphrase")).toHaveAttribute("type", "text");
  const after = await geometry();
  for (let i = 0; i < before.length; i += 1) {
    expect(Math.abs(after[i] - before[i])).toBeLessThanOrEqual(0.5);
  }
  await page.locator("#reset-app").click();
  await expect(page.locator("#encrypt-passphrase")).toHaveAttribute("type", "password");
});
