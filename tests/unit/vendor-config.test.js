import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEVENZIP_VENDOR } from "../../scripts/sevenzip-vendor-config.mjs";

describe("sevenzip-wasm vendor pin", () => {
  it("pins the current 7-Zip 26.03 browser build", () => {
    assert.equal(SEVENZIP_VENDOR.name, "sevenzip-wasm");
    assert.equal(SEVENZIP_VENDOR.release, "26.3.0");
    assert.equal(SEVENZIP_VENDOR.sevenZipVersion, "26.03");
    assert.equal(SEVENZIP_VENDOR.sourceCommit, "b4406198ad5399dc277cc13ab288f54b676aa411");
    assert.equal(
      SEVENZIP_VENDOR.assetSha256,
      "db58a8176f63be60c1701dd260b797ff01132f39e54bf40d7c4b205b5b030243",
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
