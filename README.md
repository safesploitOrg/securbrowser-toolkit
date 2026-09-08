# SecurBrowser Toolkit

SecurBrowser Toolkit is a small, browser-only file encryption utility. Files and passphrases are processed locally with the Web Crypto API; the deployed application has no backend and no production npm dependencies.

## Security design

New v2 encrypted files use:

- **PBKDF2-HMAC-SHA512** with **220,000 iterations**
- **128-bit random salt** per encryption
- **AES-256-GCM** authenticated encryption
- **96-bit random nonce** per encryption
- **128-bit GCM authentication tag**
- authenticated file-format metadata via AES-GCM Additional Authenticated Data (AAD)

Legacy files beginning with `Salted__` remain decryptable for compatibility. They use the original PBKDF2-HMAC-SHA256 / AES-256-CBC construction and are treated as unauthenticated legacy data. New encryption always writes the v2 format.

See [SECURITY.md](SECURITY.md) and [docs/FILE_FORMAT.md](docs/FILE_FORMAT.md) for the threat model and byte-level format.

## Architecture

```text
Browser
  |
  +-- File / Blob APIs
  |
  +-- Web Crypto API
  |     +-- PBKDF2-HMAC-SHA512
  |     +-- AES-256-GCM
  |
  +-- ES modules
        +-- app.js
        +-- ui.js
        +-- encryption.js
        +-- crypto.js
        +-- file-format.js
        +-- file-utils.js

Files --------X--------> application server
Passphrases ---X--------> application server
```

Everything required by the deployed application lives under `public/`:

```text
securbrowser-toolkit/
├── public/
│   ├── index.html
│   └── assets/
│       ├── css/app.css
│       └── js/
├── tests/
│   ├── unit/
│   └── e2e/
├── scripts/
├── docs/
├── .github/workflows/
└── package.json
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module boundaries and [docs/MIGRATION.md](docs/MIGRATION.md) when upgrading an existing deployment.

## Run locally

ES modules are used, so run the included local server rather than opening the HTML file through `file://`.

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:8080
```

The application itself still has **zero production npm dependencies**. npm packages are used only for repository testing and development tooling.

## Tests and quality checks

```bash
npm run deps:production
npm run style:check
npm run lint
npm run validate:html
npm run test:unit
npx playwright install chromium firefox webkit
npm run test:e2e
```

The test suite covers:

- empty, one-byte, text and binary-file encryption round trips
- Unicode passphrases
- randomised ciphertext for repeated encryption
- wrong-passphrase rejection
- ciphertext tampering detection
- authenticated metadata tampering detection
- legacy `Salted__` decryption compatibility
- file-format parsing and invalid/truncated headers
- filename and zero-byte size handling
- Chromium, Firefox and WebKit browser flows

## GitHub Actions

- `CI` runs formatting, linting, HTML validation, unit tests and cross-browser Playwright tests.
- `Deploy Pages` publishes only `public/` after a successful `CI` run on `main`.
- Actions are pinned to full commit SHAs.
- Dependabot tracks npm development tooling and GitHub Actions updates.

For GitHub Pages, select **GitHub Actions** as the Pages deployment source.

## Hosting

Point the web server document root at `public/`. See [docs/HOSTING.md](docs/HOSTING.md) for GitHub Pages and Nginx examples, including recommended response headers.

## Browser and memory considerations

Encryption and decryption currently load the complete file into browser memory. The UI warns for files of 250 MiB or larger. Very large-file streaming is deliberately not implemented in v2 because a secure streaming authenticated-encryption format should be designed explicitly rather than bolted onto AES-GCM.

## Credits

The original project was adapted from [meixler/web-browser-based-file-encryption-decryption](https://github.com/meixler/web-browser-based-file-encryption-decryption). SecurBrowser v2 substantially restructures the application and introduces a new authenticated file format while preserving legacy decryption compatibility.

## Licence

MIT. See [LICENSE](LICENSE).
