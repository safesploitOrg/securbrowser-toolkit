import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { SEVENZIP_VENDOR } from "./sevenzip-vendor-config.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINATION = resolve(ROOT, SEVENZIP_VENDOR.destination);
const MANIFEST_PATH = join(DESTINATION, "manifest.json");
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_SIGNATURE = 0x04034b50;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function findEndOfCentralDirectory(zip) {
  const minimumOffset = Math.max(0, zip.length - 65_557);
  for (let offset = zip.length - 22; offset >= minimumOffset; offset -= 1) {
    if (zip.readUInt32LE(offset) === ZIP_EOCD_SIGNATURE) {
      return offset;
    }
  }
  throw new Error("Downloaded sevenzip-wasm asset is not a supported ZIP archive.");
}

function extractZip(zip) {
  const eocdOffset = findEndOfCentralDirectory(zip);
  const entryCount = zip.readUInt16LE(eocdOffset + 10);
  const centralSize = zip.readUInt32LE(eocdOffset + 12);
  const centralOffset = zip.readUInt32LE(eocdOffset + 16);

  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 release assets are not supported by this vendor script.");
  }

  const entries = new Map();
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (zip.readUInt32LE(offset) !== ZIP_CENTRAL_SIGNATURE) {
      throw new Error("Invalid sevenzip-wasm ZIP central directory.");
    }

    const flags = zip.readUInt16LE(offset + 8);
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const uncompressedSize = zip.readUInt32LE(offset + 24);
    const filenameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const filename = zip.subarray(offset + 46, offset + 46 + filenameLength).toString("utf8");

    if ((flags & 0x1) !== 0) {
      throw new Error(`Unexpected encrypted file inside release ZIP: ${filename}`);
    }
    if (![0, 8].includes(method)) {
      throw new Error(`Unsupported ZIP compression method ${method} for ${filename}.`);
    }
    if (zip.readUInt32LE(localOffset) !== ZIP_LOCAL_SIGNATURE) {
      throw new Error(`Invalid local ZIP header for ${filename}.`);
    }

    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const localExtraLength = zip.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = zip.subarray(dataOffset, dataOffset + compressedSize);
    const bytes = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed);

    if (bytes.length !== uncompressedSize) {
      throw new Error(`Uncompressed size mismatch for ${filename}.`);
    }

    entries.set(filename, bytes);
    offset += 46 + filenameLength + extraLength + commentLength;
  }

  if (offset !== centralOffset + centralSize) {
    throw new Error("sevenzip-wasm ZIP central-directory size mismatch.");
  }

  return entries;
}

async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "securbrowser-toolkit-vendor-fetch/2.1.0" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function existingBuildMatches() {
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    if (
      manifest.vendor !== SEVENZIP_VENDOR.name ||
      manifest.release !== SEVENZIP_VENDOR.release ||
      manifest.sevenZipVersion !== SEVENZIP_VENDOR.sevenZipVersion ||
      manifest.sourceCommit !== SEVENZIP_VENDOR.sourceCommit ||
      manifest.releaseAsset?.sha256 !== SEVENZIP_VENDOR.assetSha256
    ) {
      return false;
    }

    for (const file of SEVENZIP_VENDOR.files) {
      const bytes = await readFile(join(DESTINATION, file.outputName));
      if (sha256(bytes) !== manifest.assets?.[file.outputName]?.sha256) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

await mkdir(DESTINATION, { recursive: true });

if (await existingBuildMatches()) {
  console.log(
    `PASS: ${SEVENZIP_VENDOR.name} ${SEVENZIP_VENDOR.release} vendor assets already match the pinned release.`,
  );
  process.exit(0);
}

console.log(`Fetching pinned ${SEVENZIP_VENDOR.name} ${SEVENZIP_VENDOR.release} release asset…`);
const releaseZip = await fetchBytes(SEVENZIP_VENDOR.assetUrl);
const releaseSha = sha256(releaseZip);
if (releaseSha !== SEVENZIP_VENDOR.assetSha256) {
  throw new Error(
    `sevenzip-wasm release integrity check failed: expected SHA-256 ${SEVENZIP_VENDOR.assetSha256}, received ${releaseSha}.`,
  );
}

const entries = extractZip(releaseZip);
const selected = {};
for (const file of SEVENZIP_VENDOR.files) {
  const bytes = entries.get(file.sourcePath);
  if (!bytes) {
    throw new Error(`Pinned sevenzip-wasm release does not contain ${file.sourcePath}.`);
  }
  selected[file.outputName] = bytes;
}

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
