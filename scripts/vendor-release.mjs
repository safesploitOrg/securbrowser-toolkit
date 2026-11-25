import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { SEVENZIP_VENDOR } from "./sevenzip-vendor-config.mjs";

const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_SIGNATURE = 0x04034b50;

export function sha256(bytes) {
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

  if (entryCount > 100 || centralOffset + centralSize > eocdOffset) throw new Error("Invalid release ZIP central directory.");
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
    if (uncompressedSize > 16 * 1024 * 1024 || dataOffset + compressedSize > zip.length || entries.has(filename)) throw new Error("Release ZIP entry exceeds its bounds or duplicates a name.");
    const bytes = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: 16 * 1024 * 1024 });

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

export const CACHE_PATH = ".cache/sevenzip-wasm.zip";

export function verifiedRuntimeFiles(releaseZip) {
  if (releaseZip.length > 10 * 1024 * 1024 || sha256(releaseZip) !== SEVENZIP_VENDOR.assetSha256) throw new Error("7-Zip release ZIP failed the committed SHA-256 pin.");
  const entries = extractZip(releaseZip);
  return Object.fromEntries(SEVENZIP_VENDOR.files.map((file) => {
    const bytes = entries.get(file.sourcePath);
    if (!bytes) throw new Error(`Pinned release lacks ${file.sourcePath}.`);
    return [file.outputName, bytes];
  }));
}
