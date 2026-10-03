# 0010. Look up node ids with WeakRef

- Status: Accepted
- Date: 2026-10-02
- Issue: #3

## Context

The recorder assigns a numeric id to every DOM node it sees. Later events refer to nodes by that id, so the mirror needs both directions: node to id, and id to node. The node-to-id side is a `WeakMap`, which does not keep the node alive. The id-to-node side has to store something that can answer `getNode`. If that side holds the node strongly, the mirror can pin nodes the page has already dropped.

## Options

1. `Map<number, Node>`. `getNode` is a plain map read. The map keeps every node until `remove`. A missed `remove` keeps that node, and anything it closes over, for the rest of the session.
2. `Map<number, WeakRef<Node>>`. The page is the only strong owner. `getNode` returns `undefined` after `remove`, or after the node is collected. The map still needs a way to drop entries for nodes that were collected without `remove`, or it grows for the whole session.

## Decision

Option 2. `remove` deletes the entry immediately. `getNode` deletes a ref whose node is already gone. A `FinalizationRegistry` deletes the entry when the node is collected and nobody has called `getNode` yet.

The registry callback stores the id, not the node. The node is not used as an unregister token, because the registry would then keep it alive and the `WeakRef` would do nothing. Ids come from a counter that only goes up, so a callback that arrives late cannot clear a different node that reused the id.

## Consequences

Detached nodes can be collected even if the mutation observer has not called `remove` yet. Callers treat a missing id as "already gone". A node that is removed and seen again gets a new id. Two snapshots of the same document keep the same ids because nothing calls `remove` between them.
