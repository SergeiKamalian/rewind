// Auto-merge for finished task PRs. Runs in GitHub Actions on a schedule.
// It merges only when every gate below passes. The gates are objective checks,
// so no agent can merge by just saying "ready". Any failed gate = no merge.
//
// Gates:
//  1. Auto-merge is enabled in .agentflow/config.yml.
//  2. The PR is a task PR (branch day-XX/...), targets the default branch, is not draft.
//  3. The PR has the label "qa: passed" (set only by the QA workflow), or the owner wrote "skip qa".
//  4. The linked task issue has "status: ready-to-merge", set at least grace_hours ago.
//  5. No "hold" label and no hold comment ("hold", "wait", "don't merge") after that.
//  6. The PR does not touch protected paths (the process itself, CI, agent rules).
//  7. Every check run on the head commit is green, and GitHub says it is mergeable.
//  8. No open blocking QA bug for this PR.

const HOLD_RE = /\b(hold|wait|don'?t merge|do not merge)\b/i;

function linkedIssues(body) {
  const out = new Set();
  const re = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  for (const m of (body || "").matchAll(re)) out.add(Number(m[1]));
  return [...out];
}

const names = (labels) =>
  labels.map((l) => (typeof l === "string" ? l : l.name));

function isProtected(file, patterns) {
  return patterns.some((p) =>
    p.endsWith("/") ? file.startsWith(p) : file === p,
  );
}

async function readyLabelTime(github, owner, repo, issue) {
  const events = await github.paginate(github.rest.issues.listEvents, {
    owner,
    repo,
    issue_number: issue,
    per_page: 100,
  });
  const added = events.filter(
    (e) => e.event === "labeled" && e.label?.name === "status: ready-to-merge",
  );
  return added.length ? Date.parse(added[added.length - 1].created_at) : null;
}

async function checkPr({ github, owner, repo, pr, cfg, ownerLogin, now }) {
  const why = [];
  const defaultBranch = cfg.defaultBranch;
  if (!/^day-\d+\//.test(pr.head.ref)) return { skip: true };
  if (pr.base.ref !== defaultBranch)
    why.push(
      `base is ${pr.base.ref}, not ${defaultBranch} (stacked; waits for its base)`,
    );
  if (pr.draft) why.push("PR is a draft");

  const prLabels = names(pr.labels);
  if (prLabels.includes("hold")) why.push("label hold on the PR");

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pr.number,
    per_page: 100,
  });
  const skipQa = comments.some(
    (c) =>
      c.user.login === ownerLogin &&
      /\bskip qa\b/i.test(c.body || "") &&
      !(c.body || "").includes("agentflow:conductor"),
  );
  if (!prLabels.includes("qa: passed") && !skipQa) why.push("no qa: passed");

  const issues = linkedIssues(pr.body);
  if (issues.length !== 1)
    why.push(`expected one linked task issue, found ${issues.length}`);
  let readySince = null;
  for (const n of issues) {
    const { data: issue } = await github.rest.issues.get({
      owner,
      repo,
      issue_number: n,
    });
    const il = names(issue.labels);
    if (!il.includes("task")) why.push(`#${n} is not a task`);
    if (il.includes("hold")) why.push(`label hold on #${n}`);
    if (!il.includes("status: ready-to-merge"))
      why.push(`#${n} is not status: ready-to-merge`);
    else {
      readySince = await readyLabelTime(github, owner, repo, n);
      const hours = readySince ? (now - readySince) / 3_600_000 : 0;
      if (hours < cfg.graceHours)
        why.push(`ready for ${hours.toFixed(1)}h, needs ${cfg.graceHours}h`);
    }
    const issueComments = await github.paginate(
      github.rest.issues.listComments,
      { owner, repo, issue_number: n, per_page: 100 },
    );
    comments.push(...issueComments);
  }

  const since = readySince ?? 0;
  const holds = comments.filter(
    (c) =>
      Date.parse(c.created_at) >= since &&
      !c.user.login.endsWith("[bot]") &&
      !(c.body || "").includes("agentflow:conductor") &&
      HOLD_RE.test(c.body || ""),
  );
  if (holds.length) why.push(`hold comment: ${holds[0].html_url}`);

  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pr.number,
    per_page: 100,
  });
  const touched = files
    .map((f) => f.filename)
    .filter((f) => isProtected(f, cfg.protectedPaths));
  if (touched.length)
    why.push(`touches protected paths: ${touched.slice(0, 5).join(", ")}`);

  const { data: checks } = await github.rest.checks.listForRef({
    owner,
    repo,
    ref: pr.head.sha,
    per_page: 100,
  });
  const runs = checks.check_runs.filter(
    (r) => r.name !== "sync" && r.name !== "log",
  );
  if (!runs.some((r) => /lint|test|build/i.test(r.name)))
    why.push("CI has not run on the head commit");
  const bad = runs.filter(
    (r) =>
      r.status !== "completed" ||
      !["success", "neutral", "skipped"].includes(r.conclusion),
  );
  if (bad.length)
    why.push(
      `checks not green: ${bad.map((r) => `${r.name}=${r.conclusion || r.status}`).join(", ")}`,
    );

  const { data: full } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: pr.number,
  });
  if (full.mergeable === false || full.mergeable_state === "dirty")
    why.push("merge conflicts");

  const { data: bugs } = await github.rest.issues.listForRepo({
    owner,
    repo,
    state: "open",
    labels: "qa",
    per_page: 100,
  });
  const blocking = bugs.filter(
    (b) =>
      (b.body || "").includes(`<!-- qa-pr: ${pr.number} -->`) &&
      names(b.labels).some((l) =>
        cfg.blocking.includes(l.replace("severity: ", "")),
      ),
  );
  if (blocking.length)
    why.push(
      `open blocking QA bugs: ${blocking.map((b) => `#${b.number}`).join(", ")}`,
    );

  return { why, issues, head: pr.head.sha };
}

module.exports = async ({ github, context, core, config, dryRun, only }) => {
  const { owner, repo } = context.repo;
  const am = config.auto_merge || {};
  const cfg = {
    defaultBranch: config.project?.default_branch || "main",
    graceHours: am.grace_hours ?? 6,
    protectedPaths: am.protected_paths || [
      ".github/",
      ".agentflow/",
      ".cursor/",
      "AGENTS.md",
      "qa/scenarios/",
    ],
    blocking: config.qa?.blocking_severities || ["critical", "major"],
  };
  const ownerLogin = (config.project?.repo || "").split("/")[0] || owner;
  if (!am.enabled) {
    core.notice("Auto-merge is disabled in .agentflow/config.yml");
    return [];
  }

  const prs = await github.paginate(github.rest.pulls.list, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });
  const results = [];
  for (const pr of prs) {
    if (only && pr.number !== Number(only)) continue;
    const r = await checkPr({
      github,
      owner,
      repo,
      pr,
      cfg,
      ownerLogin,
      now: Date.now(),
    });
    if (r.skip) continue;
    if (r.why.length) {
      core.info(`#${pr.number} not merged: ${r.why.join("; ")}`);
      results.push({ pr: pr.number, merged: false, why: r.why });
      continue;
    }
    if (dryRun) {
      core.info(`#${pr.number} would be merged (dry run)`);
      results.push({
        pr: pr.number,
        merged: false,
        why: ["dry run: all gates passed"],
      });
      continue;
    }
    await github.rest.pulls.merge({
      owner,
      repo,
      pull_number: pr.number,
      merge_method: "merge",
      sha: r.head,
    });
    core.info(`#${pr.number} merged`);
    results.push({ pr: pr.number, merged: true });

    // Tidy up: events from this token do not trigger other workflows.
    for (const n of r.issues) {
      for (const name of ["status: ready-to-merge"]) {
        await github.rest.issues
          .removeLabel({ owner, repo, issue_number: n, name })
          .catch(() => {});
      }
      await github.rest.issues
        .update({
          owner,
          repo,
          issue_number: n,
          state: "closed",
          state_reason: "completed",
        })
        .catch(() => {});
    }
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr.number,
      body: "Merged automatically: QA passed, CI green, no hold, ready for the grace period, no protected files touched.",
    });
    // Stacked PRs that were built on this branch now target the default branch.
    const stacked = prs.filter(
      (p) => p.base.ref === pr.head.ref && p.state === "open",
    );
    for (const s of stacked) {
      await github.rest.pulls.update({
        owner,
        repo,
        pull_number: s.number,
        base: cfg.defaultBranch,
      });
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: s.number,
        body: `Base changed to \`${cfg.defaultBranch}\` because #${pr.number} was merged.`,
      });
    }
  }
  return results;
};

module.exports.checkPr = checkPr;
module.exports.isProtected = isProtected;
