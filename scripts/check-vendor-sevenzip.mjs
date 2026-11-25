import { CACHE_PATH, sha256, verifiedRuntimeFiles } from "./vendor-release.mjs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SEVENZIP_VENDOR } from "./sevenzip-vendor-config.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINATION = resolve(ROOT, SEVENZIP_VENDOR.destination);

// The manifest is descriptive, not a trust root. Re-derive from the pinned ZIP.
const original = verifiedRuntimeFiles(await readFile(resolve(ROOT, CACHE_PATH)));

let manifest;
try {
  manifest = JSON.parse(await readFile(join(DESTINATION, "manifest.json"), "utf8"));
} catch {
  throw new Error("Missing sevenzip-wasm vendor manifest. Run `npm run build:public` first.");
}

if (
  manifest.vendor !== SEVENZIP_VENDOR.name ||
  manifest.release !== SEVENZIP_VENDOR.release ||
  manifest.sevenZipVersion !== SEVENZIP_VENDOR.sevenZipVersion ||
  manifest.sourceCommit !== SEVENZIP_VENDOR.sourceCommit ||
  manifest.releaseAsset?.sha256 !== SEVENZIP_VENDOR.assetSha256
) {
  throw new Error("sevenzip-wasm vendor manifest does not match the pinned release configuration.");
}

for (const file of SEVENZIP_VENDOR.files) {
  const bytes = await readFile(join(DESTINATION, file.outputName));
  const expected = sha256(original[file.outputName]);
  const actual = sha256(bytes);
  if (actual !== expected || manifest.assets?.[file.outputName]?.sha256 !== expected) {
    throw new Error(`Vendored sevenzip-wasm asset integrity mismatch for ${file.outputName}.`);
  }
  console.log(`PASS: ${file.outputName} matches verified release SHA-256 ${actual}.`);
}

console.log(
  `PASS: ${SEVENZIP_VENDOR.name} ${SEVENZIP_VENDOR.release} / 7-Zip ${SEVENZIP_VENDOR.sevenZipVersion} vendor set is verified.`,
);
