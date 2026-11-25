import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
    assert.equal(normaliseArchivePath("folder\\nested//file.txt"), "folder/nested/file.txt");
    assert.equal(safeExtractedPath("./folder/file.txt"), "folder/file.txt");
  });

  it("rejects traversal, absolute drive paths and empty paths", () => {
    assert.throws(() => normaliseArchivePath("../secret.txt"), /parent-directory traversal/i);
    assert.throws(() => normaliseArchivePath("C:\\secret.txt"), /absolute/i);
    assert.throws(() => normaliseArchivePath("/etc/passwd"), /absolute/i);
    assert.throws(() => normaliseArchivePath("./"), /empty/i);
  });

  it("sanitises archive output names", () => {
    assert.equal(archiveOutputFilename(" evidence:2026?.7z "), "evidence_2026_.7z");
    assert.equal(archiveOutputFilename("report.7z"), "report.7z");
    assert.equal(archiveOutputFilename("   "), "secure-files.7z");
  });

  it("recognises the 7z signature", () => {
    const valid = new Uint8Array([...SEVEN_ZIP_SIGNATURE, 0, 1, 2]);
    assert.equal(isSevenZipBytes(valid), true);
    assert.equal(isSevenZipBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04])), false);
  });

  it("totals selected input sizes", () => {
    assert.equal(
      totalArchiveInputBytes([
        { file: { size: 10 } },
        { file: { size: 25 } },
      ]),
      35,
    );
  });
});
