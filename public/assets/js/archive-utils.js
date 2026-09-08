export const ARCHIVE_MIN_PASSPHRASE_LENGTH = 12;
export const MAX_ARCHIVE_INPUT_BYTES = 1024 * 1024 * 1024;
export const MAX_ARCHIVE_INPUT_ENTRIES = 2_000;
export const MAX_ARCHIVE_FILE_BYTES = 1024 * 1024 * 1024;
export const MAX_EXTRACTED_BYTES = 1024 * 1024 * 1024;
export const MAX_EXTRACTED_ENTRIES = 2_000;
export const SEVEN_ZIP_SIGNATURE = Uint8Array.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);

function extensionIndex(filename) {
  const index = filename.lastIndexOf(".");
  return index > 0 ? index : filename.length;
}

function uniquePath(path, usedPaths) {
  if (!usedPaths.has(path)) {
    usedPaths.add(path);
    return path;
  }

  const parts = path.split("/");
  const filename = parts.pop();
  const index = extensionIndex(filename);
  const stem = filename.slice(0, index);
  const extension = filename.slice(index);

  for (let counter = 2; counter < 10_000; counter += 1) {
    const candidateName = `${stem} (${counter})${extension}`;
    const candidate = [...parts, candidateName].join("/");
    if (!usedPaths.has(candidate)) {
      usedPaths.add(candidate);
      return candidate;
    }
  }

  throw new Error("Unable to create a unique archive path for the selected file.");
}

export function normaliseArchivePath(input) {
  if (typeof input !== "string") {
    throw new TypeError("Archive paths must be strings.");
  }

  if (/^[\\/]/.test(input) || /^[a-zA-Z]:[\\/]/.test(input)) {
    throw new Error("Absolute archive paths are not permitted.");
  }

  const cleaned = input.replaceAll("\\", "/");
  const parts = [];

  for (const part of cleaned.split("/")) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      throw new Error("Archive paths may not contain parent-directory traversal.");
    }

    if (part.includes("\0")) {
      throw new Error("Archive paths may not contain NUL characters.");
    }

    parts.push(part);
  }

  if (parts.length === 0) {
    throw new Error("Archive entry path is empty.");
  }

  const path = parts.join("/");
  if (/^[a-zA-Z]:/.test(path)) {
    throw new Error("Absolute drive paths are not permitted inside archives.");
  }

  return path;
}

export function appendArchiveFiles(existingEntries, files) {
  const entries = [...existingEntries];
  const usedPaths = new Set(entries.map((entry) => entry.path));

  for (const file of Array.from(files || [])) {
    if (!(file instanceof File)) {
      continue;
    }

    const rawPath = file.webkitRelativePath || file.name;
    const path = uniquePath(normaliseArchivePath(rawPath), usedPaths);
    entries.push({ file, path });
    if (entries.length > MAX_ARCHIVE_INPUT_ENTRIES) {
      throw new Error(`Archive creation is limited to ${MAX_ARCHIVE_INPUT_ENTRIES.toLocaleString()} files.`);
    }
  }

  return entries;
}

export function totalArchiveInputBytes(entries) {
  return entries.reduce((total, entry) => total + entry.file.size, 0);
}

export function archiveOutputFilename(input) {
  const raw = String(input || "")
    .trim()
    .replace(/\.7z$/i, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 180);
  const base = raw || "secure-files";
  return `${base}.7z`;
}

export function isSevenZipBytes(input) {
  const bytes =
    input instanceof Uint8Array
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : ArrayBuffer.isView(input)
          ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
          : null;

  if (!bytes || bytes.length < SEVEN_ZIP_SIGNATURE.length) {
    return false;
  }

  return SEVEN_ZIP_SIGNATURE.every((value, index) => bytes[index] === value);
}

export async function fileLooksLikeSevenZip(file) {
  if (!(file instanceof File)) {
    return false;
  }

  const header = new Uint8Array(await file.slice(0, SEVEN_ZIP_SIGNATURE.length).arrayBuffer());
  return isSevenZipBytes(header);
}

export function safeExtractedPath(input) {
  return normaliseArchivePath(input);
}
