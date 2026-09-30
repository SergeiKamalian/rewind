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

- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`, `perf:`.
- Small commits with clear messages. No "wip" or "update" messages.

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
- If you add a package script or env var, update `README.md`.

## What not to do

- Do not add new dependencies without saying why in the PR. Prefer small, well known libraries.
- Do not change CI to make a failing check pass.
- Do not delete or skip tests to make them pass.
- Do not commit secrets, `.env` files, or large binary files.
