// File System Access has no exclusive-create primitive. Isolate each save in a new
// randomly named subfolder and fail on observed collisions. Never overwrite intentionally.
async function requireAbsent(directory, name, method) {
  try {
    await directory[method](name);
  } catch (error) {
    if (error?.name === "NotFoundError") return;
    throw error;
  }
  throw new Error("An existing file or directory would be overwritten.");
}

export async function saveToNewDirectory(root, files, name, onSaved = () => {}) {
  await requireAbsent(root, name, "getDirectoryHandle");
  const destination = await root.getDirectoryHandle(name, { create: true });
  for (const file of files) {
    const parts = file.path.split("/");
    const filename = parts.pop();
    let directory = destination;
    for (const part of parts) directory = await directory.getDirectoryHandle(part, { create: true });
    await requireAbsent(directory, filename, "getFileHandle");
    const handle = await directory.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(file.bytes);
      await writable.close();
    } catch (error) {
      try { await writable.abort(); } catch { /* A failed stream may already be closed. */ }
      throw error;
    }
    onSaved();
  }
  return name;
}
