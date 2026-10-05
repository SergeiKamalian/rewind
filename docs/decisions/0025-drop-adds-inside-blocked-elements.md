# 0025. Drop an add inside an already blocked element

- Status: Accepted
- Date: 2026-10-05
- Issue: #4

## Context

A blocked element is recorded as an empty sized box. Text and attribute changes under it are already dropped. An add was not. Appending a node into a blocked element that was already in the snapshot serialized that node in full, including its text.

`serializeNode` only checks the element itself. A new child of a blocked parent is not blocked, so it was recorded. Calling the same check on the added node would also drop a newly added blocked element, which must still be stored as a placeholder.

## Options

1. Skip the add when the node or any ancestor is blocked. A blocked element added later disappears instead of becoming a placeholder.
2. Skip the add only when an ancestor is blocked. The new blocked element is still serialized. Anything inserted into an existing one is left out.

## Decision

Option 2. `emitAdd` walks from the parent with `ancestor` and `insideBlocked`. A move into a blocked element stays a remove only.

## Consequences

The player does not gain children under a placeholder. Width and height stay the ones from the snapshot. A blocked element added in this callback is still an add.
