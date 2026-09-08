# SecurBrowser Toolkit

SecurBrowser Toolkit is a static, browser-side utility for protecting files without uploading them to an application server.

It provides two deliberately different formats:

- **Secure File** — authenticated SecurBrowser `.enc` files using native Web Crypto.
- **Secure Archive** — standard password-protected `.7z` archives with encrypted filenames for interoperability with normal 7z-compatible software.

All application files live under [`public/`](public/), making the deployment boundary explicit for GitHub Pages, Nginx, Apache and other static hosting platforms.

## Features

### Secure File

- PBKDF2-HMAC-SHA512 with 220,000 iterations.
- 128-bit random salt.
- AES-256-GCM with a 96-bit random nonce and 128-bit authentication tag.
- Versioned SecurBrowser v2 file format with authenticated metadata.
- Decryption support for the previous `Salted__` PBKDF2-SHA256/AES-CBC format.
- Zero third-party cryptographic code: Secure File uses the browser's Web Crypto API.

See [`docs/FILE_FORMAT.md`](docs/FILE_FORMAT.md).

### Secure Archive

- Creates standard `.7z` archives.
- AES-256 encryption provided by 7-Zip.
- Header encryption is **always enabled** (`-mhe=on`), hiding filenames until the correct passphrase is supplied.
- Supports multiple files and browser folder selection where available.
- Store, Fast, Normal and Maximum compression presets.
- Tests every generated archive with a fresh 7-Zip runtime before enabling download.
- Decrypts and extracts encrypted `.7z` archives locally in the browser.
- Performs signature, path, entry-count and expansion-size checks before extraction.
- Skips symbolic links and special entries when collecting extracted data.
- Extracted files can be downloaded individually; browsers with the File System Access API can save a directory tree directly.

Secure Archive uses pinned **sevenzip-wasm 26.3.0**, built from **7-Zip 26.03**. The build step verifies GitHub's immutable release asset against SHA-256 `db58a8176f63be60c1701dd260b797ff01132f39e54bf40d7c4b205b5b030243` before extracting `sevenzip-wasm.js`, `sevenzip-wasm.wasm` and the upstream licence into `public/vendor/sevenzip-wasm/`. Runtime code is served locally and is never fetched from a CDN by the application.

See [`docs/SECURE_ARCHIVE.md`](docs/SECURE_ARCHIVE.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Privacy model

The web application does not need an upload API:

```text
Browser
  |
  +-- Secure File --> Web Crypto --> .enc
  |
  +-- Secure Archive --> Web Worker --> local sevenzip-wasm/WASM --> .7z / extracted files
```

Selected files and passphrases are processed in the browser. No analytics, remote fonts or CDN scripts are required by the application.

The hosting provider can still observe ordinary web requests for the static application itself. A compromised hosting origin can also replace browser-delivered code, so use HTTPS and appropriate deployment controls for sensitive use cases.

## Repository layout

```text
securbrowser-toolkit/
├── public/                    # Complete deployable web application after build
│   ├── index.html
│   ├── assets/
│   │   ├── css/
│   │   └── js/
│   └── vendor/sevenzip-wasm/ # Generated, pinned 7-Zip 26.03 runtime
├── tests/
│   ├── unit/
│   └── e2e/
├── scripts/
├── docs/
├── .github/workflows/
├── package.json
└── SECURITY.md
```

There must be **no root `index.html` or root `assets/` web application**. If upgrading an older checkout, see [Migration](#migration-from-the-original-layout).

## Development

Requirements:

- Node.js 22.16 or later; CI uses Node.js 24.
- npm.
- Network access the first time `public/vendor/sevenzip-wasm/` is populated.

Install development tooling:

```bash
npm install --ignore-scripts --no-audit --no-fund
```

Prepare and verify the pinned local archive runtime:

```bash
npm run build:public
```

Start the local server:

```bash
npm run dev
```

Open `http://127.0.0.1:4173/`.

After `npm run build:public`, the generated `public/` tree is self-contained for runtime hosting; no CDN or application API is required.

## Testing

```bash
npm run layout:check
npm run deps:production
npm run build:public
npm run style:check
npm run lint
npm run validate:html
npm run test:unit
npm run test:e2e
```

The test suite covers:

- SecurBrowser v2 encryption/decryption round trips.
- AES-GCM tamper and wrong-passphrase rejection.
- Legacy CBC compatibility.
- 7z path/signature/limit utility checks.
- Vendor pin configuration.
- Playwright browser round trips for Secure File and Secure Archive in Chromium, Firefox and WebKit.

The Secure Archive browser test creates an encrypted 7z, downloads it, feeds it back into the Extract 7z workflow and verifies extracted content. Generated archives are also tested internally by a second, fresh 7-Zip WASM instance before their download link is enabled.

`package.json` intentionally has no npm production `dependencies`; npm packages are development tooling only. Secure Archive has a vendored runtime dependency on sevenzip-wasm/7-Zip, documented below.

## sevenzip-wasm vendor pinning

The archive runtime is pinned in [`scripts/sevenzip-vendor-config.mjs`](scripts/sevenzip-vendor-config.mjs) to:

- sevenzip-wasm release `26.3.0`.
- upstream 7-Zip `26.03`.
- immutable GitHub release asset `sevenzip-wasm.zip`.
- release asset SHA-256 `db58a8176f63be60c1701dd260b797ff01132f39e54bf40d7c4b205b5b030243`.
- source/tag commit `b4406198ad5399dc277cc13ab288f54b676aa411`.

`npm run build:public` downloads only that pinned release asset, verifies the complete ZIP before extracting the browser runtime and upstream licence, and writes a local manifest. `npm run vendor:sevenzip:check` then verifies the generated local files against that manifest. The application itself never contacts GitHub, npm or a CDN at runtime.

Generated runtime files are ignored by Git so the source checkout remains small; CI and Pages prepare and verify them before browser testing/deployment. This pin deliberately uses 7-Zip 26.03 rather than older 24.x/25.x WASM builds because archive parsing is a security-sensitive dependency and later 26.x releases include relevant parser fixes.

## Migration from the original layout

The original project stored `index.html` and `assets/` at repository root. Merely extracting a new release over an existing checkout does not delete tracked Git files.

After upgrading, remove the old application explicitly:

```bash
git rm -r assets index.html
```

Then verify:

```bash
npm run layout:check
```

This prevents the old root files from causing style/CI failures or being accidentally deployed alongside `/public`.

See [`docs/MIGRATION.md`](docs/MIGRATION.md).

## Hosting

Build the generated runtime first and publish **only `public/`**:

```bash
npm run build:public
```

GitHub Pages deployment is configured in `.github/workflows/deploy-pages.yml`.

For other servers, see [`docs/HOSTING.md`](docs/HOSTING.md).

## Security

Read [`SECURITY.md`](SECURITY.md) for the threat model, limitations and vulnerability reporting process.

Important limitations include:

- File/archive operations use browser memory and are not suitable for arbitrarily large data sets.
- Secure File legacy CBC decryption cannot authenticate legacy ciphertext.
- A hostile or compromised hosting origin can replace JavaScript served to the browser.
- 7z security parameters are defined by the 7z format/implementation; they are not the PBKDF2-SHA512 + AES-GCM construction used by Secure File.
- `.7z` extraction is an attack surface. SecurBrowser limits accepted format/paths/sizes and performs extraction only inside the worker's virtual filesystem before any explicit save operation.

Security reports: `security@safesploit.com`.

## Licence

SecurBrowser Toolkit is licensed under the MIT Licence. sevenzip-wasm and the generated 7-Zip runtime retain their upstream licence terms; see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
