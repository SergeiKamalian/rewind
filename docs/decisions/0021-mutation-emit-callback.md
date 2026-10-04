# 0021. Emit mutations through a callback

- Status: Accepted
- Date: 2026-10-04
- Issue: #4

## Context

Observers must not push into the recording buffer. Events enter through one bus, which stamps nothing itself: `createEvent` already stamps `seq` and `timestamp` from the recording clock. The bus is not built yet. A full snapshot is one call that returns one event. Mutations keep arriving for the whole session, one batch per `MutationObserver` callback.

## Options

1. A pull API, in the style of `takeRecords`. The caller must remember to pull, and a missed pull drops or delays a batch.
2. An `emit` callback. `observeMutations` builds one `mutation` event per callback and passes it to `emit`. The future bus is that function. The observer never sees a buffer.

## Decision

Option 2. A callback that records nothing we keep does not emit, so it does not spend a sequence number. `emit` runs on the observer microtask. If building or emitting throws, the observer reports the error and does not throw into the host page.

## Consequences

`record()` can pass the bus as `emit` without changing the observer. Tests pass an array push. An empty callback stays quiet. The host page is insulated from a faulty batch.
