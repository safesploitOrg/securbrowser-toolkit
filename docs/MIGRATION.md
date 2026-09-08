# Migration

## Original repository layout to v2+

The original application lived at repository root:

```text
index.html
assets/
```

SecurBrowser v2 and later use `public/` as the only deployable web root.

When applying a release to an existing Git checkout, extracting/copying new files does **not** remove tracked files that disappeared from the release. Remove the old web application explicitly:

```bash
git rm -r assets index.html
```

Then verify:

```bash
npm run layout:check
```

If those files remain, CI intentionally fails before the style check with an actionable migration message. This is the fix for the old root-file trailing-whitespace CI failure.

## v2.0.0 to v2.1.0

v2.1.0 adds Secure Archive:

- standard encrypted `.7z` creation;
- mandatory encrypted filenames (`-mhe=on`);
- local `.7z` decrypt/extract;
- pinned sevenzip-wasm 26.3.0 / 7-Zip 26.03 WebAssembly runtime;
- archive path, signature, metadata, entry and expansion safety checks;
- verification that generated archives cannot expose filenames with an incorrect passphrase;
- browser archive round-trip tests;
- Node.js 24 GitHub Actions.

Before serving or browser-testing Secure Archive, populate the generated vendor runtime:

```bash
npm run build:public
```

The generated vendor files are intentionally ignored by Git. CI and Pages deployment build and verify them automatically.

## Secure File compatibility

The SecurBrowser v2 `.enc` format is unchanged by v2.1.0. Existing v2 files remain compatible.

Legacy `Salted__` PBKDF2-SHA256/AES-CBC files also remain decryptable. New Secure File encryption always uses the authenticated v2 format.

## 7z compatibility

Secure Archive output is a standard 7z archive and does not require SecurBrowser for decryption. Recipients can use compatible 7z software and the passphrase.
