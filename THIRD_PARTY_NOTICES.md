# Third-party notices

## sevenzip-wasm / 7-Zip

Secure Archive uses the `sevenzip-wasm` browser WebAssembly build of the official 7-Zip codebase.

Pinned upstream details:

- Project: https://github.com/arktronic/sevenzip-wasm
- Release: `26.3.0`
- Upstream 7-Zip version: 26.03
- Source/tag commit: `b4406198ad5399dc277cc13ab288f54b676aa411`
- Release asset: `sevenzip-wasm.zip`
- Release asset SHA-256: `db58a8176f63be60c1701dd260b797ff01132f39e54bf40d7c4b205b5b030243`

The build generates:

- `public/vendor/sevenzip-wasm/sevenzip-wasm.js`
- `public/vendor/sevenzip-wasm/sevenzip-wasm.wasm`
- `public/vendor/sevenzip-wasm/LICENSE-sevenzip-wasm.txt`
- `public/vendor/sevenzip-wasm/manifest.json`

`npm run build:public` verifies the complete immutable GitHub release asset by SHA-256 before extracting the selected runtime/licence files. The deployed application loads those files only from its own origin.

The upstream package identifies its licence as **GNU LGPL 2.1 with the unRAR licence restriction**. The 7-Zip source tree also contains identified BSD/public-domain components. The pinned upstream licence text is shipped alongside the generated runtime.

SecurBrowser's UI intentionally exposes only 7z creation/extraction, not RAR creation or general-purpose archive-format access. SecurBrowser's own source remains MIT licensed; third-party runtime components retain their upstream terms.
