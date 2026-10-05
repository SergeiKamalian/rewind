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
  - **DOM**: `takeFullSnapshot` writes one `full_snapshot` at start. `observeMutations` then watches the document and emits one `mutation` event per `MutationObserver` callback. Both take the recording `Clock` on the snapshot context, next to the `Mirror`, so `seq` stays with that recording. The observer hands the event to `emit`. That callback is where the event bus will connect. The observer does not write to a buffer. Each callback is resolved as removes, then adds, then attributes, then text, so a move keeps its id and a node that does not survive the callback is left out. Adds in one callback are emitted later-in-the-tree first, so a player that inserts each node before `nextId` finds that sibling already in the parent.
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
| Node identity | Numeric id in a `Mirror`. `WeakMap` from node to id, `WeakRef` from id to node. Ids start at 1 and are never reused | Stable across mutations. The mirror does not keep a detached node alive |
| Time | Milliseconds since session start from `performance.now()` | Monotonic, not affected by clock changes |
| Compression | fflate (gzip) in batches | Small, fast, works in browser and Node |
| Privacy | Mask by default | Safe to drop into any app |
| Replay | Sandboxed iframe, scripts stripped | Recorded code must never run |

## Session format

A session is a list of events in `seq` order. Every event has the same envelope:

- `type` is one of the kinds below.
- `seq` is a strictly increasing integer for this recording. It starts at 1.
- `timestamp` is milliseconds since session start.
- `data` is the payload for that kind.

The first event is `meta`. `data.version` is the format version (`FORMAT_VERSION`, currently 1).

| Kind | What `data` holds |
|---|---|
| `meta` | Format version, session id, epoch start time, url, user agent, viewport |
| `full_snapshot` | Serialized DOM. The root is a Document node |
| `mutation` | Adds, removes, attribute changes, and text changes. Each list is always present |
| `mouse_move` | Batched positions, each with a time offset |
| `mouse_interaction` | `click`, `dblclick`, `mousedown`, `mouseup`, `focus`, or `blur`, plus a target id and x, y |
| `scroll` | Node id and scroll offsets |
| `input` | A text value or a checked state, plus a masked flag |
| `viewport_resize` | Width and height |
| `network` | Method, url, status, timing, sizes, and error. Missing values are `null` |
| `console` | Level, serialized arguments, and a stack (`null` when absent) |
| `error` | Message, stack, source location, and kind (`error` or `unhandledrejection`) |
| `custom` | A tag and a JSON payload from the host app |

Node kinds are Document, Doctype, Element, Text, Comment, and CDATA. Each node has a numeric `id`. HTML tag names are lowercase. Other namespaces keep the DOM's case. An element attribute is a string, or `true` for a boolean attribute with no value. A `script` element has no children. Attribute names that start with `on` are omitted. SVG elements set `isSVG`. An open shadow root is the host's last child, with tag name `shadow-root` and `isShadowRoot`. Relative `src`, `href`, and `srcset` are absolute against the document base. A same-document fragment stays as written. A readable same-origin stylesheet link is stored as a `style` element. Relative `url()` and `@import` paths in that CSS become absolute against the stylesheet URL. A password input has no value. Input and textarea values are recorded from the live property, and so is the checked state of a checkbox or radio. Those values are stars of the same length when `maskAllInputs` is on (the default) or the control sits in a masked region. Option values are starred under the same rule. A masked select records neither its value nor which option is selected. When masking is off, the select value is recorded as typed and the selected option sets `selected`. Text in `data-rewind-mask`, the `rewind-mask` class, or `maskTextSelector` is stars of the same length. An element with `data-rewind-block` or `blockSelector` is an empty element whose `width` and `height` keep its box.

This checkout is the example. It is meta, a snapshot, a click, a text change, and a payment request. `parseEvent` accepts every event. The test in `packages/shared/src/example-session.test.ts` loads the JSON fence below.

```json
[
  {
    "type": "meta",
    "seq": 1,
    "timestamp": 0,
    "data": {
      "version": 1,
      "sessionId": "sess_checkout",
      "startTime": 1700000000000,
      "url": "https://shop.example/checkout",
      "userAgent": "Mozilla/5.0 (test)",
      "viewport": { "width": 1280, "height": 720 }
    }
  },
  {
    "type": "full_snapshot",
    "seq": 2,
    "timestamp": 0,
    "data": {
      "node": {
        "id": 1,
        "type": "Document",
        "childNodes": [
          {
            "id": 2,
            "type": "Doctype",
            "name": "html",
            "publicId": "",
            "systemId": ""
          },
          {
            "id": 3,
            "type": "Element",
            "tagName": "html",
            "attributes": { "lang": "en" },
            "childNodes": [
              {
                "id": 4,
                "type": "Element",
                "tagName": "button",
                "attributes": { "type": "submit" },
                "childNodes": [
                  { "id": 5, "type": "Text", "textContent": "Pay" }
                ]
              }
            ]
          }
        ]
      }
    }
  },
  {
    "type": "mouse_interaction",
    "seq": 3,
    "timestamp": 120,
    "data": { "interaction": "click", "id": 4, "x": 640, "y": 400 }
  },
  {
    "type": "mutation",
    "seq": 4,
    "timestamp": 140,
    "data": {
      "adds": [],
      "removes": [],
      "attributes": [],
      "texts": [{ "id": 5, "value": "Paying..." }]
    }
  },
  {
    "type": "network",
    "seq": 5,
    "timestamp": 180,
    "data": {
      "requestId": "req-1",
      "method": "POST",
      "url": "https://shop.example/api/pay",
      "status": 500,
      "start": 150,
      "end": 180,
      "requestSize": 48,
      "responseSize": 24,
      "error": null
    }
  }
]
```

## Open questions

- Canvas and WebGL recording. Probably out of scope for v1.
- Cross-origin iframes. Out of scope for v1.
