# 0020. Resolve URLs inside inlined stylesheets

- Status: Accepted
- Date: 2026-10-04
- Issue: #3

## Context

A same-origin `<link rel="stylesheet">` is stored as a `<style>` element (ADR 0014). The rule text keeps `url(...)` and `@import` paths as the author wrote them. Browsers resolve those paths against the stylesheet's URL. After inlining, the same text resolves against the document, and in the player against the player's origin. A sheet in `/assets/css/` then loads `/img/bg.png` instead of `/assets/img/bg.png`.

## Options

1. Keep the CSS text as `cssText` returns it. Replay of fonts and background images breaks for any sheet that is not at the document URL.
2. Scan the inlined text for `url()` and `@import` paths and resolve relative ones with `resolveUrl` against `sheet.href`, or the link's absolute `href` when `sheet.href` is null. Leave `data:` URLs, other absolute URLs, and `url(#id)` as written.

## Decision

Option 2. The scan is a small pure function, not a CSS parser. It covers `url(x)`, `url('x')`, `url("x")`, `@import "x"`, `@import 'x'`, and `@import url(x)`. A value that cannot be resolved stays as written, and the scan does not throw. `<style>` elements and `style` attributes are left as written; the issue only asks to keep their text.

## Consequences

Inlined CSS replays on another origin. Quote marks around a path stay. A path with a scheme is not passed through `new URL`, so a `data:` URL is not re-encoded. A sheet with no URL keeps its text unchanged.
