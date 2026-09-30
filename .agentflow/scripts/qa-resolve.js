// Resolves what the QA run should test: which URL, which scenarios, which
// known bugs to re-check. Runs inside actions/github-script.
// Writes everything the QA agent may see into `inputDir`. Nothing here gives
// the agent access to source code or to a GitHub token.

const fs = require("node:fs");
const path = require("node:path");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QA_MARKER = (pr) => `<!-- qa-pr: ${pr} -->`;

function linkedIssues(body) {
  const out = new Set();
  const re = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  for (const m of (body || "").matchAll(re)) out.add(Number(m[1]));
  return [...out];
}

function section(body, heading) {
  const lines = (body || "").split(/\r?\n/);
  const start = lines.findIndex(
    (l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase(),
  );
  if (start < 0) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n").trim();
}

async function successfulDeploymentUrl(
  github,
  owner,
  repo,
  { sha, environment },
) {
  const params = { owner, repo, per_page: 30 };
  if (sha) params.sha = sha;
  if (environment) params.environment = environment;
  const { data: deployments } = await github.rest.repos.listDeployments(params);
  for (const d of deployments) {
    const { data: statuses } = await github.rest.repos.listDeploymentStatuses({
      owner,
      repo,
      deployment_id: d.id,
      per_page: 10,
    });
    const ok = statuses.find((s) => s.state === "success");
    if (ok) return ok.environment_url || ok.target_url || null;
    if (statuses.some((s) => s.state === "failure" || s.state === "error")) {
      return { failed: true, url: statuses[0].target_url };
    }
  }
  return null;
}

module.exports = async ({
  github,
  context,
  core,
  config,
  inputs,
  inputDir,
}) => {
  const { owner, repo } = context.repo;
  fs.mkdirSync(inputDir, { recursive: true });

  let mode = "regression";
  let prNumber = null;
  if (context.eventName === "pull_request_target")
    prNumber = context.payload.pull_request.number;
  else if (inputs?.pr) prNumber = Number(inputs.pr);
  if (prNumber) mode = "pr";

  const meta = {
    mode,
    pr: prNumber,
    issue: null,
    url: null,
    sha: null,
    run: context.runId,
  };
  let scenarios = "";
  let knownBugs = [];

  if (mode === "pr") {
    const { data: pr } = await github.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    meta.sha = pr.head.sha;
    const issues = linkedIssues(pr.body);
    meta.issue = issues[0] ?? null;
    if (meta.issue) {
      const { data: issue } = await github.rest.issues.get({
        owner,
        repo,
        issue_number: meta.issue,
      });
      scenarios = section(issue.body, "QA scenarios");
    }
    if (!scenarios)
      scenarios =
        "No task-specific scenarios were written. Run the smoke check from product.md.";

    // Bugs QA already reported on this PR and that are still open: the agent re-checks them.
    const { data: open } = await github.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      labels: "qa",
      per_page: 100,
    });
    knownBugs = open
      .filter(
        (i) => !i.pull_request && (i.body || "").includes(QA_MARKER(prNumber)),
      )
      .map((i) => ({
        number: i.number,
        title: i.title,
        body: (i.body || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "[screenshot]"),
      }));
  } else {
    // Regression: every open QA bug is a known bug, so it is not reported twice.
    const { data: open } = await github.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      labels: "qa",
      per_page: 100,
    });
    knownBugs = open
      .filter((i) => !i.pull_request)
      .map((i) => ({ number: i.number, title: i.title, body: "" }));
    scenarios =
      "Full regression. Run every scenario file in qa/scenarios/, plus the smoke check from product.md.";
  }

  // Find the URL to test.
  let url = inputs?.url || null;
  if (!url && mode === "pr") {
    const deadline = Date.now() + (config.preview?.wait_minutes ?? 15) * 60_000;
    while (!url && Date.now() < deadline) {
      const found = await successfulDeploymentUrl(github, owner, repo, {
        sha: meta.sha,
      });
      if (found?.failed) {
        core.setFailed(`Preview deployment failed: ${found.url || "no link"}`);
        meta.error = "preview_failed";
        break;
      }
      if (typeof found === "string") url = found;
      else await sleep(30_000);
    }
  }
  if (!url && mode === "regression") {
    url = config.preview?.production_url || null;
    if (!url) {
      const found = await successfulDeploymentUrl(github, owner, repo, {
        environment: "Production",
      });
      if (typeof found === "string") url = found;
    }
  }
  meta.url = url;
  if (!url && !meta.error) meta.error = "no_preview";

  fs.writeFileSync(path.join(inputDir, "scenarios.md"), `${scenarios}\n`);
  fs.writeFileSync(
    path.join(inputDir, "known-bugs.json"),
    JSON.stringify(knownBugs, null, 2),
  );
  fs.writeFileSync(
    path.join(inputDir, "meta.json"),
    JSON.stringify(meta, null, 2),
  );

  core.setOutput("mode", mode);
  core.setOutput("pr", prNumber ? String(prNumber) : "");
  core.setOutput("url", url || "");
  core.setOutput("origin", url ? new URL(url).origin : "");
  core.setOutput("error", meta.error || "");
  return meta;
};

module.exports.section = section;
module.exports.linkedIssues = linkedIssues;
module.exports.QA_MARKER = QA_MARKER;
