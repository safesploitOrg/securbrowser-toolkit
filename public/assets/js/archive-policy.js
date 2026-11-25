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

  globalThis.SbtArchivePolicy = Object.freeze({ safePath, parseTechnicalListing });
})();
