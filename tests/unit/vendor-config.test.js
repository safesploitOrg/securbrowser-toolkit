import { describe, expect, it } from "vitest";
import { SEVENZIP_VENDOR } from "../../scripts/sevenzip-vendor-config.mjs";

describe("sevenzip-wasm vendor pin", () => {
  it("pins the current 7-Zip 26.03 browser build", () => {
    expect(SEVENZIP_VENDOR.name).toBe("sevenzip-wasm");
    expect(SEVENZIP_VENDOR.release).toBe("26.3.0");
    expect(SEVENZIP_VENDOR.sevenZipVersion).toBe("26.03");
    expect(SEVENZIP_VENDOR.sourceCommit).toBe(
      "b4406198ad5399dc277cc13ab288f54b676aa411",
    );
    expect(SEVENZIP_VENDOR.assetSha256).toBe(
      "db58a8176f63be60c1701dd260b797ff01132f39e54bf40d7c4b205b5b030243",
    );
  });

  it("vendors only same-origin runtime and licence files", () => {
    expect(SEVENZIP_VENDOR.destination).toBe("public/vendor/sevenzip-wasm");
    expect(SEVENZIP_VENDOR.files).toEqual([
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
