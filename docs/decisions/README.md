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
| 0004 | [Serialize DOM nodes with string kinds](0004-serialized-node-shape.md) | Accepted |
| 0005 | [Shape event payloads for a stable recording](0005-event-payload-shapes.md) | Accepted |
| 0006 | [Validate events with hand-written guards](0006-hand-written-event-guards.md) | Accepted |
| 0007 | [Return a path and a message from parseEvent](0007-parse-result-shape.md) | Accepted |
| 0008 | [Count sequence numbers per clock](0008-sequence-per-clock.md) | Accepted |
| 0009 | [Test the example session inside the architecture doc](0009-example-session-in-architecture.md) | Accepted |
| 0010 | [Look up node ids with WeakRef](0010-mirror-id-lookup.md) | Accepted |
| 0011 | [Lowercase HTML tag names in snapshots](0011-html-tag-name-case.md) | Accepted |
| 0012 | [Store canonical boolean attributes as true](0012-boolean-attribute-values.md) | Accepted |
| 0013 | [Represent an open shadow root as an element](0013-shadow-root-element.md) | Accepted |
| 0014 | [Freeze relative URLs and readable stylesheets](0014-inline-stylesheets-and-urls.md) | Accepted |
| 0015 | [Omit password values and star the rest of form state](0015-form-state-masking.md) | Superseded by 0017 (selected option) and 0018 (select value) |
| 0016 | [Size a blocked element from layout, then style](0016-blocked-element-size.md) | Accepted |
| 0017 | [Do not record the selected option of a masked select](0017-masked-select-option.md) | Accepted |
| 0018 | [Do not record the value of a masked select](0018-masked-select-value.md) | Accepted |
