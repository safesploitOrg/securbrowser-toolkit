// Read-only checks supplement GitHub's native environment review gate.
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const ENVIRONMENT = "github-pages";
const API = "https://api.github.com";
const SHA = /^[a-f0-9]{40}$/;
const ID = /^\d+$/;

export function checkMainPush({ GITHUB_EVENT_NAME, GITHUB_REF, GITHUB_SHA }, currentSha) {
  if (GITHUB_EVENT_NAME !== "push" || GITHUB_REF !== "refs/heads/main" || !SHA.test(GITHUB_SHA || "") || currentSha !== GITHUB_SHA) {
    throw new Error("Only the current main-push revision may be promoted. Cancel stale runs.");
  }
}

export function checkEnvironment(environment, branches) {
  if (environment?.name !== ENVIRONMENT || !Number.isSafeInteger(environment.id)) {
    throw new Error("Configure the github-pages production environment before deployment.");
  }
  if (environment.can_admins_bypass === true) throw new Error("Disable administrator bypass for github-pages.");
  const rule = environment.protection_rules?.find((entry) => entry.type === "required_reviewers");
  const reviewers = rule?.reviewers?.filter((entry) => entry.type === "User" && Number.isSafeInteger(entry.reviewer?.id)).map((entry) => entry.reviewer.id) || [];
  if (!reviewers.length) throw new Error("Configure the project owner as a required User reviewer on github-pages.");
  const policy = environment.deployment_branch_policy;
  if (policy?.custom_branch_policies !== true || policy.protected_branches !== false || branches?.total_count !== 1 || branches.branch_policies?.length !== 1 || branches.branch_policies[0].name !== "main" || (branches.branch_policies[0].type !== undefined && branches.branch_policies[0].type !== "branch")) {
    throw new Error("Restrict github-pages to the single selected main branch (no tag or wildcard rules).");
  }
  return { id: environment.id, reviewers };
}

export function checkApproval(reviews, policy) {
  if (!Array.isArray(reviews)) throw new Error("Invalid environment review history.");
  // Native protection controls execution; this additionally checks a recorded
  // approval by a configured individual reviewer of this run/environment.
  const review = reviews.find((entry) => entry.state === "approved" && entry.user?.type === "User" && policy.reviewers.includes(entry.user.id) && entry.environments?.some((env) => env.id === policy.id && env.name === ENVIRONMENT) && typeof entry.comment === "string" && entry.comment.trim().length > 0);
  if (!review) throw new Error("Missing recorded github-pages owner approval. Include the release review/exception reference in your approval comment.");
  return review.user.login;
}

export function artifactIsReady(response, name, id) {
  if (!response || !Array.isArray(response.artifacts) || !Number.isSafeInteger(response.total_count)) throw new Error("Invalid artifact metadata response.");
  if (response.total_count === 0 && response.artifacts.length === 0) return false;
  if (response.total_count !== 1 || response.artifacts.length !== 1) throw new Error("Ambiguous Pages artifact metadata.");
  const artifact = response.artifacts[0];
  if (String(artifact.id) !== id || artifact.name !== name || artifact.expired !== false || !/^sha256:[a-f0-9]{64}$/.test(artifact.digest || "")) {
    throw new Error("Pages artifact does not match the expected immutable artifact or has expired.");
  }
  return true;
}

function createApi(env) {
  if (!env.GH_TOKEN || env.GITHUB_API_URL !== API || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(env.GITHUB_REPOSITORY || "")) {
    throw new Error("Expected a GitHub.com runner with a scoped read token.");
  }
  const base = `${API}/repos/${env.GITHUB_REPOSITORY}`;
  return async (path) => {
    const response = await fetch(`${base}${path}`, {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${env.GH_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`GitHub read-only policy check failed: HTTP ${response.status} (${path}).`);
    return response.json();
  };
}

async function main(env, mode) {
  if (mode !== "prepare" && mode !== "deploy") throw new Error("Usage: check-pages-policy.mjs prepare|deploy");
  if (!ID.test(env.GITHUB_RUN_ID || "")) throw new Error("Missing workflow run ID.");
  const api = createApi(env);
  const branch = await api("/branches/main");
  checkMainPush(env, branch.commit?.sha);
  const environment = await api(`/environments/${ENVIRONMENT}`);
  // Check the rule before requesting custom branch policies (404 otherwise).
  if (environment?.deployment_branch_policy?.custom_branch_policies !== true) throw new Error("Configure github-pages selected deployment branches with main only.");
  const branches = await api(`/environments/${ENVIRONMENT}/deployment-branch-policies?per_page=100`);
  const policy = checkEnvironment(environment, branches);
  if (mode === "prepare") {
    appendFileSync(env.GITHUB_OUTPUT, `environment_id=${policy.id}\n`);
    console.log("PASS: protected main-only github-pages environment with a required individual reviewer.");
    return;
  }
  if (String(policy.id) !== env.EXPECTED_ENVIRONMENT_ID) throw new Error("Production environment changed since candidate preparation.");
  const run = `/actions/runs/${env.GITHUB_RUN_ID}`;
  const reviewer = checkApproval(await api(`${run}/approvals`), policy);
  const name = env.PAGES_ARTIFACT_NAME;
  const id = env.PAGES_ARTIFACT_ID;
  if (!ID.test(id || "") || !new RegExp(`^github-pages-${env.GITHUB_RUN_ID}-[0-9]+$`).test(name || "")) throw new Error("Missing or invalid prepared Pages artifact identity.");
  // Listing immediately after upload failed in run 45729394024. Wait only
  // for visibility of the exact prepared artifact; never retry a deployment.
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    if (artifactIsReady(await api(`${run}/artifacts?name=${encodeURIComponent(name)}&per_page=100`), name, id)) {
      const head = await api("/branches/main");
      checkMainPush(env, head.commit?.sha);
      console.log(`PASS: recorded environment approval by ${reviewer}; exact Pages artifact ${id} is visible for this run.`);
      return;
    }
    if (attempt < 12) await delay(5000);
  }
  throw new Error("Prepared Pages artifact is not visible after bounded polling. Re-run the failed CD job only; do not rebuild or deploy another artifact.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.env, process.argv[2]);
}
