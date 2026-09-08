const elements = {
  app: document.querySelector("#app"),
  encryptTab: document.querySelector("#tab-encrypt"),
  decryptTab: document.querySelector("#tab-decrypt"),
  encryptPanel: document.querySelector("#panel-encrypt"),
  decryptPanel: document.querySelector("#panel-decrypt"),
  encryptForm: document.querySelector("#encrypt-form"),
  decryptForm: document.querySelector("#decrypt-form"),
  encryptInput: document.querySelector("#encrypt-file"),
  decryptInput: document.querySelector("#decrypt-file"),
  encryptDropzone: document.querySelector("#encrypt-dropzone"),
  decryptDropzone: document.querySelector("#decrypt-dropzone"),
  encryptFileName: document.querySelector("#encrypt-file-name"),
  decryptFileName: document.querySelector("#decrypt-file-name"),
  encryptFileSize: document.querySelector("#encrypt-file-size"),
  decryptFileSize: document.querySelector("#decrypt-file-size"),
  encryptFileMeta: document.querySelector("#encrypt-file-meta"),
  decryptFileMeta: document.querySelector("#decrypt-file-meta"),
  encryptLargeWarning: document.querySelector("#encrypt-large-warning"),
  decryptLargeWarning: document.querySelector("#decrypt-large-warning"),
  encryptPassphrase: document.querySelector("#encrypt-passphrase"),
  encryptConfirm: document.querySelector("#encrypt-confirm"),
  decryptPassphrase: document.querySelector("#decrypt-passphrase"),
  passphraseMatch: document.querySelector("#passphrase-match"),
  encryptSubmit: document.querySelector("#encrypt-submit"),
  decryptSubmit: document.querySelector("#decrypt-submit"),
  encryptStatus: document.querySelector("#encrypt-status"),
  decryptStatus: document.querySelector("#decrypt-status"),
  encryptDownload: document.querySelector("#encrypt-download"),
  decryptDownload: document.querySelector("#decrypt-download"),
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

export function getUiElements() {
  return elements;
}

export function setMode(mode) {
  const encryptActive = mode === "encrypt";
  elements.encryptTab.setAttribute("aria-selected", String(encryptActive));
  elements.decryptTab.setAttribute("aria-selected", String(!encryptActive));
  elements.encryptTab.tabIndex = encryptActive ? 0 : -1;
  elements.decryptTab.tabIndex = encryptActive ? -1 : 0;
  elements.encryptPanel.hidden = !encryptActive;
  elements.decryptPanel.hidden = encryptActive;
}

export function setSelectedFile(mode, file, formattedSize, isLarge) {
  const prefix = mode === "encrypt" ? "encrypt" : "decrypt";
  elements[`${prefix}FileName`].textContent = file.name;
  elements[`${prefix}FileSize`].textContent = formattedSize;
  elements[`${prefix}FileMeta`].hidden = false;
  elements[`${prefix}LargeWarning`].hidden = !isLarge;
}

export function clearSelectedFile(mode) {
  const prefix = mode === "encrypt" ? "encrypt" : "decrypt";
  elements[`${prefix}FileName`].textContent = "";
  elements[`${prefix}FileSize`].textContent = "";
  elements[`${prefix}FileMeta`].hidden = true;
  elements[`${prefix}LargeWarning`].hidden = true;
  elements[`${prefix}Input`].value = "";
}

export function setDropzoneActive(mode, active) {
  const dropzone = mode === "encrypt" ? elements.encryptDropzone : elements.decryptDropzone;
  dropzone.classList.toggle("dropzone--active", active);
}

export function setPassphraseMatch({ valid, empty }) {
  if (empty) {
    elements.passphraseMatch.textContent = "Use at least 8 characters; a longer passphrase is recommended.";
    elements.passphraseMatch.dataset.state = "neutral";
    return;
  }

  elements.passphraseMatch.textContent = valid
    ? "Passphrases match."
    : "Passphrases must match and contain at least 8 characters.";
  elements.passphraseMatch.dataset.state = valid ? "valid" : "invalid";
}

export function setSubmitEnabled(mode, enabled) {
  const button = mode === "encrypt" ? elements.encryptSubmit : elements.decryptSubmit;
  button.disabled = !enabled;
}

export function setBusy(mode, busy) {
  const button = mode === "encrypt" ? elements.encryptSubmit : elements.decryptSubmit;
  button.disabled = busy;
  button.classList.toggle("button--busy", busy);
  button.setAttribute("aria-busy", String(busy));

  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = mode === "encrypt" ? "Encrypting…" : "Decrypting…";
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

export function setStatus(mode, message, type = "info") {
  const status = mode === "encrypt" ? elements.encryptStatus : elements.decryptStatus;
  status.textContent = message;
  status.dataset.type = type;
  status.hidden = !message;
}

export function clearStatus(mode) {
  setStatus(mode, "");
}

export function setDownload(mode, { url, filename, label }) {
  const link = mode === "encrypt" ? elements.encryptDownload : elements.decryptDownload;
  link.href = url;
  link.download = filename;
  link.textContent = label;
  link.hidden = false;
}

export function clearDownload(mode) {
  const link = mode === "encrypt" ? elements.encryptDownload : elements.decryptDownload;
  link.removeAttribute("href");
  link.removeAttribute("download");
  link.hidden = true;
}

export function setCryptoUnavailable(message) {
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
