// Classic worker-compatible policy, also loaded by dependency-free Node tests.
// Technical listings are text, not a trustworthy structured archive API.
(() => {
  function reject(message, code = "INVALID_ARCHIVE_METADATA") {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function safePath(input) {
    if (typeof input !== "string" || input.length > 4096 || /^[\\/]/.test(input) || /^[a-zA-Z]:/.test(input)) reject("Unsafe archive entry path.", "UNSAFE_ARCHIVE_PATH");
    // Reject control characters rather than accepting ambiguous line-based metadata.
    if ([...input].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) reject("Unsafe archive entry path.", "UNSAFE_ARCHIVE_PATH");
    const parts = input.replaceAll("\\", "/").split("/").filter((part) => part && part !== ".");
    if (!parts.length || parts.length > 64 || parts.some((part) => part === ".." || part.length > 255) || /^[a-zA-Z]:/.test(parts.join("/"))) reject("Unsafe archive entry path.", "UNSAFE_ARCHIVE_PATH");
    return parts.join("/");
  }

  function parseTechnicalListing(lines, limits) {
    const entries = new Map();
    let inEntries = false;
    let current = null;
    let totalBytes = 0;
    const commit = () => {
      if (!current) return;
      const path = safePath(current.path);
      if (!/^\d+$/.test(current.size ?? "")) reject("Missing or invalid archive size.");
      const size = Number(current.size);
      if (!Number.isSafeInteger(size)) reject("Invalid archive size.");
      if (current.folder !== undefined && !["+", "-"].includes(current.folder)) reject("Invalid archive folder flag.");
      const folder = current.folder === "+" || current.attributes?.startsWith("D") === true;
      if (folder && size !== 0) reject("Directory declares non-zero data size.");
      if (entries.has(path)) reject("Duplicate archive entry path.");
      entries.set(path, { path, size, folder });
      totalBytes += size;
      if (entries.size > limits.maxEntries) reject("Archive entry count exceeds the limit.", "ARCHIVE_ENTRY_LIMIT");
      if (!Number.isSafeInteger(totalBytes) || totalBytes > limits.maxBytes) reject("Declared extraction size exceeds the limit.", "ARCHIVE_EXPANSION_LIMIT");
      current = null;
    };
    for (const raw of lines) {
      const line = String(raw);
      if (!inEntries) {
        if (line.trim() === "----------") inEntries = true;
        continue;
      }
      if (!line.trim()) { commit(); continue; }
      if (line.startsWith("Path = ")) {
        commit();
        current = { path: line.slice(7) };
        continue;
      }
      if (!current || !/^[A-Za-z][A-Za-z0-9 _-]* = /.test(line)) reject("Ambiguous archive listing metadata.");
      const split = line.indexOf(" = ");
      const key = line.slice(0, split);
      const value = line.slice(split + 3);
      const fields = { Size: "size", Folder: "folder", Attributes: "attributes" };
      const field = Object.hasOwn(fields, key) ? fields[key] : null;
      if (field) {
        if (Object.hasOwn(current, field)) reject("Duplicate archive metadata field.");
        current[field] = value;
      }
      if (["Symbolic Link", "Hard Link", "Alternate Stream"].includes(key) && value && value !== "-") reject("Unsupported special archive entry.", "UNSAFE_ARCHIVE_PATH");
      if (key === "Attributes" && /(?:^|\s)l[rwx-]{9}(?:\s|$)/.test(value)) reject("Symbolic links are not supported.", "UNSAFE_ARCHIVE_PATH");
    }
    commit();
    if (!inEntries) reject("Archive entry listing was not found.");
    if (!entries.size) reject("Archive contains no supported entries.");
    for (const entry of entries.values()) {
      const parts = entry.path.split("/");
      for (let index = 1; index < parts.length; index += 1) {
        const parent = entries.get(parts.slice(0, index).join("/"));
        if (parent && !parent.folder) reject("Archive path collides with a regular file.");
      }
    }
    return { entries: [...entries.values()], totalBytes };
  }

  // Only for a freshly generated archive, never as an extraction parser.
  // The pinned 7-Zip 26.06 engine emits an AES-only encoded header for
  // single-item archives. Reject every other shape rather than guessing.
  function verifySingleItemEncryptedHeader(bytes) {
    const invalid = () => reject("Generated single-item archive header encryption could not be independently verified.", "HEADER_ENCRYPTION_VERIFY_FAILED");
    const crc32 = (data) => {
      let crc = 0xffffffff;
      for (const byte of data) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
      return (crc ^ 0xffffffff) >>> 0;
    };
    if (!(bytes instanceof Uint8Array) || bytes.length < 32 || bytes.length > 1024 * 1024 * 1024 ||
        ![0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0, 4].every((byte, index) => bytes[index] === byte)) invalid();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(8, true) !== crc32(bytes.subarray(12, 32))) invalid();
    const offset = view.getBigUint64(12, true);
    const size = view.getBigUint64(20, true);
    // The outer header contains only one AES coder and bounded metadata.
    if (offset + size + 32n !== BigInt(bytes.length) || size === 0n || size > 256n) invalid();
    const header = bytes.subarray(32 + Number(offset));
    if (view.getUint32(28, true) !== crc32(header)) invalid();
    let cursor = 0;
    const take = () => {
      if (cursor >= header.length) invalid();
      return header[cursor++];
    };
    const expect = (...values) => { for (const value of values) if (take() !== value) invalid(); };
    // 7z variable-length unsigned integer, bounded to the generated archive.
    const number = () => {
      const first = take();
      let mask = 0x80;
      let value = 0n;
      for (let index = 0; index < 8; index += 1) {
        if (!(first & mask)) {
          value |= BigInt(first & (mask - 1)) << BigInt(index * 8);
          if (value > BigInt(bytes.length)) invalid();
          return Number(value);
        }
        value |= BigInt(take()) << BigInt(index * 8);
        mask >>>= 1;
      }
      if (value > BigInt(bytes.length)) invalid();
      return Number(value);
    };
    expect(0x17, 0x06); // EncodedHeader, PackInfo
    const packPosition = number();
    if (number() !== 1) invalid(); // Exactly one packed stream.
    expect(0x09); // Size
    const packSize = number();
    if (!packSize || packSize % 16 || packPosition + packSize !== Number(offset)) invalid();
    expect(0x00, 0x07, 0x0b); // End, UnpackInfo, Folder
    if (number() !== 1) invalid(); // Exactly one folder.
    expect(0x00); // Inline coder metadata.
    if (number() !== 1) invalid(); // Exactly one coder, AES-256 only.
    expect(0x24, 0x06, 0xf1, 0x07, 0x01); // 7zAES method with properties.
    if (number() !== 18) invalid();
    expect(0x53, 0x0f); // Pinned engine: 2^19 SHA-256 cycles, no salt, 16-byte IV.
    for (let index = 0; index < 16; index += 1) take();
    expect(0x0c); // CodersUnpackSize
    const unpackSize = number();
    if (!unpackSize || Math.ceil(unpackSize / 16) * 16 !== packSize) invalid();
    expect(0x0a, 0x01); // CRC of decoded header, present for the one folder.
    for (let index = 0; index < 4; index += 1) take();
    expect(0x00, 0x00); // No extra streams or plaintext metadata.
    if (cursor !== header.length) invalid();
    return true;
  }

  globalThis.SbtArchivePolicy = Object.freeze({ safePath, parseTechnicalListing, verifySingleItemEncryptedHeader });
})();
