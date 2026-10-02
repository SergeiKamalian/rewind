# 0009. Test the example session inside the architecture doc

- Status: Accepted
- Date: 2026-10-02
- Issue: #2

## Context

The session format needs a short example in `docs/ARCHITECTURE.md`, and that example must pass `parseEvent`. The test has to load the same JSON a reader sees. Two copies, a fixture and a pasted block, will drift.

## Options

1. A JSON file the test loads, with the doc linking to it. The page is not self-contained. Pasting the file into the doc as well creates a second copy.
2. One `json` fence under the `Session format` heading. The test reads that fence from the markdown. One copy. The test depends on the heading and the fence.

## Decision

Option 2. The first `json` fence in that section is the example. It is an array of five events: meta, a full snapshot, a click, a mutation, and a network event.

## Consequences

Editing the example updates the test. A second `json` fence in that section is ignored, so the section keeps one. Renaming the heading fails the test on purpose.
