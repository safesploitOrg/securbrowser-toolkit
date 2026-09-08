import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("encrypts and decrypts a file entirely in the browser", async ({ page }) => {
  const original = Buffer.from("SecurBrowser browser round-trip\n", "utf8");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Protect files without uploading them." })).toBeVisible();

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
  const encryptedPath = await (await encryptedDownload).path();
  expect(encryptedPath).not.toBeNull();

  await page.locator("#tab-decrypt").click();
  await page.locator("#decrypt-file").setInputFiles(encryptedPath);
  await page.locator("#decrypt-passphrase").fill("browser test passphrase");
  await page.getByRole("button", { name: "Decrypt file" }).click();
  await expect(page.locator("#decrypt-status")).toContainText(
    "Authenticated v2 file decrypted successfully",
  );

  const decryptedDownload = page.waitForEvent("download");
  await page.locator("#decrypt-download").click();
  const decryptedPath = await (await decryptedDownload).path();
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

  await page.locator("#tab-decrypt").click();
  await page.locator("#decrypt-file").setInputFiles(encryptedPath);
  await page.locator("#decrypt-passphrase").fill("incorrect passphrase");
  await page.getByRole("button", { name: "Decrypt file" }).click();

  await expect(page.locator("#decrypt-status")).toContainText("passphrase may be wrong");
  await expect(page.locator("#decrypt-download")).toBeHidden();
});

test("creates and extracts an encrypted 7z archive", async ({ page }) => {
  const firstContent = Buffer.from("first archive fixture\n", "utf8");
  const secondContent = Buffer.from([0, 1, 2, 3, 250, 251, 252]);
  const passphrase = "archive browser passphrase";

  await page.goto("/");
  await page.locator("#tab-tool-archive").click();
  await expect(page.getByRole("heading", { name: "Create an encrypted 7z archive" })).toBeVisible();

  await page.locator("#archive-create-files").setInputFiles([
    {
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: firstContent,
    },
    {
      name: "binary.dat",
      mimeType: "application/octet-stream",
      buffer: secondContent,
    },
  ]);
  await page.locator("#archive-name").fill("browser-archive-test");
  await page.locator("#archive-compression").selectOption("0");
  await page.locator("#archive-create-passphrase").fill(passphrase);
  await page.locator("#archive-create-confirm").fill(passphrase);
  await page.getByRole("button", { name: "Create secure 7z" }).click();
  await expect(page.locator("#archive-create-status")).toContainText("filename protection verified");

  const archiveDownload = page.waitForEvent("download");
  await page.locator("#archive-create-download").click();
  const archivePath = await (await archiveDownload).path();
  expect(archivePath).not.toBeNull();

  await page.locator("#tab-archive-extract").click();
  await page.locator("#archive-extract-file").setInputFiles(archivePath);

  await page.locator("#archive-extract-passphrase").fill("wrong archive passphrase");
  await page.getByRole("button", { name: "Decrypt and extract" }).click();
  await expect(page.locator("#archive-extract-status")).toContainText(
    "passphrase may be incorrect",
  );
  await expect(page.locator("#archive-extract-results")).toBeHidden();

  await page.locator("#archive-extract-passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Decrypt and extract" }).click();

  await expect(page.locator("#archive-extract-status")).toContainText(
    "Archive decrypted and extracted successfully",
  );
  await expect(page.locator("#archive-extract-list li")).toHaveCount(2);
  await expect(page.locator("#archive-extract-list")).toContainText("notes.txt");
  await expect(page.locator("#archive-extract-list")).toContainText("binary.dat");

  const notesItem = page.locator("#archive-extract-list li").filter({ hasText: "notes.txt" });
  const notesDownload = page.waitForEvent("download");
  await notesItem.getByRole("link").click();
  const notesPath = await (await notesDownload).path();
  expect(await readFile(notesPath)).toEqual(firstContent);
});

test("exposes accessible tool and operation tabs", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#tab-tool-file")).toHaveAttribute("aria-selected", "true");
  await page.locator("#tab-decrypt").click();
  await expect(page.locator("#tab-decrypt")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#decrypt-passphrase")).toBeVisible();

  await page.locator("#tab-tool-archive").click();
  await expect(page.locator("#tab-tool-archive")).toHaveAttribute("aria-selected", "true");
  await page.locator("#tab-archive-extract").click();
  await expect(page.locator("#archive-extract-passphrase")).toBeVisible();
});
