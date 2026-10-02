# 0007. Return a path and a message from parseEvent

- Status: Accepted
- Date: 2026-10-02
- Issue: #2

## Context

`parseEvent` has to tell the caller why a value is not an event. The issue requires a readable error path and forbids throwing. It does not name the wrapper type. Call sites, tests, and later the player will all branch on this shape, so it needs one obvious form.

## Options

1. Throw a `ParseError`. Short call sites when the input is trusted. A forgotten `try` crashes the host app, which the recorder is not allowed to do.
2. A list of issues, as valibot's safe parse does. Complete, but every caller has to read an array to learn the first problem, and tests have to pin that array.
3. A discriminant result: `{ ok: true, value }` or `{ ok: false, error: { path, message } }`. One path, one message. `path` is empty when the value itself is not an object.

## Decision

Option 3. `path` is dotted, with `[index]` for arrays (`data.adds[0].node`). `message` says what was expected at that path (`expected a finite number`, `expected one of click, dblclick, ...`, `unknown field extra`).

`parseEvent` rebuilds a plain object on success. The caller gets the fields the schema allows, including `isSVG` only when it was present, and boolean attributes kept as `true`.

## Consequences

Callers narrow on `result.ok`. Tests assert one path and one message. Collecting every problem would be a new function; this one stops at the first failure.
