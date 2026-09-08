import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const dependencies = packageJson.dependencies || {};

if (Object.keys(dependencies).length > 0) {
  console.error("Production dependencies detected:", Object.keys(dependencies).join(", "));
  process.exitCode = 1;
} else {
  console.log("PASS: zero production npm dependencies.");
}
