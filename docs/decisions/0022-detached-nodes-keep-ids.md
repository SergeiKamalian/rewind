# 0022. Detached nodes keep their mirror id

- Status: Accepted
- Date: 2026-10-04
- Issue: #4

## Context

ADR 0010 says a node that is passed to `Mirror.remove` and then seen again gets a new id. A DOM node often leaves the tree and comes back: a move, or an element the page holds while it is detached. The mutation observer has to record the remove, and a later add of that same object has to keep the id. The mirror already drops a collected node through `WeakRef` and `FinalizationRegistry`.

## Options

1. Call `mirror.remove` on every removed node. The id-to-node entry disappears immediately. A later insert of the same object is a new id, so the player treats it as a different node.
2. Leave the id in place for as long as the node object is alive. The observer does not call `remove`. Collection still drops the entry. Serializing the node again returns the original id.

## Decision

Option 2. `Mirror.remove` stays available for a caller that truly forgets a node. The mutation observer is not that caller.

## Consequences

A moved node keeps its id across callbacks, which the same-batch move case also needs. Detached nodes the page still holds are not collected, so their ids remain. Nodes the page drops can be collected, and the mirror does not pin them.
