# 0024. Emit same-batch adds later in the tree first

- Status: Accepted
- Date: 2026-10-05
- Issue: #4

## Context

ADR 0023 says the player applies adds in list order, inserting each node under `parentId` and before `nextId`. `nextId` is the next sibling after the whole callback. When two new siblings are added in that callback, the earlier one's `nextId` is the later sibling. Emitting them in the order the browser reported them inserts the earlier sibling first, and `nextId` is not in the tree yet.

## Options

1. Keep browser order and make every player sort adds before inserting. The event looks like the mutation log, but a straight replay throws or lands the node in the wrong place.
2. Emit the adds of one callback later-in-the-tree first. A straight loop can insert before `nextId`, because that sibling was either already in the snapshot or is an earlier item in this list.

## Decision

Option 2. `compareDocumentPosition` orders the connected add roots. Nodes the serializer skips, and nodes already covered by an ancestor add, stay out of the list. Ids do not change. One add on its own is unaffected, because there is nothing to reorder.

## Consequences

The `adds` array is not the order the mutations happened. A player still walks the list once. A later sibling that this batch also created is inserted first, then the node that points at it. The seeded fuzz test is what made this visible: appending two elements before the observer flushed could not be rebuilt.
