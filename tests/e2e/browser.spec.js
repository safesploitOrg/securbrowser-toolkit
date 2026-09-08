import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("encrypts and decrypts a file entirely in the browser", async ({ page }) => {
  const original = Buffer.from("SecurBrowser browser round-trip\n", "utf8");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Encrypt files without uploading them." })).toBeVisible();

  await page.locator("#encrypt-file").setInputFiles({
    name: "fixture.txt",
    mimeType: "text/plain",
    buffer: original,
  });
  await page.locator("#encrypt-passphrase").fill("browser test passphrase");
  await page.locator("#encrypt-confirm").fill("browser test passphrase");
  await page.getByRole("button", { name: "Encrypt file" }).click();
  await expect(page.locator("#encrypt-status")).toContainText("AES-256-GCM");

  const encryptedDownload = page.waitForEvent("download");
  await page.locator("#encrypt-download").click();
  const encrypted = await encryptedDownload;
  const encryptedPath = await encrypted.path();
  expect(encryptedPath).not.toBeNull();

  await page.getByRole("tab", { name: /Decrypt/ }).click();
  await page.locator("#decrypt-file").setInputFiles(encryptedPath);
  await page.locator("#decrypt-passphrase").fill("browser test passphrase");
  await page.getByRole("button", { name: "Decrypt file" }).click();
  await expect(page.locator("#decrypt-status")).toContainText("Authenticated v2 file decrypted successfully");

  const decryptedDownload = page.waitForEvent("download");
  await page.locator("#decrypt-download").click();
  const decrypted = await decryptedDownload;
  const decryptedPath = await decrypted.path();
  expect(decryptedPath).not.toBeNull();
  expect(await readFile(decryptedPath)).toEqual(original);
});

test("rejects an incorrect passphrase for v2 files", async ({ page }) => {
  await page.goto("/");
  await page.locator("#encrypt-file").setInputFiles({
    name: "secret.bin",
    mimeType: "application/octet-stream",
    buffer: Buffer.from([0, 1, 2, 3, 4, 5]),
  });
  await page.locator("#encrypt-passphrase").fill("correct passphrase");
  await page.locator("#encrypt-confirm").fill("correct passphrase");
  await page.getByRole("button", { name: "Encrypt file" }).click();

  const encryptedDownload = page.waitForEvent("download");
  await page.locator("#encrypt-download").click();
  const encryptedPath = await (await encryptedDownload).path();

  await page.getByRole("tab", { name: /Decrypt/ }).click();
  await page.locator("#decrypt-file").setInputFiles(encryptedPath);
  await page.locator("#decrypt-passphrase").fill("incorrect passphrase");
  await page.getByRole("button", { name: "Decrypt file" }).click();

  await expect(page.locator("#decrypt-status")).toContainText("passphrase may be wrong");
  await expect(page.locator("#decrypt-download")).toBeHidden();
});

test("exposes accessible operation tabs and form labels", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("tab", { name: /Encrypt/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: /Decrypt/ }).click();
  await expect(page.getByRole("tab", { name: /Decrypt/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#decrypt-passphrase")).toBeVisible();
});
