import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decryptedFilename,
  encryptedFilename,
  formatFileSize,
} from "../../public/assets/js/file-utils.js";

describe("formatFileSize", () => {
  const CASES = [
    [0, "0 Bytes"],
    [1, "1 Byte"],
    [1024, "1.00 KB"],
    [1024 * 1024, "1.00 MB"],
    [5 * 1024 * 1024 * 1024, "5.00 GB"],
  ];

  for (const [bytes, expected] of CASES) {
    it(`formats ${bytes} bytes`, () => {
      assert.equal(formatFileSize(bytes), expected);
    });
  }
});

describe("output filenames", () => {
  it("adds .enc when encrypting", () => {
    assert.equal(encryptedFilename("report.pdf"), "report.pdf.enc");
  });

  const CASES = [
    ["report.pdf.enc", "report.pdf"],
    ["report.enc", "report"],
    ["thing.enc.enc", "thing.enc"],
    ["report.pdf", "report.pdf"],
  ];

  for (const [input, expected] of CASES) {
    it(`maps ${input} to ${expected} when decrypting`, () => {
      assert.equal(decryptedFilename(input), expected);
    });
  }
});
