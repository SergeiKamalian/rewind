# 0023. Resolve one mutation callback as removes, adds, attributes, then text

- Status: Accepted
- Date: 2026-10-04
- Issue: #4

## Context

`MutationObserver` delivers every DOM change from one turn in a single callback, in the order the changes happened. Replaying that order breaks. A node can be added and removed, or removed and inserted somewhere else, before the callback runs. An attribute can change many times. A child can be added under a parent that was also added. The player has to apply one consistent batch, or the rebuilt tree drifts from the page.

## Options

1. Emit one record per observer record, in callback order. Simple, and it matches the browser's log. The player then has to repeat the same cleanup, and a transient node is still in the recording.
2. Resolve the callback into four lists, in a fixed order: removes, adds, attributes, text. Drop changes that the final tree does not need. The player applies the lists in that same order.

## Decision

Option 2.

Removes come first. The id is the one the mirror already had (ADR 0022), and the parent is the parent before this callback. A node that was in the tree and is gone at the end, including one that was moved into a subtree this callback then dropped, is a remove. A node that ends up somewhere else is a remove plus an add of the same id.

Adds come second. Only a connected node is serialized, and only the top added node of a new subtree. Its serialized children already include nested adds, moves into that subtree, and the final attributes and text. `nextId` is the next sibling after the whole callback, so it does not point at a node this batch removed. A node that was created and then detached is omitted, and so are its attributes and text. A descendant of a `<script>` is omitted. `serializeNode` still strips the script's own content and `on*` attributes.

Attributes come third, then text. Both keep the last value for each target. A change is omitted when the node is disconnected, already inside an add from this callback, an `on*` attribute, or blocked. Password values are omitted. A masked select value and a masked option's `selected` flag are omitted. Other masked control values are starred, using the same helpers as the snapshot.

## Consequences

The player can apply the four lists in order and reach the same tree. A moved node keeps its id. Repeated edits collapse to the final value. A blocked element does not emit later attribute or text changes, so a title set after the placeholder was recorded cannot leak. Its width and height stay the ones from the snapshot until a later full snapshot. Part 3 still adds the position and privacy tests the issue lists for that part.
