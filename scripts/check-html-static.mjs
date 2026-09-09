import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const HTML_PATH = resolve(ROOT, "public/index.html");
const HTML_DIR = dirname(HTML_PATH);
const html = await readFile(HTML_PATH, "utf8");
const problems = [];

function lineNumber(offset) {
  return html.slice(0, offset).split("\n").length;
}

function parseAttributes(source) {
  const attributes = new Map();
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

const tags = [];
const tagPattern = /<([A-Za-z][\w:-]*)(\s[^<>]*?)?>/g;
for (const match of html.matchAll(tagPattern)) {
  tags.push({
    name: match[1].toLowerCase(),
    attributes: parseAttributes(match[2] ?? ""),
    line: lineNumber(match.index),
  });
}

const ids = new Map();
for (const tag of tags) {
  const id = tag.attributes.get("id");
  if (!id) {
    continue;
  }
  if (ids.has(id)) {
    problems.push(`public/index.html:${tag.line}: duplicate id "${id}" (first seen on line ${ids.get(id)})`);
  } else {
    ids.set(id, tag.line);
  }
}

for (const tag of tags) {
  for (const attribute of [
    "for",
    "aria-activedescendant",
    "aria-controls",
    "aria-describedby",
    "aria-details",
    "aria-errormessage",
    "aria-flowto",
    "aria-labelledby",
    "aria-owns",
  ]) {
    const value = tag.attributes.get(attribute);
    if (!value) {
      continue;
    }
    for (const referencedId of value.split(/\s+/).filter(Boolean)) {
      if (!ids.has(referencedId)) {
        problems.push(
          `public/index.html:${tag.line}: ${attribute} references missing id "${referencedId}"`,
        );
      }
    }
  }
}

const labelledIds = new Set(
  tags
    .filter((tag) => tag.name === "label" && tag.attributes.get("for"))
    .map((tag) => tag.attributes.get("for")),
);

for (const tag of tags) {
  if (tag.name === "button" && !tag.attributes.get("type")) {
    problems.push(`public/index.html:${tag.line}: button is missing an explicit type attribute`);
  }

  if (!["input", "select", "textarea"].includes(tag.name)) {
    continue;
  }

  const id = tag.attributes.get("id");
  const type = tag.attributes.get("type")?.toLowerCase();
  if (type === "hidden") {
    continue;
  }

  if (tag.name === "input" && type === "password") {
    const autocomplete = tag.attributes.get("autocomplete")?.toLowerCase();
    if (!autocomplete || autocomplete === "off") {
      problems.push(
        `public/index.html:${tag.line}: password input${id ? `#${id}` : ""} requires an explicit non-off autocomplete token`,
      );
    }
  }

  const hasAccessibleName =
    (id && labelledIds.has(id)) ||
    Boolean(tag.attributes.get("aria-label")) ||
    Boolean(tag.attributes.get("aria-labelledby"));

  if (!hasAccessibleName) {
    problems.push(
      `public/index.html:${tag.line}: ${tag.name}${id ? `#${id}` : ""} is missing an accessible label`,
    );
  }
}

if (/<script\b[^>]*>(?!\s*<\/script>)[\s\S]*?<\/script>/i.test(html)) {
  problems.push("public/index.html: inline script content is forbidden by the CSP");
}

if (/<style\b[^>]*>[\s\S]*?<\/style>/i.test(html)) {
  problems.push("public/index.html: inline style blocks are forbidden by the CSP");
}

for (const tag of tags) {
  const reference = tag.name === "script" ? tag.attributes.get("src") : tag.name === "link" ? tag.attributes.get("href") : null;
  if (!reference || /^(?:[a-z]+:|\/\/|#)/i.test(reference)) {
    continue;
  }

  const target = resolve(HTML_DIR, reference.split(/[?#]/, 1)[0]);
  try {
    await access(target);
  } catch {
    problems.push(`public/index.html:${tag.line}: local asset does not exist: ${reference}`);
  }
}

if (!/^<!doctype html>/i.test(html.trimStart())) {
  problems.push("public/index.html: missing HTML5 doctype");
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `PASS: static HTML checks (${ids.size} unique IDs, labels/references/assets verified).`,
  );
}
