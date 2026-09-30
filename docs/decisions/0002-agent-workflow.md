# 0002. Build with AI agents, one part per session, test-first

- Status: Accepted
- Date: 2026-09-30

## Context
Code is written by Cursor background agents. Planning, review and merging are done by a separate AI reviewer.
Long agent sessions drift, mix concerns and produce one huge commit that is hard to review.

## Options
1. One agent session per issue. Simple. Big diffs, weak review, one commit per day.
2. One agent session per small part, with checks between parts. More orchestration. Small diffs, early feedback, clean history.

## Decision
Option 2.
- Each daily issue is split into 4 to 6 parts. Each part has its own prompt, requirements, checks and commit message.
- Each part runs in a fresh agent session.
- Each part is test-first: a test commit, then an implementation commit. Tests from the test commit may not be weakened.
- A reviewer that did not write the code checks each part, then the whole PR.
- Shared ground truth lives in the repo: `AGENTS.md`, `.cursor/rules`, `docs/ARCHITECTURE.md`, ADRs.
- Repeated agent mistakes are written to `.cursor/rules/90-lessons.mdc`.

## Consequences
Smaller, reviewable steps and a readable commit history.
Tests are written from the spec, not fitted to the code.
More coordination overhead, handled by automation.
