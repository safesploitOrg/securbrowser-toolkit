import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.argv[2];
if (!ROOT) throw new Error("Supply the CodeQL SARIF report directory.");
const reports = (await readdir(ROOT)).filter((file) => file.endsWith(".sarif"));
if (!reports.length) throw new Error("SAST gate did not receive a SARIF report.");
let findings = 0;
for (const file of reports) {
  const report = JSON.parse(await readFile(join(ROOT, file), "utf8"));
  if (!Array.isArray(report.runs) || !report.runs.length) throw new Error("SARIF report has no runs.");
  for (const run of report.runs) {
    if (!Array.isArray(run.results) || !run.tool?.driver?.name) throw new Error("Invalid SARIF run.");
    if (run.invocations?.some((invocation) => invocation.executionSuccessful === false)) throw new Error("SAST execution failed.");
    findings += run.results.length;
    for (const result of run.results) console.error(`SAST finding: ${result.ruleId ?? "unknown rule"}`);
  }
}
if (findings) throw new Error(`${findings} SAST findings require review; no automatic waivers.`);
console.log("PASS: no findings in completed CodeQL SARIF reports.");
