# AGENTS.md

Rules for any AI agent (Cursor, Background Agent, others) working in this repo.
Read this file fully before you start a task.

## What this project is

Rewind is a time-travel debugger for web apps.
A small SDK records a user session in the browser: DOM, input, network, console, app state.
A player replays the session like a video.
You can pause at any moment and inspect the app at that point.
An AI layer reads the recording and explains the root cause of a bug.

See `docs/ARCHITECTURE.md` for the design and `docs/ROADMAP.md` for the plan.

## How work is organized

- Every task is a GitHub issue with the label `day-XX`.
- One issue = one pull request. Do not mix tasks.
- The issue has a "Definition of done" section. The PR is done only when every item is true.
- If the issue is unclear or blocked, do the safe part and explain the rest in the PR description.
- Never touch files outside the scope listed in the issue unless it is needed to make tests pass. If you do, say why in the PR.

## Parts: how one issue is built

Each issue is split into parts. The issue has a "Parts" section with one block per part.
Each part is done by a fresh agent session. One part at a time.

When you are asked to do a part:
- Do ONLY that part. Do not start the next part, even if it looks easy.
- Read the whole issue for context, then focus on your part's block.
- Also read `.cursor/rules/90-lessons.mdc`. It lists mistakes made before. Do not repeat them.
- Meet every item in the part's "Requirements".
- Work test-first. Every part has two commits, in this order:
  1. **Test commit**: the tests for this part, written from the spec, plus the smallest stubs needed so typecheck passes (for example functions that throw `new Error("not implemented")`). Tests are expected to fail here. Message: the part's commit message with `test` as the type, for example `test(recorder): add node id mirror (#3)`.
  2. **Implementation commit**: code that makes the tests pass. Message: the exact commit message given in the part.
- In the implementation commit you may ADD tests. You must not weaken, delete or skip tests from the test commit. If a test was wrong, fix it in a separate commit `test: fix <what> (#N)` and explain why in your PR note.
- Run every command in the part's "Checks" before you push. All must pass on the final commit.
- If the part asks you to explain a choice, or you make a decision that a reviewer might question, write an ADR in `docs/decisions/` (see `docs/decisions/README.md`) in the implementation commit.
- Part 1 creates the branch and opens the PR as a draft. Later parts push to the same branch. Never open a second PR for the same issue.
- At the end, reply in the PR with a short note: what you did, which checks passed, anything left open.

## QA and bug fixes

- Every task is tested by a black-box QA agent after all its parts pass review. QA tests the deployed preview in a browser, using only `qa/product.md` and the issue's "QA scenarios" section. It never sees the code.
- QA files each problem as its own issue with labels `bug`, `qa` and `severity: ...`, with steps, expected, actual and screenshots.
- When you are asked to fix QA bugs:
  - Fix only the listed bugs. Read each bug issue fully, including the screenshots.
  - Reproduce the bug with a failing test first when it can be tested in unit tests. Commit it as `test(<scope>): reproduce <short bug title> (#<bug number>)`.
  - Then fix it: `fix(<scope>): <short bug title> (#<bug number>)`. One bug per fix commit.
  - Do not close bug issues yourself. QA re-tests and closes them.
  - If a bug is not a bug (the behavior matches `qa/product.md` or the issue), do not change code. Explain why in a PR comment that starts with "Not a bug: #<number>".
- If a task changes what a user can see or do, update `qa/product.md` in the same PR, in plain user language.

## Branches and PRs

- Branch name: `day-XX/short-name`, for example `day-03/dom-snapshot`.
- PR title: `[Day XX] Short description`.
- PR description must include:
  - `Closes #<issue number>`
  - What was done, in a short list.
  - Decisions you made and why.
  - Anything left open.
- Keep PRs focused. Prefer under 800 changed lines, excluding lockfiles and fixtures.

## Commits

- Conventional commits with the issue number: `feat(recorder): add mirror registry (#3)`.
- Author every commit as the repo owner and credit yourself with a trailer, so the work shows on the owner's profile:
  `git -c user.name="Sergei Kamalian" -c user.email="106472907+SergeiKamalian@users.noreply.github.com" commit --trailer "Co-authored-by: Cursor Agent <cursoragent@cursor.com>" -m "..."`
- Never force-push and never rewrite pushed history. To catch up with `main`, merge it into your branch.
- One part = a test commit plus an implementation commit. Never squash parts together.
- Small commits with clear messages. No "wip" or "update" messages.
- Every commit must pass lint and typecheck on its own.

## Stack

- Language: TypeScript, `strict: true`. No `any` unless there is a comment explaining why.
- Package manager: pnpm workspaces. Node 22.
- Build: tsup for packages, Vite for apps.
- Tests: Vitest. Browser-like tests use happy-dom. End-to-end tests use Playwright (from week 2).
- Lint and format: Biome.
- UI: React 19 for the player and apps.

## Repo layout

```
packages/
  shared/     event types, schema, encoding, shared utils
  recorder/   the browser SDK that records sessions
  player/     React components that replay sessions
apps/
  demo/       a small buggy app used to record real sessions
  web/        landing page and live demo (later)
docs/
```

Do not create new top level folders without a reason written in the PR.

## Code rules

- Small pure functions. Side effects at the edges.
- No default exports. Named exports only.
- Public API of each package is only what `src/index.ts` exports.
- Every public function has a short TSDoc comment.
- Errors: never swallow silently. The recorder must never crash the host app. Wrap risky code and report through the internal logger.
- Performance matters. The recorder runs inside other people's apps. Avoid work on the main thread when it is not needed. Throttle high-frequency events.
- Privacy by default. Mask password inputs and anything with `data-rewind-mask`. Never record input values of type password.

## Tests

- Every new module gets unit tests in the same package, in `src/**/*.test.ts`.
- Tests must be deterministic. No real timers, no real network. Use fake timers and mocks.
- Before you open a PR run: `pnpm lint && pnpm typecheck && pnpm test`. All must pass.

## Docs

- If you change the design, update `docs/ARCHITECTURE.md` in the same PR.
- Important decisions go to `docs/decisions/` as ADRs. One decision per file. Never edit an accepted ADR. To change a decision, add a new ADR that supersedes the old one.
- If you add a package script or env var, update `README.md`.

## What not to do

- Do not add new dependencies without saying why in the PR. Prefer small, well known libraries.
- Do not change CI to make a failing check pass.
- Do not delete or skip tests to make them pass.
- Do not change `.agentflow/`, `.github/workflows/qa.yml`, `.github/workflows/status-labels.yml`, `.github/workflows/agent-log.yml` or `qa/scenarios/`. They run the process, not the product.
- Do not commit secrets, `.env` files, or large binary files.
