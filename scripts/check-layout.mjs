import { access } from "node:fs/promises";
import { constants } from "node:fs";

const obsoletePaths = ["index.html", "assets"];
const found = [];

for (const path of obsoletePaths) {
  try {
    await access(path, constants.F_OK);
    found.push(path);
  } catch {
    // Expected: the deployable web application lives only under /public.
  }
}

if (found.length > 0) {
  console.error("Obsolete root web-app files are still present:");
  for (const path of found) {
    console.error(`  - ${path}`);
  }
  console.error("");
  console.error("SecurBrowser v2+ serves only /public. Remove the old tracked files with:");
  console.error("  git rm -r assets index.html");
  process.exitCode = 1;
} else {
  console.log("PASS: deployable web application is isolated under /public");
}
