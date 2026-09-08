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
  clearDownload,
  clearSelectedFile,
  clearStatus,
  getUiElements,
  setBusy,
  setCryptoUnavailable,
  setDownload,
  setDropzoneActive,
  setMode,
  setPassphraseMatch,
  setSelectedFile,
  setStatus,
  setSubmitEnabled,
} from "./ui.js";

const ui = getUiElements();
const state = {
  mode: "encrypt",
  encryptFile: null,
  decryptFile: null,
  encryptDownloadUrl: null,
  decryptDownloadUrl: null,
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

function releaseDownload(mode) {
  const key = mode === "encrypt" ? "encryptDownloadUrl" : "decryptDownloadUrl";
  revokeDownloadUrl(state[key]);
  state[key] = null;
  clearDownload(mode);
}

function selectFile(mode, file) {
  if (!file) {
    return;
  }

  const key = mode === "encrypt" ? "encryptFile" : "decryptFile";
  state[key] = file;
  releaseDownload(mode);
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

function switchMode(mode) {
  state.mode = mode;
  setMode(mode);
}

function setUpDropzone(mode, dropzone, input) {
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
    selectFile(mode, event.dataTransfer?.files?.[0]);
  });

  input.addEventListener("change", () => selectFile(mode, input.files?.[0]));
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

async function handleEncrypt(event) {
  event.preventDefault();
  updateEncryptValidation();

  if (!state.encryptFile || ui.encryptSubmit.disabled) {
    return;
  }

  releaseDownload("encrypt");
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

  releaseDownload("decrypt");
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

function resetApp() {
  releaseDownload("encrypt");
  releaseDownload("decrypt");
  state.encryptFile = null;
  state.decryptFile = null;
  ui.encryptForm.reset();
  ui.decryptForm.reset();
  for (const button of ui.passwordToggles) {
    const target = document.querySelector(`#${button.dataset.passwordToggle}`);
    if (target instanceof HTMLInputElement) {
      target.type = "password";
    }
    button.textContent = "Show";
    button.setAttribute("aria-label", "Show passphrase");
  }
  clearSelectedFile("encrypt");
  clearSelectedFile("decrypt");
  clearStatus("encrypt");
  clearStatus("decrypt");
  setPassphraseMatch({ valid: false, empty: true });
  setSubmitEnabled("encrypt", false);
  setSubmitEnabled("decrypt", false);
  switchMode("encrypt");
}

function initialise() {
  if (!isWebCryptoAvailable()) {
    setCryptoUnavailable(
      "This browser does not expose the Web Crypto API required by SecurBrowser Toolkit.",
    );
    return;
  }

  ui.encryptTab.addEventListener("click", () => switchMode("encrypt"));
  ui.decryptTab.addEventListener("click", () => switchMode("decrypt"));
  ui.encryptTab.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "End") {
      event.preventDefault();
      switchMode("decrypt");
      ui.decryptTab.focus();
    }
  });
  ui.decryptTab.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "Home") {
      event.preventDefault();
      switchMode("encrypt");
      ui.encryptTab.focus();
    }
  });

  setUpDropzone("encrypt", ui.encryptDropzone, ui.encryptInput);
  setUpDropzone("decrypt", ui.decryptDropzone, ui.decryptInput);
  setUpPasswordToggles();

  for (const input of [ui.encryptPassphrase, ui.encryptConfirm]) {
    input.addEventListener("input", () => {
      releaseDownload("encrypt");
      clearStatus("encrypt");
      updateEncryptValidation();
    });
  }
  ui.decryptPassphrase.addEventListener("input", () => {
    releaseDownload("decrypt");
    clearStatus("decrypt");
    updateDecryptValidation();
  });
  ui.encryptForm.addEventListener("submit", handleEncrypt);
  ui.decryptForm.addEventListener("submit", handleDecrypt);
  ui.resetButton.addEventListener("click", resetApp);
  window.addEventListener("beforeunload", () => {
    revokeDownloadUrl(state.encryptDownloadUrl);
    revokeDownloadUrl(state.decryptDownloadUrl);
  });

  resetApp();
}

initialise();
