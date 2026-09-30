# Agent log

A record of every action in the agent workflow, kept so the process can be studied and improved.
Not code. Written only by automation.

- `events/YYYY-MM-DD/*.json`: one file per GitHub event (comments, labels, pushes, PRs, reviews, CI and QA runs). Written by `.github/workflows/agent-log.yml`.
- `runs/YYYY-MM-DD/*.json`: one file per conductor run: what it saw, what it decided and why, what it did. Written by the conductor.
- `qa/<run id>/`: raw output of each QA run: the agent's report and log.
- `retros/`: weekly retrospectives built from the files above.

Each actor has a role:
- `conductor`: Claude on a schedule. Its GitHub comments carry the marker `<!-- agentflow:conductor -->`.
- `owner`: the human owner acting by hand.
- `coder`: the Cursor agent (`cursor[bot]`, commits by `cursoragent@cursor.com`).
- `automation`: GitHub Actions (labels, QA filing, CI).
- `preview`: Vercel.
