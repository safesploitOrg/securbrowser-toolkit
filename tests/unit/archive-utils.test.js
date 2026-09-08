import { describe, expect, it } from "vitest";
import {
  archiveOutputFilename,
  isSevenZipBytes,
  normaliseArchivePath,
  safeExtractedPath,
  SEVEN_ZIP_SIGNATURE,
  totalArchiveInputBytes,
} from "../../public/assets/js/archive-utils.js";

describe("archive utilities", () => {
  it("normalises safe relative archive paths", () => {
    expect(normaliseArchivePath("folder\\nested//file.txt")).toBe("folder/nested/file.txt");
    expect(safeExtractedPath("./folder/file.txt")).toBe("folder/file.txt");
  });

  it("rejects traversal, absolute drive paths and empty paths", () => {
    expect(() => normaliseArchivePath("../secret.txt")).toThrow(/parent-directory traversal/i);
    expect(() => normaliseArchivePath("C:\\secret.txt")).toThrow(/absolute/i);
    expect(() => normaliseArchivePath("/etc/passwd")).toThrow(/absolute/i);
    expect(() => normaliseArchivePath("./")).toThrow(/empty/i);
  });

  it("sanitises archive output names", () => {
    expect(archiveOutputFilename(" evidence:2026?.7z ")).toBe("evidence_2026_.7z");
    expect(archiveOutputFilename("report.7z")).toBe("report.7z");
    expect(archiveOutputFilename("   ")).toBe("secure-files.7z");
  });

  it("recognises the 7z signature", () => {
    const valid = new Uint8Array([...SEVEN_ZIP_SIGNATURE, 0, 1, 2]);
    expect(isSevenZipBytes(valid)).toBe(true);
    expect(isSevenZipBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(false);
  });

  it("totals selected input sizes", () => {
    expect(
      totalArchiveInputBytes([
        { file: { size: 10 } },
        { file: { size: 25 } },
      ]),
    ).toBe(35);
  });
});
