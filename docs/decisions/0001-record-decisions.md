# 0001. Record decisions as ADRs

- Status: Accepted
- Date: 2026-09-30

## Context
Rewind is built in public, mostly by AI agents working in short sessions.
Each new session starts without memory of earlier ones.
Reviewers and readers also need to understand why the code looks the way it does.

## Options
1. Explain decisions only in PR descriptions. Easy, but hard to find later.
2. Keep one big design doc. Easy to read, but it gets rewritten and loses history.
3. One short file per decision (ADR). Small, searchable, keeps history.

## Decision
Option 3. Every important decision gets an ADR in `docs/decisions/`.
`docs/ARCHITECTURE.md` describes the current design. ADRs explain how we got there.

## Consequences
Agents can read past reasoning before they change something.
There is a small cost to write each ADR.
