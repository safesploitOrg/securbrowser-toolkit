import { describe, expect, it } from "vitest";
import {
  decryptedFilename,
  encryptedFilename,
  formatFileSize,
} from "../../public/assets/js/file-utils.js";

describe("formatFileSize", () => {
  it.each([
    [0, "0 Bytes"],
    [1, "1 Byte"],
    [1024, "1.00 KB"],
    [1024 * 1024, "1.00 MB"],
    [5 * 1024 * 1024 * 1024, "5.00 GB"],
  ])("formats %i bytes", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe("output filenames", () => {
  it("adds .enc when encrypting", () => {
    expect(encryptedFilename("report.pdf")).toBe("report.pdf.enc");
  });

  it.each([
    ["report.pdf.enc", "report.pdf"],
    ["report.enc", "report"],
    ["thing.enc.enc", "thing.enc"],
    ["report.pdf", "report.pdf"],
  ])("maps %s to %s when decrypting", (input, expected) => {
    expect(decryptedFilename(input)).toBe(expected);
  });
});
