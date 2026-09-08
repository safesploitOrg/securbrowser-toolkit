# Migration from the original release to v2

## Hosting path

The deployable web application moved from the repository root to `public/`.

Change a web server document root from the repository root to:

```text
/path/to/securbrowser-toolkit/public
```

For GitHub Pages, use the included Actions deployment workflow rather than branch-folder publishing.

## Local use

The v2 JavaScript is split into ES modules. Opening `index.html` directly through `file://` is therefore no longer a supported execution mode.

Use:

```bash
npm run dev
```

or any static HTTP server pointed at `public/`.

## Encrypted files

- Existing legacy `Salted__` files remain decryptable in v2.
- New files are always written in the authenticated SecurBrowser v2 format.
- The original pre-v2 application cannot decrypt new v2 files.
- After successfully decrypting a legacy file, re-encrypt it with v2 when practical to gain authenticated integrity and the stronger KDF work factor.

Do not delete the only copy of an encrypted file during migration. Verify decryption before replacing archived legacy data.
