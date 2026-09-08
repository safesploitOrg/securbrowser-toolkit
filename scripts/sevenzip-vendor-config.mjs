export const SEVENZIP_VENDOR = {
  name: "sevenzip-wasm",
  release: "26.3.0",
  sevenZipVersion: "26.03",
  repository: "https://github.com/arktronic/sevenzip-wasm",
  sourceCommit: "b4406198ad5399dc277cc13ab288f54b676aa411",
  assetName: "sevenzip-wasm.zip",
  assetUrl:
    "https://github.com/arktronic/sevenzip-wasm/releases/download/26.3.0/sevenzip-wasm.zip",
  assetSha256: "db58a8176f63be60c1701dd260b797ff01132f39e54bf40d7c4b205b5b030243",
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
