import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEVENZIP_VENDOR } from "../../scripts/sevenzip-vendor-config.mjs";

describe("sevenzip-wasm vendor pin", () => {
  it("pins the current 7-Zip 26.06 browser build", () => {
    assert.equal(SEVENZIP_VENDOR.name, "sevenzip-wasm");
    assert.equal(SEVENZIP_VENDOR.release, "26.6.0");
    assert.equal(SEVENZIP_VENDOR.sevenZipVersion, "26.06");
    assert.equal(SEVENZIP_VENDOR.sourceCommit, "eba9a8492d7b5c4c673b69314a6b75eb81f75742");
    assert.equal(
      SEVENZIP_VENDOR.assetSha256,
      "8c4dc98f02d35b6163416ba6a7f330ef321df78f8eebb81943c2af32e04bfdd6",
    );
  });

  it("vendors only same-origin runtime and licence files", () => {
    assert.equal(SEVENZIP_VENDOR.destination, "public/vendor/sevenzip-wasm");
    assert.deepEqual(SEVENZIP_VENDOR.files, [
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
    ]);
  });
});
