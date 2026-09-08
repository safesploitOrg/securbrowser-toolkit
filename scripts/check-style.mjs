import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = new URL("../", import.meta.url);
const ROOT_PATH = ROOT.pathname;
const INCLUDED_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".yml", ".yaml"]);
const EXCLUDED_DIRECTORIES = new Set(["node_modules", "playwright-report", "test-results", "coverage", "vendor"]);
const EXCLUDED_FILES = new Set(["package-lock.json"]);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".git") || EXCLUDED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collect(path)));
    } else if (
      INCLUDED_EXTENSIONS.has(extname(entry.name)) &&
      !EXCLUDED_FILES.has(entry.name)
    ) {
      files.push(path);
    }
  }

  return files;
}

const problems = [];
for (const path of await collect(ROOT_PATH)) {
  const content = await readFile(path, "utf8");
  const displayPath = relative(ROOT_PATH, path);

  if (!content.endsWith("\n")) {
    problems.push(`${displayPath}: missing final newline`);
  }

  for (const [index, line] of content.split("\n").entries()) {
    if (/[ \t]+$/.test(line)) {
      problems.push(`${displayPath}:${index + 1}: trailing whitespace`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log("PASS: repository text style checks.");
}
