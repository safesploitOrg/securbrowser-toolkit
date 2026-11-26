import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const REGISTRY = "https://registry.npmjs.org";

function sameDependencies(left = {}, right = {}) {
  const keys = Object.keys(left).sort();
  return keys.length === Object.keys(right).length && keys.every((key) => Object.hasOwn(right, key) && left[key] === right[key]);
}

export function validateLockfile(manifest, lock) {
  if (lock.lockfileVersion !== 3 || !lock.packages || Array.isArray(lock.packages)) {
    throw new Error("Expected an npm v3 package lock; generate it with the pinned Node/npm toolchain.");
  }
  const root = lock.packages[""];
  if (!root || lock.name !== manifest.name || lock.version !== manifest.version || root.name !== manifest.name || root.version !== manifest.version) {
    throw new Error("The lockfile does not describe the current package.json name/version.");
  }
  for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    if (!sameDependencies(manifest[field], root[field])) throw new Error(`Lockfile ${field} differs from package.json.`);
  }
  if (Object.keys(manifest.dependencies || {}).length) throw new Error("Unexpected npm production dependencies.");
  for (const [name, version] of Object.entries(manifest.devDependencies || {})) {
    if (lock.packages[`node_modules/${name}`]?.version !== version) throw new Error(`Missing or mismatched pinned direct dependency: ${name}`);
  }
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path) continue;
    if (!path.startsWith("node_modules/") || entry.link || entry.inBundle || typeof entry.version !== "string") {
      throw new Error(`Unapproved non-registry package entry: ${path}`);
    }
    let url;
    try { url = new URL(entry.resolved); } catch { throw new Error(`Missing registry resolution: ${path}`); }
    if (url.origin !== REGISTRY || url.username || url.password || url.search || url.hash || !url.pathname.endsWith(".tgz")) {
      throw new Error(`Unapproved package source: ${path}`);
    }
    if (!/^sha512-[A-Za-z0-9+/]{86}==$/.test(entry.integrity || "")) {
      throw new Error(`Missing SHA-512 package integrity: ${path}`);
    }
  }
  return Object.keys(lock.packages).length - 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(process.argv[2] || ROOT);
  const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  let lock;
  try { lock = JSON.parse(readFileSync(join(directory, "package-lock.json"), "utf8")); }
  catch { throw new Error("Missing or invalid package-lock.json. Run bash scripts/prepare-lockfile.sh on a connected machine or the Prepare npm lockfile workflow."); }
  console.log(`PASS: npm lockfile describes ${validateLockfile(manifest, lock)} integrity-pinned packages.`);
}
