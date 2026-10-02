# 0008. Count sequence numbers per clock

- Status: Accepted
- Date: 2026-10-02
- Issue: #2

## Context

`createEvent(type, data, clock)` fills `seq` and `timestamp`. Two events can share a millisecond, so `seq` is the total order. The issue says `seq` strictly increases per clock instance, and that the clock is injectable so tests can fake time. It does not say who stores the counter.

## Options

1. One global counter. Simple. Two recordings in the same page share a sequence, and a test cannot reset it without extra API.
2. `clock.nextSeq()`. The caller owns the counter. A clock can return the same number twice, so the factory does not keep the invariant. Every test has to reimplement the counter.
3. The factory keeps a `WeakMap` from the clock object to the last `seq`. The clock only answers `now()`. Each instance has its own sequence. Dropping the clock lets the counter be collected.

## Decision

Option 3. The first event for a clock is `seq` 1, then 2, and so on. `now()` is read before the counter moves, so a clock that throws does not skip a number.

`createEvent` does not call `parseEvent`. The recorder builds typed data. `parseEvent` is for untrusted bytes.

## Consequences

A session must reuse one clock object. A fresh object starts again at 1. Tests freeze time with `{ now: () => 0 }` and still see a strict sequence. The Day 03 event bus should pass that same clock into every `createEvent` call.
