# 0011. Lowercase HTML tag names in snapshots

- Status: Accepted
- Date: 2026-10-02
- Issue: #3

## Context

`element.tagName` in an HTML document is uppercase (`BUTTON`). The example session stores `button` and `html`. SVG and MathML names are case-sensitive (`linearGradient`). One rule has to serve both.

## Options

1. Store `tagName` as the DOM reports it. SVG case survives. HTML names disagree with the example session.
2. Lowercase every tag name. HTML matches the example. SVG and MathML names break.
3. Lowercase only the HTML namespace, via `localName`. Other namespaces keep `tagName`.

## Decision

Option 3. HTML tags are case-insensitive, so the lowercase form is enough to rebuild them. Other namespaces keep the case the DOM has.

## Consequences

The player can pass an HTML tag name to `createElement`. An SVG name stays usable. An element with no namespace keeps the DOM's case.
