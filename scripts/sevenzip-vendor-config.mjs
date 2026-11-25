export const SEVENZIP_VENDOR = {
  name: "sevenzip-wasm",
  release: "26.6.0",
  sevenZipVersion: "26.06",
  repository: "https://github.com/arktronic/sevenzip-wasm",
  sourceCommit: "eba9a8492d7b5c4c673b69314a6b75eb81f75742",
  assetName: "sevenzip-wasm.zip",
  assetUrl:
    "https://github.com/arktronic/sevenzip-wasm/releases/download/26.6.0/sevenzip-wasm.zip",
  assetSha256: "8c4dc98f02d35b6163416ba6a7f330ef321df78f8eebb81943c2af32e04bfdd6",
  destination: "public/vendor/sevenzip-wasm",
  files: [
    {
      sourcePath: "sevenzip-wasm/sevenzip-wasm.js",
      outputName: "sevenzip-wasm.js",
      runtime: true,
    },
    {
      sourcePath: "sevenzip-wasm/sevenzip-wasm.wasm",
      outputName: "sevenzip-wasm.wasm",
      runtime: true,
    },
    {
      sourcePath: "sevenzip-wasm/LICENSE",
      outputName: "LICENSE-sevenzip-wasm.txt",
      runtime: false,
    },
  ],
};
