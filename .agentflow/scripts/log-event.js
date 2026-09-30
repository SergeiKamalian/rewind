// Writes one JSON file per GitHub event to the agent log branch, so every
// action of every agent can be studied later. Runs inside actions/github-script.
// One file per event: no shared file, no write conflicts between parallel runs.

const LOG_BRANCH = "agentflow-log";
const CONDUCTOR_MARK = "<!-- agentflow:conductor -->";

function roleOf(login, text) {
  if (!login) return "unknown";
  if (login === "cursor[bot]" || login === "cursoragent") return "coder";
  if (login === "github-actions[bot]") return "automation";
  if (login === "vercel[bot]") return "preview";
  if ((text || "").includes(CONDUCTOR_MARK)) return "conductor";
  if (login.endsWith("[bot]")) return "bot";
  return "owner";
}

const excerpt = (s, n = 1500) =>
  s ? String(s).replace(CONDUCTOR_MARK, "").trim().slice(0, n) : undefined;

const cursorAgentUrl = (s) =>
  (String(s || "").match(/https:\/\/cursor\.com\/agents\/[\w-]+/) || [])[0];

module.exports = async ({ github, context }) => {
  const { owner, repo } = context.repo;
  const p = context.payload;
  const ev = context.eventName;
  const now = new Date();
  const entry = {
    ts: now.toISOString(),
    event: ev,
    action: p.action,
    actor: p.sender?.login,
    role: "unknown",
    run: context.runId,
  };

  if (ev === "issue_comment") {
    const c = p.comment;
    Object.assign(entry, {
      actor: c.user.login,
      role: roleOf(c.user.login, c.body),
      number: p.issue.number,
      kind: p.issue.pull_request ? "pr" : "issue",
      title: p.issue.title,
      url: c.html_url,
      text: excerpt(c.body),
      cursorAgent: cursorAgentUrl(c.body),
      mentionsCursor: /^\s*@cursor/i.test(c.body || ""),
    });
  } else if (ev === "issues") {
    Object.assign(entry, {
      role: roleOf(p.sender?.login),
      number: p.issue.number,
      kind: "issue",
      title: p.issue.title,
      url: p.issue.html_url,
      label: p.label?.name,
      labels: p.issue.labels.map((l) => l.name),
      state: p.issue.state,
      stateReason: p.issue.state_reason,
      text: p.action === "opened" ? excerpt(p.issue.body, 3000) : undefined,
    });
  } else if (ev === "pull_request_target") {
    const pr = p.pull_request;
    Object.assign(entry, {
      role: roleOf(p.sender?.login),
      number: pr.number,
      kind: "pr",
      title: pr.title,
      url: pr.html_url,
      branch: pr.head.ref,
      head: pr.head.sha,
      label: p.label?.name,
      labels: pr.labels.map((l) => l.name),
      draft: pr.draft,
      merged: pr.merged,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
    });
    if (p.action === "synchronize" && p.before && p.after) {
      const { data } = await github.rest.repos
        .compareCommitsWithBasehead({
          owner,
          repo,
          basehead: `${p.before}...${p.after}`,
        })
        .catch(() => ({ data: { commits: [] } }));
      entry.commits = (data.commits || []).map((c) => ({
        sha: c.sha.slice(0, 7),
        author: c.commit.author?.email,
        role:
          c.commit.author?.email === "cursoragent@cursor.com"
            ? "coder"
            : "owner-or-conductor",
        message: c.commit.message.split("\n")[0],
        date: c.commit.author?.date,
      }));
      entry.forced = !!p.forced;
    }
  } else if (ev === "pull_request_review") {
    const r = p.review;
    Object.assign(entry, {
      actor: r.user.login,
      role: roleOf(r.user.login, r.body),
      number: p.pull_request.number,
      kind: "pr",
      title: p.pull_request.title,
      url: r.html_url,
      reviewState: r.state,
      text: excerpt(r.body, 3000),
    });
  } else if (ev === "workflow_run") {
    const w = p.workflow_run;
    Object.assign(entry, {
      role: "automation",
      workflow: w.name,
      status: w.status,
      conclusion: w.conclusion,
      branch: w.head_branch,
      head: w.head_sha?.slice(0, 7),
      url: w.html_url,
      trigger: w.event,
      startedAt: w.run_started_at,
      finishedAt: w.updated_at,
      seconds:
        w.run_started_at && w.updated_at
          ? Math.round(
              (Date.parse(w.updated_at) - Date.parse(w.run_started_at)) / 1000,
            )
          : undefined,
      prs: (w.pull_requests || []).map((x) => x.number),
    });
  } else if (ev === "deployment_status") {
    Object.assign(entry, {
      role: "preview",
      environment: p.deployment.environment,
      state: p.deployment_status.state,
      head: p.deployment.sha?.slice(0, 7),
      url:
        p.deployment_status.environment_url || p.deployment_status.target_url,
    });
  }

  for (const k of Object.keys(entry))
    if (entry[k] === undefined) delete entry[k];

  const day = entry.ts.slice(0, 10);
  const stamp = entry.ts.replace(/[:.]/g, "-");
  const tag = [entry.event, entry.action, entry.number]
    .filter(Boolean)
    .join("-");
  const path = `events/${day}/${stamp}-${tag}-${context.runId}-${context.runAttempt || 1}.json`;
  const content = Buffer.from(`${JSON.stringify(entry, null, 2)}\n`).toString(
    "base64",
  );
  // Parallel runs write to the same branch. A write can lose the race (409); retry.
  for (let attempt = 1; ; attempt++) {
    try {
      await github.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        branch: LOG_BRANCH,
        path,
        message: `log: ${tag}`,
        content,
      });
      break;
    } catch (e) {
      if (attempt >= 8 || ![409, 422, 500, 502, 503].includes(e.status))
        throw e;
      await new Promise((r) =>
        setTimeout(r, 500 * attempt + Math.random() * 1500),
      );
    }
  }
  return path;
};

module.exports.roleOf = roleOf;
module.exports.LOG_BRANCH = LOG_BRANCH;
