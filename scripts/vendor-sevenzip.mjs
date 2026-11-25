import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CACHE_PATH, sha256, verifiedRuntimeFiles } from "./vendor-release.mjs";
import { SEVENZIP_VENDOR } from "./sevenzip-vendor-config.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINATION = resolve(ROOT, SEVENZIP_VENDOR.destination);
const MANIFEST_PATH = join(DESTINATION, "manifest.json");
async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "securbrowser-toolkit-vendor-fetch/2.2.0-rc.2" },
    redirect: "follow",
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 10 * 1024 * 1024) throw new Error("Vendor ZIP exceeded size budget.");
  return bytes;
}

// Cache the complete pinned release outside /public; authenticate it on every reuse.
const cache = resolve(ROOT, CACHE_PATH);
let releaseZip;
try {
  releaseZip = await readFile(cache);
  verifiedRuntimeFiles(releaseZip);
} catch {
  console.log(`Fetching pinned ${SEVENZIP_VENDOR.name} ${SEVENZIP_VENDOR.release} release asset…`);
  releaseZip = await fetchBytes(SEVENZIP_VENDOR.assetUrl);
  verifiedRuntimeFiles(releaseZip);
  await mkdir(dirname(cache), { recursive: true });
  await writeFile(cache, releaseZip, { mode: 0o600 });
}
const selected = verifiedRuntimeFiles(releaseZip);
await mkdir(DESTINATION, { recursive: true });

const temporaryFiles = [];
try {
  for (const [name, bytes] of Object.entries(selected)) {
    const temporary = join(DESTINATION, `.${name}.tmp`);
    temporaryFiles.push(temporary);
    await writeFile(temporary, bytes, { mode: 0o644 });
    await rename(temporary, join(DESTINATION, name));
  }
} finally {
  await Promise.all(temporaryFiles.map((path) => rm(path, { force: true }).catch(() => {})));
}

const manifest = {
  vendor: SEVENZIP_VENDOR.name,
  release: SEVENZIP_VENDOR.release,
  sevenZipVersion: SEVENZIP_VENDOR.sevenZipVersion,
  repository: SEVENZIP_VENDOR.repository,
  sourceCommit: SEVENZIP_VENDOR.sourceCommit,
  generatedBy: "scripts/vendor-sevenzip.mjs",
  releaseAsset: {
    name: SEVENZIP_VENDOR.assetName,
    url: SEVENZIP_VENDOR.assetUrl,
    sha256: SEVENZIP_VENDOR.assetSha256,
  },
  assets: Object.fromEntries(
    Object.entries(selected).map(([name, bytes]) => [name, { sha256: sha256(bytes) }]),
  ),
};
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(
  `PASS: ${SEVENZIP_VENDOR.name} ${SEVENZIP_VENDOR.release} (7-Zip ${SEVENZIP_VENDOR.sevenZipVersion}) is ready in ${SEVENZIP_VENDOR.destination}.`,
);
