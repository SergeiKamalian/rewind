# 0006. Validate events with hand-written guards

- Status: Accepted
- Date: 2026-10-02
- Issue: #2

## Context

`parseEvent` reads untrusted JSON (a saved session, or a payload from another origin) and must return a `RewindEvent` or a readable failure. It must not throw. The issue allows valibot or hand-written guards, and asks for the bundle cost, because the recorder runs inside other people's apps.

## Options

1. Valibot. A small, maintained schema library. The schema can sit next to the type. It is still a dependency in every host app, and its default issues are a list of objects. Matching a stable path string (`data.texts[0].value`), rejecting unknown keys, and walking a DOM tree plus JSON needs a custom error map on top of the library.
2. Hand-written guards. No dependency. Each field's path and message are written next to the check. The file is longer, and a format change has to update the guard and the type together.

## Decision

Option 2. The schema is closed and owned by this package. The guards are the schema.

Rules that follow from the same choice:

- The first failure wins. A recording is rejected or accepted; a list of every problem is not useful to the player.
- Unknown keys are rejected (`unknown field name`), except element attribute names, which are open.
- Numbers must be finite. `NaN` and `Infinity` are not JSON and are not accepted.
- Nesting stops at 256 levels, with the message `exceeded maximum nesting depth`. A real page fits. A hostile payload cannot overflow the stack. The check is on the way down, so the word `depth` is the failure, not a caught stack overflow.
- Cycles use a `WeakSet` stack. The same object may appear twice as siblings. An ancestor that appears again fails with `circular value` at the path where it reappears.
- Only plain objects (`Object.prototype` or a null prototype) count as records. A throwing getter is caught at the `parseEvent` boundary and returned as a failure whose message includes the exception text, so the function itself never throws.

## Consequences

`@rewind/shared` gains no runtime dependency. The published ESM is 27.8 KB raw, 12.0 KB minified, and 3.1 KB minified and gzipped. Before this parser the file was under 1 KB, because the event types erase at compile time. A consumer that only imports `version()` can tree-shake the guards.

Part 4's `createEvent` must produce values this parser accepts. Changing a payload means changing the guard in the same commit.
