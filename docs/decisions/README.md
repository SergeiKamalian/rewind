# Decisions

This folder holds Architecture Decision Records (ADRs).
Each file is one decision: what we chose, what else we considered, and why.

## Rules

- File name: `NNNN-short-title.md`, numbered in order.
- Status is one of: Proposed, Accepted, Superseded by NNNN.
- Never rewrite an accepted ADR. Write a new one that supersedes it.
- Keep it short. One page is plenty.

## Template

```md
# NNNN. Title

- Status: Accepted
- Date: YYYY-MM-DD
- Issue: #N

## Context
What problem are we solving? What forces are at play?

## Options
1. Option A. Pros. Cons.
2. Option B. Pros. Cons.

## Decision
What we chose.

## Consequences
What gets easier. What gets harder. What we will watch.
```

## Index

| # | Title | Status |
|---|---|---|
| 0001 | [Record decisions as ADRs](0001-record-decisions.md) | Accepted |
| 0002 | [Build with AI agents, one part per session, test-first](0002-agent-workflow.md) | Accepted |
| 0003 | [Mask sensitive data by default](0003-privacy-by-default.md) | Accepted |
