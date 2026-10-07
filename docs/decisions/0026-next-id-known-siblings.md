# 0026. nextId uses only ids the mirror already has

- Status: Accepted
- Date: 2026-10-05
- Issue: #4

## Context

`nextId` is the sibling a player inserts before. `siblingId` called `mirror.getId` on the immediate next sibling. That assigns an id when the sibling has none. Node kinds the serializer skips, such as a processing instruction, never appear in the recording, so the player has no node for that id.

Adds in one callback are serialized later in the tree first (ADR 0024). A new sibling that is recorded already has an id by the time an earlier add looks it up.

## Options

1. Keep assigning an id to the immediate sibling. Every next sibling has a number. Some numbers point at nodes the player cannot find.
2. Use the first following sibling the mirror already has. If none does, `nextId` is `null`. Do not assign an id.

## Decision

Option 2.

## Consequences

A skipped node between two recorded siblings does not change where the player inserts. The insert lands before the next recorded sibling, which is the same place in the recorded tree. Unknown nodes are not added to the mirror just to name them.
