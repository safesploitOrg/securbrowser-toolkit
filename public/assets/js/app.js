import {
  archiveRuntimeAvailable,
  createEncryptedArchive,
  extractEncryptedArchive,
} from "./archive.js";
import {
  appendArchiveFiles,
  ARCHIVE_MIN_PASSPHRASE_LENGTH,
  archiveOutputFilename,
  fileLooksLikeSevenZip,
  MAX_ARCHIVE_FILE_BYTES,
  MAX_ARCHIVE_INPUT_BYTES,
  safeExtractedPath,
  totalArchiveInputBytes,
} from "./archive-utils.js";
import { decryptFileBytes, encryptFileBytes } from "./encryption.js";
import {
  createDownloadUrl,
  decryptedFilename,
  encryptedFilename,
  formatFileSize,
  LARGE_FILE_WARNING_BYTES,
  readFileBytes,
  revokeDownloadUrl,
} from "./file-utils.js";
import {
  clearArchiveSelection,
  clearDownload,
  clearExtractedResults,
  clearSelectedFile,
  clearStatus,
  getUiElements,
  renderArchiveSelection,
  renderExtractedResults,
  setArchiveMode,
  setArchivePassphraseMatch,
  setArchiveUnavailable,
  setBusy,
  setDownload,
  setDropzoneActive,
  setFileMode,
  setPassphraseMatch,
  setSecureFileUnavailable,
  setSelectedFile,
  setStatus,
  setSubmitEnabled,
  setToolFamily,
} from "./ui.js";

const ui = getUiElements();
const state = {
  toolFamily: "file",
  fileMode: "encrypt",
  archiveMode: "archive-create",
  encryptFile: null,
  decryptFile: null,
  archiveEntries: [],
  archiveExtractFile: null,
  encryptDownloadUrl: null,
  decryptDownloadUrl: null,
  archiveDownloadUrl: null,
  extractedFiles: [],
  extractedDownloadUrls: [],
};

function isWebCryptoAvailable() {
  return Boolean(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);
}

function updateEncryptValidation() {
  const passphrase = ui.encryptPassphrase.value;
  const confirmation = ui.encryptConfirm.value;
  const validPassphrase = passphrase.length >= 8 && passphrase === confirmation;
  const empty = passphrase.length === 0 && confirmation.length === 0;

  setPassphraseMatch({ valid: validPassphrase, empty });
  setSubmitEnabled("encrypt", Boolean(state.encryptFile && validPassphrase));
}

function updateDecryptValidation() {
  setSubmitEnabled(
    "decrypt",
    Boolean(state.decryptFile && ui.decryptPassphrase.value.length > 0),
  );
}

function updateArchiveCreateValidation() {
  const passphrase = ui.archiveCreatePassphrase.value;
  const confirmation = ui.archiveCreateConfirm.value;
  const validPassphrase =
    passphrase.length >= ARCHIVE_MIN_PASSPHRASE_LENGTH && passphrase === confirmation;
  const empty = passphrase.length === 0 && confirmation.length === 0;
  const totalBytes = totalArchiveInputBytes(state.archiveEntries);
  const withinLimit = totalBytes <= MAX_ARCHIVE_INPUT_BYTES;

  setArchivePassphraseMatch({ valid: validPassphrase, empty });
  setSubmitEnabled(
    "archive-create",
    Boolean(state.archiveEntries.length > 0 && validPassphrase && withinLimit),
  );
}

function updateArchiveExtractValidation() {
  setSubmitEnabled(
    "archive-extract",
    Boolean(
      state.archiveExtractFile &&
        state.archiveExtractFile.size <= MAX_ARCHIVE_FILE_BYTES &&
        ui.archiveExtractPassphrase.value.length > 0,
    ),
  );
}

function releaseSingleDownload(mode) {
  const key =
    mode === "encrypt"
      ? "encryptDownloadUrl"
      : mode === "decrypt"
        ? "decryptDownloadUrl"
        : "archiveDownloadUrl";
  revokeDownloadUrl(state[key]);
  state[key] = null;
  clearDownload(mode);
}

function releaseExtractedDownloads() {
  for (const url of state.extractedDownloadUrls) {
    revokeDownloadUrl(url);
  }
  state.extractedDownloadUrls = [];
  state.extractedFiles = [];
  clearExtractedResults();
}

function selectFile(mode, file) {
  if (!file) {
    return;
  }

  const key = mode === "encrypt" ? "encryptFile" : "decryptFile";
  state[key] = file;
  releaseSingleDownload(mode);
  clearStatus(mode);
  setSelectedFile(
    mode,
    file,
    formatFileSize(file.size),
    file.size >= LARGE_FILE_WARNING_BYTES,
  );

  if (mode === "encrypt") {
    updateEncryptValidation();
  } else {
    updateDecryptValidation();
  }
}

function selectArchiveExtractFile(file) {
  if (!file) {
    return;
  }

  state.archiveExtractFile = file;
  releaseExtractedDownloads();
  clearStatus("archive-extract");
  setSelectedFile(
    "archive-extract",
    file,
    formatFileSize(file.size),
    file.size >= LARGE_FILE_WARNING_BYTES,
  );
  if (file.size > MAX_ARCHIVE_FILE_BYTES) {
    setStatus(
      "archive-extract",
      "The selected 7z archive exceeds the 1 GiB browser input safety limit.",
      "error",
    );
  }
  updateArchiveExtractValidation();
}

function appendArchiveSelection(files) {
  try {
    state.archiveEntries = appendArchiveFiles(state.archiveEntries, files);
  } catch (error) {
    setStatus("archive-create", error.message || "Unable to add the selected files.", "error");
    return;
  }

  releaseSingleDownload("archive-create");
  const totalBytes = totalArchiveInputBytes(state.archiveEntries);
  renderArchiveSelection(
    state.archiveEntries.map((entry) => ({
      ...entry,
      formattedSize: formatFileSize(entry.file.size),
    })),
    formatFileSize(totalBytes),
    totalBytes >= LARGE_FILE_WARNING_BYTES,
  );

  if (totalBytes > MAX_ARCHIVE_INPUT_BYTES) {
    setStatus(
      "archive-create",
      "The selection exceeds the 1 GiB browser archive-creation safety limit.",
      "error",
    );
  } else {
    clearStatus("archive-create");
  }
  updateArchiveCreateValidation();
}

function clearArchiveFiles() {
  state.archiveEntries = [];
  releaseSingleDownload("archive-create");
  clearArchiveSelection();
  clearStatus("archive-create");
  updateArchiveCreateValidation();
}

function switchToolFamily(tool) {
  state.toolFamily = tool;
  setToolFamily(tool);
}

function switchFileMode(mode) {
  state.fileMode = mode;
  setFileMode(mode);
}

function switchArchiveMode(mode) {
  state.archiveMode = mode;
  setArchiveMode(mode);
}

function setUpSingleFileDropzone(mode, dropzone, input, handler) {
  for (const eventName of ["dragenter", "dragover"]) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      setDropzoneActive(mode, true);
    });
  }

  for (const eventName of ["dragleave", "dragend"]) {
    dropzone.addEventListener(eventName, () => setDropzoneActive(mode, false));
  }

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    setDropzoneActive(mode, false);
    handler(event.dataTransfer?.files?.[0]);
  });

  input.addEventListener("change", () => handler(input.files?.[0]));
}

function setUpArchiveCreateDropzone() {
  const mode = "archive-create";
  const dropzone = ui.archiveCreateDropzone;

  for (const eventName of ["dragenter", "dragover"]) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      setDropzoneActive(mode, true);
    });
  }

  for (const eventName of ["dragleave", "dragend"]) {
    dropzone.addEventListener(eventName, () => setDropzoneActive(mode, false));
  }

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    setDropzoneActive(mode, false);
    appendArchiveSelection(event.dataTransfer?.files || []);
  });

  ui.archiveCreateFiles.addEventListener("change", () => {
    appendArchiveSelection(ui.archiveCreateFiles.files || []);
    ui.archiveCreateFiles.value = "";
  });

  ui.archiveCreateFolder.setAttribute("webkitdirectory", "");
  ui.archiveCreateFolder.setAttribute("directory", "");
  ui.archiveCreateFolder.addEventListener("change", () => {
    appendArchiveSelection(ui.archiveCreateFolder.files || []);
    ui.archiveCreateFolder.value = "";
  });
  ui.archiveAddFolder.addEventListener("click", () => ui.archiveCreateFolder.click());
  ui.archiveClearFiles.addEventListener("click", clearArchiveFiles);
}

function setUpPasswordToggles() {
  for (const button of ui.passwordToggles) {
    button.addEventListener("click", () => {
      const targetId = button.dataset.passwordToggle;
      const target = document.querySelector(`#${targetId}`);

      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      const show = target.type === "password";
      target.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute("aria-label", `${show ? "Hide" : "Show"} passphrase`);
    });
  }
}

function resetPasswordToggles() {
  for (const button of ui.passwordToggles) {
    const target = document.querySelector(`#${button.dataset.passwordToggle}`);
    if (target instanceof HTMLInputElement) {
      target.type = "password";
    }
    button.textContent = "Show";
    button.setAttribute("aria-label", "Show passphrase");
  }
}

async function handleEncrypt(event) {
  event.preventDefault();
  updateEncryptValidation();

  if (!state.encryptFile || ui.encryptSubmit.disabled) {
    return;
  }

  releaseSingleDownload("encrypt");
  setBusy("encrypt", true);
  setStatus("encrypt", "Encrypting locally in your browser…", "info");

  try {
    const plaintext = await readFileBytes(state.encryptFile);
    const encrypted = await encryptFileBytes(plaintext, ui.encryptPassphrase.value);
    const filename = encryptedFilename(state.encryptFile.name);
    const url = createDownloadUrl(encrypted);
    state.encryptDownloadUrl = url;

    setDownload("encrypt", {
      url,
      filename,
      label: `Download ${filename}`,
    });
    setStatus(
      "encrypt",
      "File encrypted with PBKDF2-HMAC-SHA512 and authenticated AES-256-GCM.",
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus("encrypt", "Encryption failed. No output file was created.", "error");
  } finally {
    setBusy("encrypt", false);
    updateEncryptValidation();
  }
}

async function handleDecrypt(event) {
  event.preventDefault();
  updateDecryptValidation();

  if (!state.decryptFile || ui.decryptSubmit.disabled) {
    return;
  }

  releaseSingleDownload("decrypt");
  setBusy("decrypt", true);
  setStatus("decrypt", "Decrypting locally in your browser…", "info");

  try {
    const encrypted = await readFileBytes(state.decryptFile);
    const result = await decryptFileBytes(encrypted, ui.decryptPassphrase.value);
    const filename = decryptedFilename(state.decryptFile.name);
    const url = createDownloadUrl(result.plaintext);
    state.decryptDownloadUrl = url;

    setDownload("decrypt", {
      url,
      filename,
      label: `Download ${filename}`,
    });

    if (result.authenticated) {
      setStatus(
        "decrypt",
        `Authenticated v2 file decrypted successfully (${result.iterations.toLocaleString()} PBKDF2-SHA512 iterations).`,
        "success",
      );
    } else {
      setStatus(
        "decrypt",
        "Legacy AES-CBC file decrypted. Legacy files do not provide authenticated integrity; re-encrypt with v2 when practical.",
        "warning",
      );
    }
  } catch (error) {
    console.error(error);
    setStatus("decrypt", error.message || "Decryption failed.", "error");
  } finally {
    setBusy("decrypt", false);
    updateDecryptValidation();
  }
}

function archiveProgressHandler(mode) {
  return ({ message }) => {
    if (message) {
      setStatus(mode, message, "info");
    }
  };
}

async function handleArchiveCreate(event) {
  event.preventDefault();
  updateArchiveCreateValidation();

  if (ui.archiveCreateSubmit.disabled || state.archiveEntries.length === 0) {
    return;
  }

  releaseSingleDownload("archive-create");
  setBusy("archive-create", true);
  setStatus("archive-create", "Starting the local 7-Zip worker…", "info");

  try {
    const result = await createEncryptedArchive({
      entries: state.archiveEntries,
      passphrase: ui.archiveCreatePassphrase.value,
      compressionLevel: Number(ui.archiveCompression.value),
      onProgress: archiveProgressHandler("archive-create"),
    });
    const filename = archiveOutputFilename(ui.archiveName.value);
    const url = createDownloadUrl(result.archive, "application/x-7z-compressed");
    state.archiveDownloadUrl = url;

    setDownload("archive-create", {
      url,
      filename,
      label: `Download ${filename}`,
    });
    setStatus(
      "archive-create",
      `Encrypted 7z created with AES-256 and encrypted filenames. Archive integrity and filename protection verified (${formatFileSize(result.archiveBytes)}).`,
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus("archive-create", error.message || "Archive creation failed.", "error");
  } finally {
    setBusy("archive-create", false);
    updateArchiveCreateValidation();
  }
}

async function handleArchiveExtract(event) {
  event.preventDefault();
  updateArchiveExtractValidation();

  if (!state.archiveExtractFile || ui.archiveExtractSubmit.disabled) {
    return;
  }

  releaseExtractedDownloads();
  setBusy("archive-extract", true);
  setStatus("archive-extract", "Checking the selected 7z archive…", "info");

  try {
    if (!(await fileLooksLikeSevenZip(state.archiveExtractFile))) {
      throw new Error("The selected file does not contain a valid 7z signature.");
    }

    const result = await extractEncryptedArchive({
      file: state.archiveExtractFile,
      passphrase: ui.archiveExtractPassphrase.value,
      onProgress: archiveProgressHandler("archive-extract"),
    });

    state.extractedFiles = result.files.map((file) => ({
      ...file,
      path: safeExtractedPath(file.path),
      formattedSize: formatFileSize(file.size),
    }));
    state.extractedDownloadUrls = state.extractedFiles.map((file) =>
      createDownloadUrl(file.bytes),
    );

    renderExtractedResults(
      state.extractedFiles,
      formatFileSize(result.totalBytes),
      state.extractedDownloadUrls,
      typeof window.showDirectoryPicker === "function",
    );

    const skipped = result.skippedEntries.length;
    setStatus(
      "archive-extract",
      skipped > 0
        ? `Archive extracted. ${skipped.toLocaleString()} symbolic-link or unsupported entries were skipped.`
        : "Archive decrypted and extracted successfully.",
      skipped > 0 ? "warning" : "success",
    );
  } catch (error) {
    console.error(error);
    releaseExtractedDownloads();
    setStatus("archive-extract", error.message || "Archive extraction failed.", "error");
  } finally {
    setBusy("archive-extract", false);
    updateArchiveExtractValidation();
  }
}

async function saveExtractedFilesToDirectory() {
  if (typeof window.showDirectoryPicker !== "function" || state.extractedFiles.length === 0) {
    return;
  }

  try {
    const root = await window.showDirectoryPicker({ mode: "readwrite" });
    setStatus("archive-extract", "Saving extracted files to the selected folder…", "info");

    for (const file of state.extractedFiles) {
      const parts = safeExtractedPath(file.path).split("/");
      const filename = parts.pop();
      let directory = root;

      for (const part of parts) {
        directory = await directory.getDirectoryHandle(part, { create: true });
      }

      const fileHandle = await directory.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file.bytes);
      await writable.close();
    }

    setStatus(
      "archive-extract",
      `${state.extractedFiles.length.toLocaleString()} extracted files saved to the selected folder.`,
      "success",
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    console.error(error);
    setStatus("archive-extract", "Unable to save all extracted files to that folder.", "error");
  }
}

function setUpTabPair(first, second, activateFirst, activateSecond) {
  first.addEventListener("click", activateFirst);
  second.addEventListener("click", activateSecond);

  first.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "End") {
      event.preventDefault();
      activateSecond();
      second.focus();
    }
  });

  second.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "Home") {
      event.preventDefault();
      activateFirst();
      first.focus();
    }
  });
}

function resetApp() {
  releaseSingleDownload("encrypt");
  releaseSingleDownload("decrypt");
  releaseSingleDownload("archive-create");
  releaseExtractedDownloads();

  state.encryptFile = null;
  state.decryptFile = null;
  state.archiveEntries = [];
  state.archiveExtractFile = null;

  ui.encryptForm.reset();
  ui.decryptForm.reset();
  ui.archiveCreateForm.reset();
  ui.archiveExtractForm.reset();
  resetPasswordToggles();

  clearSelectedFile("encrypt");
  clearSelectedFile("decrypt");
  clearSelectedFile("archive-extract");
  clearArchiveSelection();
  for (const mode of ["encrypt", "decrypt", "archive-create", "archive-extract"]) {
    clearStatus(mode);
    setSubmitEnabled(mode, false);
  }

  setPassphraseMatch({ valid: false, empty: true });
  setArchivePassphraseMatch({ valid: false, empty: true });
  switchToolFamily("file");
  switchFileMode("encrypt");
  switchArchiveMode("archive-create");
}

function initialise() {
  setUpTabPair(
    ui.fileToolTab,
    ui.archiveToolTab,
    () => switchToolFamily("file"),
    () => switchToolFamily("archive"),
  );
  setUpTabPair(
    ui.encryptTab,
    ui.decryptTab,
    () => switchFileMode("encrypt"),
    () => switchFileMode("decrypt"),
  );
  setUpTabPair(
    ui.archiveCreateTab,
    ui.archiveExtractTab,
    () => switchArchiveMode("archive-create"),
    () => switchArchiveMode("archive-extract"),
  );

  setUpSingleFileDropzone("encrypt", ui.encryptDropzone, ui.encryptInput, (file) =>
    selectFile("encrypt", file),
  );
  setUpSingleFileDropzone("decrypt", ui.decryptDropzone, ui.decryptInput, (file) =>
    selectFile("decrypt", file),
  );
  setUpSingleFileDropzone(
    "archive-extract",
    ui.archiveExtractDropzone,
    ui.archiveExtractInput,
    selectArchiveExtractFile,
  );
  setUpArchiveCreateDropzone();
  setUpPasswordToggles();

  for (const input of [ui.encryptPassphrase, ui.encryptConfirm]) {
    input.addEventListener("input", () => {
      releaseSingleDownload("encrypt");
      clearStatus("encrypt");
      updateEncryptValidation();
    });
  }
  ui.decryptPassphrase.addEventListener("input", () => {
    releaseSingleDownload("decrypt");
    clearStatus("decrypt");
    updateDecryptValidation();
  });

  for (const input of [ui.archiveCreatePassphrase, ui.archiveCreateConfirm]) {
    input.addEventListener("input", () => {
      releaseSingleDownload("archive-create");
      clearStatus("archive-create");
      updateArchiveCreateValidation();
    });
  }
  for (const input of [ui.archiveName, ui.archiveCompression]) {
    input.addEventListener("input", () => releaseSingleDownload("archive-create"));
    input.addEventListener("change", () => releaseSingleDownload("archive-create"));
  }
  ui.archiveExtractPassphrase.addEventListener("input", () => {
    releaseExtractedDownloads();
    clearStatus("archive-extract");
    updateArchiveExtractValidation();
  });

  ui.encryptForm.addEventListener("submit", handleEncrypt);
  ui.decryptForm.addEventListener("submit", handleDecrypt);
  ui.archiveCreateForm.addEventListener("submit", handleArchiveCreate);
  ui.archiveExtractForm.addEventListener("submit", handleArchiveExtract);
  ui.archiveSaveAll.addEventListener("click", saveExtractedFilesToDirectory);
  ui.resetButton.addEventListener("click", resetApp);

  window.addEventListener("beforeunload", () => {
    revokeDownloadUrl(state.encryptDownloadUrl);
    revokeDownloadUrl(state.decryptDownloadUrl);
    revokeDownloadUrl(state.archiveDownloadUrl);
    for (const url of state.extractedDownloadUrls) {
      revokeDownloadUrl(url);
    }
  });

  resetApp();

  if (!isWebCryptoAvailable()) {
    setSecureFileUnavailable(
      "Secure File is unavailable because this browser does not expose the required Web Crypto API.",
    );
  }
  if (!archiveRuntimeAvailable()) {
    setArchiveUnavailable(
      "Secure Archive is unavailable because this browser does not expose WebAssembly and Web Workers.",
    );
  }
}

initialise();
