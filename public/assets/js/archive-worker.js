const VENDOR_SCRIPT_URL = new URL("../../vendor/sevenzip-wasm/sevenzip-wasm.js", self.location.href);
const VENDOR_WASM_URL = new URL("../../vendor/sevenzip-wasm/sevenzip-wasm.wasm", self.location.href);
const SEVEN_ZIP_SIGNATURE = Uint8Array.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
const DEFAULT_CAPTURED_LINES = 2_000;
const MAX_LISTING_LINES = 50_000;

class WorkerArchiveError extends Error {
  constructor(message, code = "ARCHIVE_WORKER_FAILED") {
    super(message);
    this.name = "WorkerArchiveError";
    this.code = code;
  }
}

let sevenZipLoaded = false;

function postProgress(stage, message, percent) {
  self.postMessage({ type: "progress", stage, message, percent });
}

function redact(value, passphrase) {
  const text = String(value ?? "");
  return passphrase ? text.split(passphrase).join("[redacted]") : text;
}

function loadSevenZipFactory() {
  if (!sevenZipLoaded) {
    try {
      self.importScripts(VENDOR_SCRIPT_URL.href);
      sevenZipLoaded = true;
    } catch (error) {
      console.error("Unable to load the local sevenzip-wasm runtime.", error);
      throw new WorkerArchiveError(
        "The local 7-Zip engine is unavailable. Build the public assets with `npm run build:public` before hosting the site.",
        "SEVEN_ZIP_VENDOR_UNAVAILABLE",
      );
    }
  }

  if (typeof self.SevenZipWasm !== "function") {
    throw new WorkerArchiveError(
      "The local 7-Zip engine did not initialise correctly.",
      "SEVEN_ZIP_VENDOR_UNAVAILABLE",
    );
  }

  return self.SevenZipWasm;
}

async function createSevenZipRuntime(passphrase = "", maxCapturedLines = DEFAULT_CAPTURED_LINES) {
  const factory = loadSevenZipFactory();
  const output = [];
  let exitCode = null;
  let abortReason = null;
  let outputOverflow = false;

  const capture = (line) => {
    if (output.length < maxCapturedLines) {
      output.push(redact(line, passphrase));
    } else {
      outputOverflow = true;
    }
  };

  const module = await factory({
    print: capture,
    printErr: capture,
    stdin: () => null,
    locateFile: (path) => (path.endsWith(".wasm") ? VENDOR_WASM_URL.href : path),
    onAbort: (reason) => {
      abortReason = redact(reason, passphrase);
    },
    onExit: (code) => {
      exitCode = Number(code) || 0;
    },
  });

  return {
    module,
    output,
    run(args) {
      exitCode = null;
      abortReason = null;
      let returnValue;

      try {
        returnValue = module.callMain(args);
      } catch (error) {
        if (typeof error?.status === "number") {
          exitCode = error.status;
        } else {
          throw error;
        }
      }

      if (outputOverflow) {
        throw new WorkerArchiveError(
          "7-Zip produced more metadata/output than the configured safety limit.",
          "ARCHIVE_METADATA_LIMIT",
        );
      }

      if (abortReason) {
        throw new WorkerArchiveError(
          `7-Zip aborted: ${abortReason}`,
          "SEVEN_ZIP_COMMAND_FAILED",
        );
      }

      if (exitCode === null && typeof returnValue === "number") {
        exitCode = returnValue;
      }

      const code = exitCode ?? 0;
      if (code !== 0) {
        throw new WorkerArchiveError(
          `7-Zip returned exit code ${code}.`,
          "SEVEN_ZIP_COMMAND_FAILED",
        );
      }
    },
  };
}

function ensureDirectory(fs, path) {
  const parts = path.split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    current += `/${part}`;
    try {
      const stat = fs.stat(current);
      if (!fs.isDir(stat.mode)) {
        throw new WorkerArchiveError("Archive path collides with a file.", "INVALID_ARCHIVE_PATH");
      }
    } catch (error) {
      if (error instanceof WorkerArchiveError) {
        throw error;
      }
      fs.mkdir(current);
    }
  }
}

function normaliseArchivePath(input) {
  if (typeof input !== "string") {
    throw new WorkerArchiveError("Invalid archive entry path.", "INVALID_ARCHIVE_PATH");
  }

  if (/^[\\/]/.test(input) || /^[a-zA-Z]:[\\/]/.test(input)) {
    throw new WorkerArchiveError("The archive contains an absolute path.", "UNSAFE_ARCHIVE_PATH");
  }

  const cleaned = input.replaceAll("\\", "/");
  const parts = [];

  for (const part of cleaned.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === ".." || part.includes("\0")) {
      throw new WorkerArchiveError(
        "The archive contains an unsafe path.",
        "UNSAFE_ARCHIVE_PATH",
      );
    }
    parts.push(part);
  }

  if (parts.length === 0 || /^[a-zA-Z]:/.test(parts.join("/"))) {
    throw new WorkerArchiveError("The archive contains an unsafe path.", "UNSAFE_ARCHIVE_PATH");
  }

  return parts.join("/");
}

function dirname(path) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function hasSevenZipSignature(bytes) {
  return (
    bytes.length >= SEVEN_ZIP_SIGNATURE.length &&
    SEVEN_ZIP_SIGNATURE.every((value, index) => bytes[index] === value)
  );
}

function createWrongVerificationPassphrase() {
  const bytes = self.crypto.getRandomValues(new Uint8Array(24));
  return `sbt-verify-${[...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function safeCompressionLevel(value) {
  const level = Number(value);
  if (![0, 3, 5, 9].includes(level)) {
    throw new WorkerArchiveError("Unsupported compression level.", "INVALID_COMPRESSION_LEVEL");
  }
  return level;
}

async function stageArchiveInputs(runtime, entries) {
  const { FS } = runtime.module;
  ensureDirectory(FS, "/input");
  ensureDirectory(FS, "/out");
  const topLevel = new Set();
  let inputBytes = 0;

  for (const [index, entry] of entries.entries()) {
    const path = normaliseArchivePath(entry.path);
    const parent = dirname(path);
    if (parent) {
      ensureDirectory(FS, `/input/${parent}`);
    }

    const bytes = new Uint8Array(await entry.file.arrayBuffer());
    FS.writeFile(`/input/${path}`, bytes);
    inputBytes += bytes.byteLength;
    bytes.fill(0);
    topLevel.add(path.split("/")[0]);

    const percent = 5 + Math.round(((index + 1) / entries.length) * 20);
    postProgress("staging", `Preparing ${index + 1} of ${entries.length} files…`, percent);
  }

  return { topLevel: [...topLevel].sort(), inputBytes };
}

async function verifyArchive(archiveBytes, passphrase) {
  postProgress("verify", "Verifying the encrypted archive…", 80);
  const runtime = await createSevenZipRuntime(passphrase);
  runtime.module.FS.writeFile("/archive.7z", archiveBytes);
  runtime.run(["t", "-y", "-bb0", "-bd", `-p${passphrase}`, "/archive.7z"]);

  postProgress("verify-headers", "Verifying that filenames require the correct passphrase…", 90);
  const wrongPassphrase = createWrongVerificationPassphrase();
  const wrongPasswordRuntime = await createSevenZipRuntime(wrongPassphrase, MAX_LISTING_LINES);
  wrongPasswordRuntime.module.FS.writeFile("/archive.7z", archiveBytes);

  try {
    wrongPasswordRuntime.run([
      "l",
      "-slt",
      "-bb0",
      "-bd",
      `-p${wrongPassphrase}`,
      "/archive.7z",
    ]);
  } catch (error) {
    if (error instanceof WorkerArchiveError && error.code === "SEVEN_ZIP_COMMAND_FAILED") {
      return true;
    }
    throw error;
  }

  throw new WorkerArchiveError(
    "Archive verification found that filenames could be listed with an incorrect passphrase.",
    "HEADER_ENCRYPTION_VERIFY_FAILED",
  );
}

async function createArchive(payload) {
  const { entries, passphrase } = payload;
  const compressionLevel = safeCompressionLevel(payload.compressionLevel);

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new WorkerArchiveError("No files were supplied for the archive.", "NO_ARCHIVE_INPUT");
  }

  postProgress("load", "Loading the local 7-Zip engine…", 2);
  const runtime = await createSevenZipRuntime(passphrase);
  const { topLevel, inputBytes } = await stageArchiveInputs(runtime, entries);

  postProgress("compress", "Compressing and encrypting files…", 30);
  runtime.module.FS.chdir("/input");
  runtime.run([
    "a",
    "-t7z",
    `-mx=${compressionLevel}`,
    "-mhe=on",
    `-p${passphrase}`,
    "-y",
    "-bb0",
    "-bd",
    "/out/archive.7z",
    "--",
    ...topLevel,
  ]);

  const archive = runtime.module.FS.readFile("/out/archive.7z", { encoding: "binary" }).slice();
  if (!hasSevenZipSignature(archive)) {
    throw new WorkerArchiveError(
      "7-Zip did not produce a valid 7z archive.",
      "INVALID_ARCHIVE_OUTPUT",
    );
  }

  await verifyArchive(archive, passphrase);
  postProgress("done", "Archive created and verified.", 100);

  return {
    archive,
    inputBytes,
    archiveBytes: archive.byteLength,
    verified: true,
  };
}

function parseTechnicalListing(lines, limits) {
  const entries = [];
  let inEntries = false;
  let current = null;

  const commit = () => {
    if (!current?.path) {
      current = null;
      return;
    }

    const path = normaliseArchivePath(current.path);
    const size = Number(current.size ?? 0);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new WorkerArchiveError(
        "The archive reports an invalid extracted size.",
        "INVALID_ARCHIVE_METADATA",
      );
    }

    entries.push({ path, size, folder: current.folder === "+" });
    current = null;
  };

  for (const rawLine of lines) {
    const line = String(rawLine).trimEnd();
    if (line.trim() === "----------") {
      inEntries = true;
      continue;
    }
    if (!inEntries) {
      continue;
    }

    if (line.startsWith("Path = ")) {
      commit();
      current = { path: line.slice(7) };
      continue;
    }
    if (!current) {
      continue;
    }
    if (line.startsWith("Size = ")) {
      current.size = line.slice(7);
    } else if (line.startsWith("Folder = ")) {
      current.folder = line.slice(9).trim();
    }
  }
  commit();

  if (entries.length > limits.maxEntries) {
    throw new WorkerArchiveError(
      `The archive contains more than ${limits.maxEntries.toLocaleString()} entries.`,
      "ARCHIVE_ENTRY_LIMIT",
    );
  }

  let totalBytes = 0;
  for (const entry of entries) {
    if (entry.folder) {
      continue;
    }
    totalBytes += entry.size;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > limits.maxBytes) {
      throw new WorkerArchiveError(
        "The archive declares more than 1 GiB of extracted file data.",
        "ARCHIVE_EXPANSION_LIMIT",
      );
    }
  }

  return { entries, totalBytes };
}

async function inspectArchive(archiveBytes, passphrase, limits) {
  postProgress("inspect", "Checking archive metadata and safety limits…", 15);
  const runtime = await createSevenZipRuntime(passphrase, MAX_LISTING_LINES);
  runtime.module.FS.writeFile("/archive.7z", archiveBytes);

  try {
    runtime.run(["l", "-slt", "-bb0", "-bd", `-p${passphrase}`, "/archive.7z"]);
  } catch (error) {
    throw new WorkerArchiveError(
      "Unable to open the encrypted archive. The passphrase may be incorrect or the archive may be damaged.",
      "ARCHIVE_OPEN_FAILED",
    );
  }

  return parseTechnicalListing(runtime.output, limits);
}

function collectExtractedFiles(fs, root) {
  const files = [];
  const skippedEntries = [];

  const walk = (directory, relativeDirectory = "") => {
    for (const name of fs.readdir(directory)) {
      if (name === "." || name === "..") {
        continue;
      }

      const absolutePath = `${directory}/${name}`.replaceAll("//", "/");
      const relativePath = relativeDirectory ? `${relativeDirectory}/${name}` : name;
      const stat = fs.lstat(absolutePath);

      if (fs.isLink(stat.mode)) {
        skippedEntries.push(relativePath);
        continue;
      }

      if (fs.isDir(stat.mode)) {
        walk(absolutePath, relativePath);
        continue;
      }

      if (!fs.isFile(stat.mode)) {
        skippedEntries.push(relativePath);
        continue;
      }

      const safePath = normaliseArchivePath(relativePath);
      const bytes = fs.readFile(absolutePath, { encoding: "binary" }).slice();
      files.push({ path: safePath, size: bytes.byteLength, bytes });
    }
  };

  walk(root);
  return { files, skippedEntries };
}

async function extractArchive(payload) {
  const { file, passphrase, limits } = payload;
  const archiveBytes = new Uint8Array(await file.arrayBuffer());

  if (!hasSevenZipSignature(archiveBytes)) {
    throw new WorkerArchiveError("The selected file is not a valid 7z archive.", "NOT_SEVEN_ZIP");
  }

  const inspection = await inspectArchive(archiveBytes, passphrase, limits);
  postProgress("extract", "Decrypting and extracting archive contents…", 45);

  const runtime = await createSevenZipRuntime(passphrase);
  ensureDirectory(runtime.module.FS, "/input");
  ensureDirectory(runtime.module.FS, "/out");
  runtime.module.FS.writeFile("/input/archive.7z", archiveBytes);
  archiveBytes.fill(0);

  try {
    runtime.run([
      "x",
      "-y",
      "-aoa",
      "-bb0",
      "-bd",
      `-p${passphrase}`,
      "-o/out",
      "/input/archive.7z",
    ]);
  } catch (error) {
    throw new WorkerArchiveError(
      "Archive extraction failed. The passphrase may be incorrect or the archive may be damaged.",
      "ARCHIVE_EXTRACTION_FAILED",
    );
  }

  postProgress("collect", "Preparing extracted files for download…", 82);
  const result = collectExtractedFiles(runtime.module.FS, "/out");
  const actualTotalBytes = result.files.reduce((total, entry) => total + entry.size, 0);

  if (actualTotalBytes > limits.maxBytes || result.files.length > limits.maxEntries) {
    throw new WorkerArchiveError(
      "The extracted archive exceeded the configured browser safety limits.",
      "ARCHIVE_EXPANSION_LIMIT",
    );
  }

  postProgress("done", "Archive decrypted and extracted.", 100);
  return {
    files: result.files,
    totalBytes: actualTotalBytes,
    declaredBytes: inspection.totalBytes,
    skippedEntries: result.skippedEntries,
  };
}

function postResult(result) {
  const transfer = [];

  if (result.archive instanceof Uint8Array) {
    transfer.push(result.archive.buffer);
    result = { ...result, archive: result.archive.buffer };
  }

  if (Array.isArray(result.files)) {
    const files = result.files.map((entry) => {
      transfer.push(entry.bytes.buffer);
      return { ...entry, bytes: entry.bytes.buffer };
    });
    result = { ...result, files };
  }

  self.postMessage({ type: "result", result }, transfer);
}

self.addEventListener("message", async (event) => {
  const { operation, payload } = event.data || {};

  try {
    if (operation === "create") {
      postResult(await createArchive(payload));
      return;
    }

    if (operation === "extract") {
      postResult(await extractArchive(payload));
      return;
    }

    throw new WorkerArchiveError("Unknown archive operation.", "UNKNOWN_ARCHIVE_OPERATION");
  } catch (error) {
    const safeError =
      error instanceof WorkerArchiveError
        ? error
        : new WorkerArchiveError("The 7z operation failed unexpectedly.");
    console.error(safeError);
    self.postMessage({
      type: "error",
      code: safeError.code,
      message: safeError.message,
    });
  }
});
