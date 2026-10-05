# 0019. Pass the snapshot clock on the context

- Status: Accepted
- Date: 2026-10-03
- Issue: #3

## Context

`takeFullSnapshot` builds a `full_snapshot` event with `createEvent`, which needs a `Clock` for `seq` and `timestamp`. Sequence numbers are counted per clock. The mirror and the privacy rules are already one object, the serialize context. A snapshot is one step in that same recording.

## Options

1. A third argument, `takeFullSnapshot(document, ctx, clock)`. The clock can drift from the mirror if a caller mixes recordings.
2. Put `clock` on the snapshot context, next to the mirror. One object is everything the snapshot needs from that recording.

## Decision

Option 2. `SnapshotContext` extends the serialize context with a required `clock`. `serializeNode` does not read the clock. The caller passes the same clock used for the rest of the recording.

## Consequences

A snapshot cannot be taken without a clock, so `seq` is never invented inside the serializer. Tests pass a frozen clock. Privacy and node ids stay on the same object.
