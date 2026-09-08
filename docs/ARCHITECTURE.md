# Architecture

SecurBrowser Toolkit is intentionally a static browser application.

```text
Browser
  |
  +-- File API / Blob / Object URL
  |
  +-- Web Crypto API
  |     |
  |     +-- PBKDF2-HMAC-SHA512
  |     +-- AES-256-GCM
  |
  +-- ES modules
        |
        +-- app.js          Event wiring and application state
        +-- ui.js           DOM presentation only
        +-- encryption.js   High-level encrypt/decrypt orchestration
        +-- crypto.js       Web Crypto primitives
        +-- file-format.js  v2 and legacy file parsing/encoding
        +-- file-utils.js   File names, sizes and downloads

No application backend
No account system
No file uploads
No analytics
No production npm dependencies
```

## Trust boundary

The application is designed so plaintext files and passphrases remain inside the user's browser process. Hosting infrastructure serves static application files only.

The project does not claim to protect against a compromised browser, malicious browser extension, compromised endpoint, malicious copy of the hosted application, or an attacker that can execute script in the page origin.

## Deployment boundary

Everything required at runtime is under `public/`. Repository automation, tests, documentation and development tooling remain outside the web root.
