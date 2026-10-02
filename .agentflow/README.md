# Agentflow

A process kit for building a project with AI agents, day by day, in public.
Copy it into a repo, fill the config, and the same process runs there.

## Roles

| Role | Who | What it does |
|---|---|---|
| Owner | a human | Sets direction, reads the journal, can write "hold" or "skip qa" on a PR. |
| Conductor | Claude, on a schedule | Plans tasks, launches coding agents part by part, reviews, runs the QA loop, merges, writes the journal. |
| Coder | Cursor cloud agents | Writes code. One fresh session per part. Test-first. |
| QA | Cursor agent in GitHub Actions | Tests the deployed preview in a browser like a user. Never sees the code. Files bugs with screenshots. |

## The loop

```
issue (task) ─► Part 1 ─► verify ─► Part 2 ─► ... ─► final review
                                                        │
                                                        ▼
                 merge ◄── ready ◄── QA passed ◄── QA (black-box on the preview)
                                         ▲               │ failed
                                         └── fix agent ◄─┘
```

- Morning: review, plan the next week when needed, full report.
- Evening: merge what passed review and QA, start the next task.
- Night: move parts forward.
- Sunday: full regression QA on production.

## Files

Generic (copy as is):

| Path | Purpose |
|---|---|
| `.agentflow/conductor.md` | The conductor's playbook. |
| `.agentflow/qa/agent-prompt.md` | Instructions for the black-box QA agent. |
| `.agentflow/scripts/qa-resolve.js` | Finds the preview URL, scenarios and known bugs. |
| `.agentflow/scripts/qa-report.js` | Turns the QA report into bug issues, a PR comment and labels. |
| `.github/workflows/qa.yml` | Runs QA on label `qa: requested`, weekly, or by hand. |
| `.github/workflows/status-labels.yml` | Keeps task and bug status labels in sync with events. |
| `.github/workflows/agent-log.yml` | Logs every event (comments, labels, pushes, reviews, CI, QA, deploys) to the `agentflow-log` branch. |
| `.github/workflows/auto-merge.yml`, `.agentflow/scripts/auto-merge.js` | Merges finished task PRs every evening when all gates pass (QA, CI, grace period, no hold, no protected files). |
| `.agentflow/scripts/log-event.js` | Turns one GitHub event into one log file with the actor's role. |
| `.github/ISSUE_TEMPLATE/day-task.md` | Task template with Parts and QA scenarios. |
| `.github/pull_request_template.md` | PR template. |
| `docs/decisions/0001-*.md`, `0002-*.md` | ADR practice and the agent workflow decision. |
| `.cursor/rules/00-core.mdc`, `90-lessons.mdc` | Core agent rules and the lessons file. |

Project-specific (write for each project):

| Path | Purpose |
|---|---|
| `.agentflow/config.yml` | Repo, owner identity, journal URL, preview and QA settings. |
| `AGENTS.md` | Stack, layout and code rules. Keep the sections Parts, QA and bug fixes, Commits. |
| `.cursor/rules/10-*.mdc`... | Rules for specific folders. |
| `qa/product.md` | What the product does, in user language. The only thing QA knows about it. |
| `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` | Design and plan. |

## Setting it up on a new repo

1. Copy the generic files. Write the project-specific ones.
2. Create an empty orphan branch `agentflow-log` for the agent log.
3. Labels: `task`, `priority`, `week-N`, `day-XX`, the five `status: ...` labels, `bug`, `qa`, `bug: new|fixing|fixed|verified|not-a-bug`, `severity: critical|major|minor`, `qa: requested|passed|failed|error`, `regression`, `hold`.
4. Connect the repo to Cursor (GitHub app) so `@cursor` comments start agents.
5. Connect the repo to a preview host (Vercel) so every PR gets a preview URL. Turn off login protection for previews, or QA cannot open them.
6. Add the repository secret `CURSOR_API_KEY` (a Cursor API key) for the QA workflow.
7. Protect the default branch: block force pushes, require CI.
8. Create the journal page and put its URL in the config.
9. Create the scheduled conductor task: "Read `.agentflow/conductor.md` and `.agentflow/config.yml` from the default branch of <repo> and follow them."
10. Write the first week of task issues and milestones.
