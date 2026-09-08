const elements = {
  app: document.querySelector("#app"),
  fileToolTab: document.querySelector("#tab-tool-file"),
  archiveToolTab: document.querySelector("#tab-tool-archive"),
  fileTool: document.querySelector("#tool-file"),
  archiveTool: document.querySelector("#tool-archive"),
  encryptTab: document.querySelector("#tab-encrypt"),
  decryptTab: document.querySelector("#tab-decrypt"),
  encryptPanel: document.querySelector("#panel-encrypt"),
  decryptPanel: document.querySelector("#panel-decrypt"),
  archiveCreateTab: document.querySelector("#tab-archive-create"),
  archiveExtractTab: document.querySelector("#tab-archive-extract"),
  archiveCreatePanel: document.querySelector("#panel-archive-create"),
  archiveExtractPanel: document.querySelector("#panel-archive-extract"),
  encryptForm: document.querySelector("#encrypt-form"),
  decryptForm: document.querySelector("#decrypt-form"),
  archiveCreateForm: document.querySelector("#archive-create-form"),
  archiveExtractForm: document.querySelector("#archive-extract-form"),
  encryptInput: document.querySelector("#encrypt-file"),
  decryptInput: document.querySelector("#decrypt-file"),
  archiveCreateFiles: document.querySelector("#archive-create-files"),
  archiveCreateFolder: document.querySelector("#archive-create-folder"),
  archiveExtractInput: document.querySelector("#archive-extract-file"),
  encryptDropzone: document.querySelector("#encrypt-dropzone"),
  decryptDropzone: document.querySelector("#decrypt-dropzone"),
  archiveCreateDropzone: document.querySelector("#archive-create-dropzone"),
  archiveExtractDropzone: document.querySelector("#archive-extract-dropzone"),
  encryptFileName: document.querySelector("#encrypt-file-name"),
  decryptFileName: document.querySelector("#decrypt-file-name"),
  archiveExtractFileName: document.querySelector("#archive-extract-file-name"),
  encryptFileSize: document.querySelector("#encrypt-file-size"),
  decryptFileSize: document.querySelector("#decrypt-file-size"),
  archiveExtractFileSize: document.querySelector("#archive-extract-file-size"),
  encryptFileMeta: document.querySelector("#encrypt-file-meta"),
  decryptFileMeta: document.querySelector("#decrypt-file-meta"),
  archiveExtractFileMeta: document.querySelector("#archive-extract-file-meta"),
  encryptLargeWarning: document.querySelector("#encrypt-large-warning"),
  decryptLargeWarning: document.querySelector("#decrypt-large-warning"),
  archiveCreateLargeWarning: document.querySelector("#archive-create-large-warning"),
  archiveExtractLargeWarning: document.querySelector("#archive-extract-large-warning"),
  encryptPassphrase: document.querySelector("#encrypt-passphrase"),
  encryptConfirm: document.querySelector("#encrypt-confirm"),
  decryptPassphrase: document.querySelector("#decrypt-passphrase"),
  archiveCreatePassphrase: document.querySelector("#archive-create-passphrase"),
  archiveCreateConfirm: document.querySelector("#archive-create-confirm"),
  archiveExtractPassphrase: document.querySelector("#archive-extract-passphrase"),
  passphraseMatch: document.querySelector("#passphrase-match"),
  archivePassphraseMatch: document.querySelector("#archive-passphrase-match"),
  archiveName: document.querySelector("#archive-name"),
  archiveCompression: document.querySelector("#archive-compression"),
  archiveAddFolder: document.querySelector("#archive-add-folder"),
  archiveClearFiles: document.querySelector("#archive-clear-files"),
  archiveCreateSelection: document.querySelector("#archive-create-selection"),
  archiveCreateCount: document.querySelector("#archive-create-count"),
  archiveCreateSize: document.querySelector("#archive-create-size"),
  archiveCreateFileList: document.querySelector("#archive-create-file-list"),
  encryptSubmit: document.querySelector("#encrypt-submit"),
  decryptSubmit: document.querySelector("#decrypt-submit"),
  archiveCreateSubmit: document.querySelector("#archive-create-submit"),
  archiveExtractSubmit: document.querySelector("#archive-extract-submit"),
  encryptStatus: document.querySelector("#encrypt-status"),
  decryptStatus: document.querySelector("#decrypt-status"),
  archiveCreateStatus: document.querySelector("#archive-create-status"),
  archiveExtractStatus: document.querySelector("#archive-extract-status"),
  encryptDownload: document.querySelector("#encrypt-download"),
  decryptDownload: document.querySelector("#decrypt-download"),
  archiveCreateDownload: document.querySelector("#archive-create-download"),
  archiveSaveAll: document.querySelector("#archive-save-all"),
  archiveExtractResults: document.querySelector("#archive-extract-results"),
  archiveExtractSummary: document.querySelector("#archive-extract-summary"),
  archiveExtractList: document.querySelector("#archive-extract-list"),
  resetButton: document.querySelector("#reset-app"),
  cryptoSupport: document.querySelector("#crypto-support"),
  passwordToggles: document.querySelectorAll("[data-password-toggle]"),
};

function requiredElement(value, name) {
  if (!value) {
    throw new Error(`Required UI element not found: ${name}`);
  }
  return value;
}

for (const [name, value] of Object.entries(elements)) {
  if (name !== "passwordToggles") {
    requiredElement(value, name);
  }
}

const modeElements = {
  encrypt: {
    submit: elements.encryptSubmit,
    status: elements.encryptStatus,
    download: elements.encryptDownload,
    dropzone: elements.encryptDropzone,
  },
  decrypt: {
    submit: elements.decryptSubmit,
    status: elements.decryptStatus,
    download: elements.decryptDownload,
    dropzone: elements.decryptDropzone,
  },
  "archive-create": {
    submit: elements.archiveCreateSubmit,
    status: elements.archiveCreateStatus,
    download: elements.archiveCreateDownload,
    dropzone: elements.archiveCreateDropzone,
  },
  "archive-extract": {
    submit: elements.archiveExtractSubmit,
    status: elements.archiveExtractStatus,
    dropzone: elements.archiveExtractDropzone,
  },
};

const busyLabels = {
  encrypt: "Encrypting…",
  decrypt: "Decrypting…",
  "archive-create": "Creating archive…",
  "archive-extract": "Extracting archive…",
};

export function getUiElements() {
  return elements;
}

export function setToolFamily(tool) {
  const fileActive = tool === "file";
  elements.fileToolTab.setAttribute("aria-selected", String(fileActive));
  elements.archiveToolTab.setAttribute("aria-selected", String(!fileActive));
  elements.fileToolTab.tabIndex = fileActive ? 0 : -1;
  elements.archiveToolTab.tabIndex = fileActive ? -1 : 0;
  elements.fileTool.hidden = !fileActive;
  elements.archiveTool.hidden = fileActive;
}

export function setFileMode(mode) {
  const encryptActive = mode === "encrypt";
  elements.encryptTab.setAttribute("aria-selected", String(encryptActive));
  elements.decryptTab.setAttribute("aria-selected", String(!encryptActive));
  elements.encryptTab.tabIndex = encryptActive ? 0 : -1;
  elements.decryptTab.tabIndex = encryptActive ? -1 : 0;
  elements.encryptPanel.hidden = !encryptActive;
  elements.decryptPanel.hidden = encryptActive;
}

export function setArchiveMode(mode) {
  const createActive = mode === "archive-create";
  elements.archiveCreateTab.setAttribute("aria-selected", String(createActive));
  elements.archiveExtractTab.setAttribute("aria-selected", String(!createActive));
  elements.archiveCreateTab.tabIndex = createActive ? 0 : -1;
  elements.archiveExtractTab.tabIndex = createActive ? -1 : 0;
  elements.archiveCreatePanel.hidden = !createActive;
  elements.archiveExtractPanel.hidden = createActive;
}

export function setSelectedFile(mode, file, formattedSize, isLarge) {
  const prefix =
    mode === "encrypt" ? "encrypt" : mode === "decrypt" ? "decrypt" : "archiveExtract";
  elements[`${prefix}FileName`].textContent = file.name;
  elements[`${prefix}FileSize`].textContent = formattedSize;
  elements[`${prefix}FileMeta`].hidden = false;
  elements[`${prefix}LargeWarning`].hidden = !isLarge;
}

export function clearSelectedFile(mode) {
  const prefix =
    mode === "encrypt" ? "encrypt" : mode === "decrypt" ? "decrypt" : "archiveExtract";
  elements[`${prefix}FileName`].textContent = "";
  elements[`${prefix}FileSize`].textContent = "";
  elements[`${prefix}FileMeta`].hidden = true;
  elements[`${prefix}LargeWarning`].hidden = true;

  const input =
    mode === "encrypt"
      ? elements.encryptInput
      : mode === "decrypt"
        ? elements.decryptInput
        : elements.archiveExtractInput;
  input.value = "";
}

export function setDropzoneActive(mode, active) {
  modeElements[mode].dropzone.classList.toggle("dropzone--active", active);
}

function setMatchState(element, { valid, empty, minimum }) {
  if (empty) {
    element.textContent = `Use at least ${minimum} characters; a longer passphrase is recommended.`;
    element.dataset.state = "neutral";
    return;
  }

  element.textContent = valid
    ? "Passphrases match."
    : `Passphrases must match and contain at least ${minimum} characters.`;
  element.dataset.state = valid ? "valid" : "invalid";
}

export function setPassphraseMatch(state) {
  setMatchState(elements.passphraseMatch, { ...state, minimum: 8 });
}

export function setArchivePassphraseMatch(state) {
  setMatchState(elements.archivePassphraseMatch, { ...state, minimum: 12 });
}

export function setSubmitEnabled(mode, enabled) {
  modeElements[mode].submit.disabled = !enabled;
}

export function setBusy(mode, busy) {
  const button = modeElements[mode].submit;
  button.disabled = busy;
  button.classList.toggle("button--busy", busy);
  button.setAttribute("aria-busy", String(busy));

  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyLabels[mode];
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

export function setStatus(mode, message, type = "info") {
  const status = modeElements[mode].status;
  status.textContent = message;
  status.dataset.type = type;
  status.hidden = !message;
}

export function clearStatus(mode) {
  setStatus(mode, "");
}

export function setDownload(mode, { url, filename, label }) {
  const link = modeElements[mode].download;
  if (!link) {
    throw new Error(`Mode ${mode} does not have a single download link.`);
  }
  link.href = url;
  link.download = filename;
  link.textContent = label;
  link.hidden = false;
}

export function clearDownload(mode) {
  const link = modeElements[mode].download;
  if (!link) {
    return;
  }
  link.removeAttribute("href");
  link.removeAttribute("download");
  link.hidden = true;
}

export function renderArchiveSelection(entries, formattedSize, isLarge) {
  elements.archiveCreateFileList.replaceChildren();

  for (const entry of entries) {
    const item = document.createElement("li");
    const path = document.createElement("span");
    path.className = "file-list__path";
    path.textContent = entry.path;
    path.title = entry.path;

    const size = document.createElement("span");
    size.className = "file-list__size";
    size.textContent = entry.formattedSize;

    item.append(path, size);
    elements.archiveCreateFileList.append(item);
  }

  const count = entries.length;
  elements.archiveCreateCount.textContent = `${count.toLocaleString()} ${count === 1 ? "file" : "files"}`;
  elements.archiveCreateSize.textContent = formattedSize;
  elements.archiveCreateSelection.hidden = count === 0;
  elements.archiveCreateLargeWarning.hidden = !isLarge;
  elements.archiveClearFiles.disabled = count === 0;
}

export function clearArchiveSelection() {
  elements.archiveCreateFileList.replaceChildren();
  elements.archiveCreateSelection.hidden = true;
  elements.archiveCreateLargeWarning.hidden = true;
  elements.archiveCreateCount.textContent = "";
  elements.archiveCreateSize.textContent = "";
  elements.archiveCreateFiles.value = "";
  elements.archiveCreateFolder.value = "";
  elements.archiveClearFiles.disabled = true;
}

export function clearExtractedResults() {
  elements.archiveExtractList.replaceChildren();
  elements.archiveExtractSummary.textContent = "";
  elements.archiveExtractResults.hidden = true;
  elements.archiveSaveAll.hidden = true;
}

export function renderExtractedResults(files, formattedTotal, downloadUrls, canSaveDirectory) {
  elements.archiveExtractList.replaceChildren();

  for (const [index, file] of files.entries()) {
    const item = document.createElement("li");
    const path = document.createElement("span");
    path.className = "extract-list__path";
    path.textContent = file.path;
    path.title = file.path;

    const action = document.createElement("a");
    action.className = "button button--secondary";
    action.href = downloadUrls[index];
    action.download = file.path.split("/").at(-1) || "extracted-file";
    action.textContent = `Download · ${file.formattedSize}`;

    item.append(path, action);
    elements.archiveExtractList.append(item);
  }

  const count = files.length;
  elements.archiveExtractSummary.textContent = `${count.toLocaleString()} ${count === 1 ? "file" : "files"} · ${formattedTotal}`;
  elements.archiveExtractResults.hidden = false;
  elements.archiveSaveAll.hidden = !canSaveDirectory || count === 0;
}

export function setSecureFileUnavailable(message) {
  elements.cryptoSupport.textContent = message;
  elements.cryptoSupport.hidden = false;
  elements.encryptSubmit.disabled = true;
  elements.decryptSubmit.disabled = true;
  elements.encryptInput.disabled = true;
  elements.decryptInput.disabled = true;
  elements.encryptPassphrase.disabled = true;
  elements.encryptConfirm.disabled = true;
  elements.decryptPassphrase.disabled = true;
}

export function setArchiveUnavailable(message) {
  elements.cryptoSupport.textContent = message;
  elements.cryptoSupport.hidden = false;
  elements.archiveCreateSubmit.disabled = true;
  elements.archiveExtractSubmit.disabled = true;
  elements.archiveCreateFiles.disabled = true;
  elements.archiveCreateFolder.disabled = true;
  elements.archiveExtractInput.disabled = true;
  elements.archiveCreatePassphrase.disabled = true;
  elements.archiveCreateConfirm.disabled = true;
  elements.archiveExtractPassphrase.disabled = true;
}
