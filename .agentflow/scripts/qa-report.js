// Turns the QA agent's report into GitHub actions: bug issues with screenshots,
// closing bugs that were verified as fixed, a PR comment and PR labels.
// Runs inside actions/github-script with the workflow token. The agent never
// gets this token; it only writes files into `outDir`.

const fs = require("node:fs");
const path = require("node:path");
const { QA_MARKER } = require("./qa-resolve.js");

const SEVERITIES = ["critical", "major", "minor"];
const ASSETS_BRANCH = "qa-assets";
const BUG_STATUS = [
  "bug: new",
  "bug: fixing",
  "bug: fixed",
  "bug: verified",
  "bug: not-a-bug",
];

async function setBugStatus(github, owner, repo, number, next) {
  const { data: issue } = await github.rest.issues.get({
    owner,
    repo,
    issue_number: number,
  });
  for (const l of issue.labels) {
    const name = typeof l === "string" ? l : l.name;
    if (BUG_STATUS.includes(name) && name !== next)
      await github.rest.issues
        .removeLabel({ owner, repo, issue_number: number, name })
        .catch(() => {});
  }
  await github.rest.issues.addLabels({
    owner,
    repo,
    issue_number: number,
    labels: [next],
  });
}

const PR_LABELS = ["qa: requested", "qa: passed", "qa: failed", "qa: error"];

function readReport(outDir) {
  const file = path.join(outDir, "report.json");
  if (!fs.existsSync(file))
    return { error: "The QA agent did not write report.json." };
  try {
    const r = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(r.scenarios) || !Array.isArray(r.bugs))
      return { error: "report.json has the wrong shape." };
    return { report: r };
  } catch (e) {
    return { error: `report.json is not valid JSON: ${e.message}` };
  }
}

async function ensureAssetsBranch(github, owner, repo) {
  try {
    await github.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${ASSETS_BRANCH}`,
    });
    return;
  } catch {}
  const readme =
    "Screenshots attached to QA bug reports. Written by the QA workflow. Not code.\n";
  const { data: blob } = await github.rest.git.createBlob({
    owner,
    repo,
    content: readme,
    encoding: "utf-8",
  });
  const { data: tree } = await github.rest.git.createTree({
    owner,
    repo,
    tree: [{ path: "README.md", mode: "100644", type: "blob", sha: blob.sha }],
  });
  const { data: commit } = await github.rest.git.createCommit({
    owner,
    repo,
    message: "chore: start qa-assets branch",
    tree: tree.sha,
    parents: [],
  });
  await github.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${ASSETS_BRANCH}`,
    sha: commit.sha,
  });
}

async function uploadShot(github, owner, repo, outDir, rel, destDir) {
  const src = path.resolve(outDir, String(rel).replace(/^\.?\/?out\//, ""));
  if (!src.startsWith(path.resolve(outDir)) || !fs.existsSync(src)) return null;
  if (!/\.(png|jpe?g|webp|gif)$/i.test(src)) return null;
  const size = fs.statSync(src).size;
  if (size > 5 * 1024 * 1024) return null;
  const dest = `${destDir}/${path.basename(src).replace(/[^\w.-]/g, "_")}`;
  await github.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    branch: ASSETS_BRANCH,
    path: dest,
    message: `chore(qa): add screenshot ${dest}`,
    content: fs.readFileSync(src).toString("base64"),
  });
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ASSETS_BRANCH}/${dest}`;
}

function bugBody(bug, meta, shots, runUrl) {
  const steps = (bug.steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n");
  const found =
    meta.mode === "pr"
      ? `Found by black-box QA while testing PR #${meta.pr}${meta.issue ? ` (task #${meta.issue})` : ""}.`
      : "Found by the weekly black-box regression run.";
  return [
    found,
    "",
    `**Severity:** ${bug.severity}`,
    `**Tested on:** ${meta.url}${bug.viewport ? ` (${bug.viewport})` : ""}`,
    bug.scenario ? `**Scenario:** ${bug.scenario}` : null,
    "",
    "### Steps to reproduce",
    steps || "_not given_",
    "",
    "### Expected",
    bug.expected || "_not given_",
    "",
    "### Actual",
    bug.actual || "_not given_",
    bug.console
      ? `\n### Console\n\`\`\`\n${String(bug.console).slice(0, 2000)}\n\`\`\``
      : null,
    shots.length
      ? `\n### Screenshots\n${shots.map((u) => `![screenshot](${u})`).join("\n")}`
      : null,
    "",
    `[QA run](${runUrl})`,
    meta.mode === "pr" ? QA_MARKER(meta.pr) : "<!-- qa-regression -->",
  ]
    .filter((x) => x !== null)
    .join("\n");
}

module.exports = async ({
  github,
  context,
  core,
  config,
  inputDir,
  outDir,
}) => {
  const { owner, repo } = context.repo;
  const meta = JSON.parse(
    fs.readFileSync(path.join(inputDir, "meta.json"), "utf8"),
  );
  const known = JSON.parse(
    fs.readFileSync(path.join(inputDir, "known-bugs.json"), "utf8"),
  );
  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;
  const blocking = config.qa?.blocking_severities ?? ["critical", "major"];
  const maxBugs = config.qa?.max_bugs_per_run ?? 10;

  const setPrLabel = async (label) => {
    if (meta.mode !== "pr") return;
    for (const name of PR_LABELS) {
      if (name !== label)
        await github.rest.issues
          .removeLabel({ owner, repo, issue_number: meta.pr, name })
          .catch(() => {});
    }
    await github.rest.issues.addLabels({
      owner,
      repo,
      issue_number: meta.pr,
      labels: [label],
    });
  };
  const prComment = async (body) => {
    if (meta.mode === "pr")
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: meta.pr,
        body,
      });
  };

  if (meta.error) {
    const why =
      meta.error === "preview_failed"
        ? "the preview deployment failed"
        : "no preview URL was found";
    await prComment(`### QA could not run\nReason: ${why}. [Run](${runUrl})`);
    await setPrLabel("qa: error");
    return { status: "error" };
  }

  const { report, error } = readReport(outDir);
  if (error) {
    await prComment(`### QA run failed\n${error} [Run](${runUrl})`);
    await setPrLabel("qa: error");
    return { status: "error" };
  }

  await ensureAssetsBranch(github, owner, repo);
  const destDir = `${meta.mode === "pr" ? `pr-${meta.pr}` : "regression"}/run-${context.runId}`;

  // New bugs.
  const created = [];
  for (const bug of report.bugs.slice(0, maxBugs)) {
    const severity = SEVERITIES.includes(bug.severity) ? bug.severity : "major";
    const shots = [];
    for (const rel of (bug.screenshots || []).slice(0, 4)) {
      const u = await uploadShot(
        github,
        owner,
        repo,
        outDir,
        rel,
        destDir,
      ).catch(() => null);
      if (u) shots.push(u);
    }
    const labels = ["bug", "qa", "bug: new", `severity: ${severity}`];
    if (meta.mode === "regression") labels.push("regression");
    const { data: issue } = await github.rest.issues.create({
      owner,
      repo,
      title: `[QA] ${String(bug.title || "Untitled bug").slice(0, 120)}`,
      body: bugBody({ ...bug, severity }, meta, shots, runUrl),
      labels,
    });
    created.push({ number: issue.number, title: bug.title, severity });
  }

  // Known bugs the agent re-checked.
  const knownNumbers = new Set(known.map((k) => k.number));
  const fixed = (report.fixed || [])
    .map(Number)
    .filter((n) => knownNumbers.has(n));
  for (const n of fixed) {
    await setBugStatus(github, owner, repo, n, "bug: verified");
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: n,
      body: `Verified fixed by QA. [Run](${runUrl})`,
    });
    await github.rest.issues.update({
      owner,
      repo,
      issue_number: n,
      state: "closed",
      state_reason: "completed",
    });
  }
  const stillOpen = known
    .filter((k) => !fixed.includes(k.number))
    .map((k) => k.number);
  for (const n of stillOpen) {
    const { data: i } = await github.rest.issues.get({
      owner,
      repo,
      issue_number: n,
    });
    const names = i.labels.map((l) => (typeof l === "string" ? l : l.name));
    if (names.includes("bug: fixed") || names.includes("bug: fixing")) {
      await setBugStatus(github, owner, repo, n, "bug: new");
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: n,
        body: `QA re-checked: still reproduces. [Run](${runUrl})`,
      });
    }
  }

  // Is anything blocking?
  let blockingOpen = created
    .filter((b) => blocking.includes(b.severity))
    .map((b) => b.number);
  for (const n of stillOpen) {
    const { data: i } = await github.rest.issues.get({
      owner,
      repo,
      issue_number: n,
    });
    const sev = i.labels
      .map((l) => (typeof l === "string" ? l : l.name))
      .find((l) => l.startsWith("severity: "));
    if (sev && blocking.includes(sev.slice(10))) blockingOpen.push(n);
  }
  blockingOpen = [...new Set(blockingOpen)];

  const passed = blockingOpen.length === 0;
  const rows = report.scenarios.map(
    (s) =>
      `| ${s.result === "pass" ? "✅" : s.result === "fail" ? "❌" : "⚠️"} | ${String(s.title || s.id || "").replace(/\|/g, "/")} | ${String(
        s.notes || "",
      )
        .replace(/\|/g, "/")
        .slice(0, 200)} |`,
  );
  const body = [
    `### QA ${passed ? "passed" : "failed"}`,
    `Tested ${meta.url} as a user, without access to the code.`,
    "",
    report.summary || "",
    "",
    "| | Scenario | Notes |",
    "|---|---|---|",
    ...rows,
    "",
    created.length
      ? `**New bugs:** ${created.map((b) => `#${b.number} (${b.severity})`).join(", ")}`
      : "**New bugs:** none",
    fixed.length
      ? `**Verified fixed:** ${fixed.map((n) => `#${n}`).join(", ")}`
      : null,
    stillOpen.length
      ? `**Still open:** ${stillOpen.map((n) => `#${n}`).join(", ")}`
      : null,
    blockingOpen.length
      ? `**Blocking merge:** ${blockingOpen.map((n) => `#${n}`).join(", ")}`
      : null,
    "",
    `[QA run and full logs](${runUrl})`,
  ]
    .filter((x) => x !== null)
    .join("\n");
  await prComment(body);
  await setPrLabel(passed ? "qa: passed" : "qa: failed");

  core.summary.addRaw(body).write();
  return {
    status: passed ? "passed" : "failed",
    created,
    fixed,
    stillOpen,
    blockingOpen,
  };
};

module.exports.setBugStatus = setBugStatus;
module.exports.BUG_STATUS = BUG_STATUS;
