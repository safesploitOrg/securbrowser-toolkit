# Changelog

## 2.0.0

### Security

- Replaced new-file AES-256-CBC encryption with authenticated AES-256-GCM.
- Replaced the new-file KDF with PBKDF2-HMAC-SHA512 at 220,000 iterations.
- Increased new-file salt size to 128 bits and use a fresh 96-bit GCM nonce per encryption.
- Added a versioned binary format whose metadata is authenticated as AES-GCM AAD.
- Retained read-only compatibility with original `Salted__` PBKDF2-SHA256/AES-CBC files.
- Added restrictive CSP, referrer policy and documented hosting security headers.

### Architecture

- Moved the complete deployable application under `public/`.
- Split the original global script into UI, crypto, file-format, file utility and orchestration ES modules.
- Kept the deployed application at zero production npm dependencies.

### Quality

- Added Vitest unit tests for cryptography, file-format handling and utility functions.
- Added Playwright end-to-end tests for Chromium, Firefox and WebKit.
- Added ESLint, Prettier and HTML validation.
- Added CI, GitHub Pages deployment and Dependabot configuration.
- Pinned GitHub Actions to full commit SHAs and declared least-privilege workflow permissions.

### Frontend

- Rebuilt the interface with semantic HTML, responsive CSS Grid/Flexbox and accessible controls.
- Added keyboard-accessible operation tabs, file dropzones, labelled fields and live status messages.
- Added light/dark colour-scheme support and large-file memory warnings.
