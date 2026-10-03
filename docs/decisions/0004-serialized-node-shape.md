# 0004. Serialize DOM nodes with string kinds

- Status: Accepted
- Date: 2026-10-02
- Issue: #2

## Context

The session format needs a JSON tree for the DOM. Every node needs a numeric id and a way to tell kinds apart. The issue names the kinds (Document, Doctype, Element, Text, Comment, CDATA) and the element fields. How the kind is stored, and which fields the other kinds carry, is left for this change to decide. Day 03 will serialize real nodes into this shape, so the choice is hard to change later.

## Options

1. Numeric kinds, as rrweb does (`0` for document, `2` for element). Compact in the recording. Opaque in tests, logs, and the example session.
2. String kinds (`"Element"`, `"Text"`, and so on). A few extra bytes per node. Readable wherever the JSON shows up.

## Decision

Option 2. Recordings are gzipped later, so the extra bytes are cheap. Readability helps every test and the AI layer that will read sessions.

The interfaces are named `DocumentNode`, `ElementNode`, and so on. Exporting `Document` or `Element` would collide with the DOM globals in apps that include the DOM lib.

Other shape choices that follow from the same goal:

- Element attributes are `string | true`. `true` means an HTML boolean attribute with no value.
- `Document` and `Element` have `childNodes`. Text, comment, CDATA, and doctype are leaves.
- A doctype always has `name`, `publicId`, and `systemId`. Missing identifiers are empty strings.
- Text, comment, and CDATA store `textContent`.
- `isSVG` is optional and present only for SVG elements.

`EventType` and `SerializedNodeType` are derived from const arrays (`EVENT_TYPES`, `SERIALIZED_NODE_TYPES`). One list is both the runtime value and the type.

## Consequences

The Day 03 serializer must emit this shape. Readers narrow on `node.type`. The type allows any serialized node as a child. The serializer is responsible for producing a real tree.
