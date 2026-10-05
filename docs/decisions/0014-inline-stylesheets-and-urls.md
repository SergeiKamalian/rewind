# 0014. Freeze relative URLs and readable stylesheets

- Status: Accepted
- Date: 2026-10-02
- Issue: #3

## Context

A recording is replayed on another origin. Relative `src`, `href`, and `srcset` would point at the player's origin. A `<link rel="stylesheet">` would be fetched again, and a cross-origin sheet cannot be read.

## Options

1. Keep every URL as the page wrote it, and keep every link. Replay breaks for relative assets. Styles depend on the network.
2. Resolve URLs with `new URL` against the node's `baseURI`. When `document.styleSheets` can read a same-origin link, store that link as a `style` element whose text is the rules. Otherwise keep the link, with an absolute `href`.

## Decision

Option 2. A same-document fragment (`#id`) stays as written, because SVG `<use href="#sym">` must still point inside the snapshot. A value that cannot be resolved stays as written so a bad attribute cannot throw into the host page.

The inlined style keeps the link's other attributes, such as `media`, and drops `href` and `rel`. The CSS text node is cached on the link element so a second snapshot reuses its id.

## Consequences

Replay does not need the original origin for relative images and anchors. Same-origin CSS is inside the recording. Cross-origin CSS stays a link. `srcset` descriptors (`1x`, `400w`) stay next to the absolute URL.
