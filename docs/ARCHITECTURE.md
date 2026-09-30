# Architecture

This is the target design. It will grow as the project grows.
If a PR changes the design, it updates this file.

## Big picture

```
 Host web app
 ┌──────────────────────────────────────────┐
 │  @rewind/recorder                        │
 │   observers ──► event bus ──► buffer     │
 │   (DOM, input, network,        │         │
 │    console, state)             ▼         │
 │                         encoder + gzip   │
 └────────────────────────────────┼─────────┘
                                  │ transport (memory / file / HTTP)
                                  ▼
                        Storage server (week 3)
                                  │
                                  ▼
 ┌──────────────────────────────────────────┐
 │  @rewind/player                          │
 │   replay engine ──► sandboxed iframe     │
 │   timeline, console, network, state      │
 │   AI root cause panel (week 4)           │
 └──────────────────────────────────────────┘
```

## Packages

### @rewind/shared
- Event types and the session format.
- Session format is versioned. Every recording starts with a `meta` event that has `version`.
- Encoding helpers: compress and decompress a batch of events.

### @rewind/recorder
- `record(options)` starts recording and returns a handle with `stop()`, `flush()` and `addCustomEvent()`.
- Observers produce events:
  - **DOM**: one full snapshot at start, then incremental mutations from `MutationObserver`.
  - **Input**: mouse move (throttled), click, scroll, input and change, viewport resize.
  - **Network**: `fetch` and `XMLHttpRequest`. Method, URL, status, timing, sizes. Bodies off by default.
  - **Console**: log, info, warn, error, plus `window.onerror` and `unhandledrejection`.
  - **State**: adapters for Redux and Zustand (week 4).
- Event bus: single place where events enter. Adds timestamp and sequence number.
- Buffer: collects events and flushes in batches (by size or by time).
- Transport: pluggable. Memory, download as file, HTTP POST.

### @rewind/player
- Replay engine in plain TypeScript. Rebuilds the DOM in a sandboxed iframe and applies events in order.
- Keyframes: a full snapshot every N seconds or M events so seek is fast.
- React UI: play, pause, speed, timeline with markers (errors, network failures, clicks), side panels.

## Key decisions

| Decision | Choice | Why |
|---|---|---|
| Node identity | Numeric id per node, stored in a `WeakMap<Node, number>` | Stable across mutations, no memory leaks |
| Time | Milliseconds since session start from `performance.now()` | Monotonic, not affected by clock changes |
| Compression | fflate (gzip) in batches | Small, fast, works in browser and Node |
| Privacy | Mask by default | Safe to drop into any app |
| Replay | Sandboxed iframe, scripts stripped | Recorded code must never run |

## Open questions

- Canvas and WebGL recording. Probably out of scope for v1.
- Cross-origin iframes. Out of scope for v1.
