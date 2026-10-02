# 0005. Shape event payloads for a stable recording

- Status: Accepted
- Date: 2026-10-02
- Issue: #2

## Context

Each session event has a `data` payload. The issue names the fields. It leaves the JSON shape open: optional keys versus `null`, how an input can be text or a checkbox, and how a mutation lists several kinds of change. Part 3 will validate this shape and later days will write it, so it needs one obvious form.

## Options

1. Omit keys that have no value. Smaller JSON. Each payload has many variants, and a reader has to test for presence.
2. Keep every key, and use `null` when the browser did not provide a value. One object shape per event kind. A few extra bytes before gzip.

## Decision

Option 2 for network calls, console stacks, and error locations. `null` means "not available". Empty mutation lists mean "nothing of that kind changed", and the four lists are always present.

Other choices that follow from the same goal:

- `RewindEvent` is a mapped union over `EventDataMap`, so `event.type` narrows `data`.
- A full snapshot's root is a `DocumentNode`.
- An input is either `{ kind: "value", value }` or `{ kind: "checked", checked }`. A single object with both fields would accept an impossible control. `masked` is required on both.
- Mouse interactions, console levels, and error kinds are const arrays, and the types are derived from them. Console levels are `log`, `info`, `warn`, and `error`, matching the architecture.
- Console arguments and custom payloads are JSON values. There is no `any`.

## Consequences

The validator and the recorder share one shape. A missing network status is `null`, not an absent key. Checkbox input and text input stay distinct when code narrows on `data.kind`.
