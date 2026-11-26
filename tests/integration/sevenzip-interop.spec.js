import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const WORK_DIR = process.env.SBT_INTEROP_DIR;
const PASSPHRASE = process.env.SBT_TEST_PASSPHRASE;
const WRONG = process.env.SBT_WRONG_PASSPHRASE;

async function fixturePaths(root, relative = "") {
  const files = [];
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await fixturePaths(root, path));
    else files.push(path);
  }
  return files.sort();
}

test("native 7-Zip and browser WASM exchange real header-encrypted archives", async ({ page }) => {
  if (!WORK_DIR || !PASSPHRASE || !WRONG) throw new Error("Run scripts/test-7z-interop.sh to supply synthetic native fixtures.");
  const expected = [
    "fixture/@literal.txt",
    "fixture/empty.bin",
    "fixture/nested/binary.dat",
    "fixture/nested/caf\u00e9.txt",
    "fixture/notes.txt",
  ];
  // An independent manifest catches malformed fixtures before browser execution.
  expect(await fixturePaths(WORK_DIR, "fixture")).toEqual(expected);
  await page.goto("/");
  await page.locator("#tab-tool-archive").click();
  await page.locator("#archive-create-folder").setInputFiles(join(WORK_DIR, "fixture"));
  await expect(page.locator("#archive-create-file-list li")).toHaveCount(expected.length);
  await page.locator("#archive-create-passphrase").fill(PASSPHRASE);
  await page.locator("#archive-create-confirm").fill(PASSPHRASE);
  await page.locator("#archive-create-submit").click();
  await expect(page.locator("#archive-create-status")).toContainText("filename protection verified");
  const browserDownload = page.waitForEvent("download");
  await page.locator("#archive-create-download").click();
  await (await browserDownload).saveAs(join(WORK_DIR, "browser.7z"));

  await page.locator("#tab-archive-extract").click();
  await page.locator("#archive-extract-file").setInputFiles(join(WORK_DIR, "native.7z"));
  await page.locator("#archive-extract-passphrase").fill(WRONG);
  await page.locator("#archive-extract-submit").click();
  await expect(page.locator("#archive-extract-status")).toHaveAttribute("data-type", "error");
  await expect(page.locator("#archive-extract-results")).toBeHidden();
  await page.locator("#archive-extract-passphrase").fill(PASSPHRASE);
  await page.locator("#archive-extract-submit").click();
  await expect(page.locator("#archive-extract-status")).toHaveAttribute("data-type", "success");
  const rows = page.locator("#archive-extract-list li");
  await expect(rows).toHaveCount(expected.length);
  for (const path of expected) {
    const row = rows.filter({ has: page.getByText(path, { exact: true }) });
    await expect(row).toHaveCount(1);
    const download = page.waitForEvent("download");
    await row.getByRole("link").click();
    const actual = await readFile(await (await download).path());
    expect(actual).toEqual(await readFile(join(WORK_DIR, path)));
  }
  await page.locator("#archive-extract-file").setInputFiles(join(WORK_DIR, "truncated.7z"));
  await page.locator("#archive-extract-submit").click();
  await expect(page.locator("#archive-extract-status")).toHaveAttribute("data-type", "error");
  await expect(page.locator("#archive-extract-results")).toBeHidden();
});

async function createSingleArchive(page, source, expectedSize, compressionLevel, output) {
  await page.goto("/");
  await page.locator("#tab-tool-archive").click();
  // Select an individual file, not a directory with an extra header item.
  await page.locator("#archive-create-files").setInputFiles(source);
  await expect(page.locator("#archive-create-file-list li")).toHaveCount(1);
  expect((await readFile(source)).length).toBe(expectedSize);
  await page.locator("#archive-compression").selectOption(String(compressionLevel));
  await page.locator("#archive-create-passphrase").fill(PASSPHRASE);
  await page.locator("#archive-create-confirm").fill(PASSPHRASE);
  await page.locator("#archive-create-submit").click();
  await expect(page.locator("#archive-create-status")).toHaveAttribute("data-type", "success");
  await expect(page.locator("#archive-create-status")).toContainText("filename protection verified");
  const download = page.waitForEvent("download");
  await page.locator("#archive-create-download").click();
  await (await download).saveAs(output);
}

for (const level of [0, 3, 5, 9]) {
  test(`single 154-byte extensionless file, compression ${level}, native-verifiable output`, async ({ page }) => {
    await createSingleArchive(page, join(WORK_DIR, "single-config/config"), 154, level, join(WORK_DIR, `browser-single-${level}.7z`));
  });
}

test("single empty file creates a protected archive without padding entries", async ({ page }) => {
  await createSingleArchive(page, join(WORK_DIR, "single-empty/empty.bin"), 0, 5, join(WORK_DIR, "browser-empty.7z"));
});

for (const { archive, name, source } of [
  { archive: "native-single.7z", name: "config", source: "single-config/config" },
  { archive: "native-empty.7z", name: "empty.bin", source: "single-empty/empty.bin" },
]) {
  test(`native single-item archive ${name}: reject wrong password and recover exact bytes`, async ({ page }) => {
    await page.goto("/");
    await page.locator("#tab-tool-archive").click();
    await page.locator("#tab-archive-extract").click();
    await page.locator("#archive-extract-file").setInputFiles(join(WORK_DIR, archive));
    await page.locator("#archive-extract-passphrase").fill(WRONG);
    await page.locator("#archive-extract-submit").click();
    await expect(page.locator("#archive-extract-status")).toHaveAttribute("data-type", "error");
    await expect(page.locator("#archive-extract-results")).toBeHidden();
    await page.locator("#archive-extract-passphrase").fill(PASSPHRASE);
    await page.locator("#archive-extract-submit").click();
    await expect(page.locator("#archive-extract-status")).toHaveAttribute("data-type", "success");
    const rows = page.locator("#archive-extract-list li");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(name);
    const download = page.waitForEvent("download");
    await rows.first().getByRole("link").click();
    expect(await readFile(await (await download).path())).toEqual(await readFile(join(WORK_DIR, source)));
  });
}
