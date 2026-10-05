# 0016. Size a blocked element from layout, then style

- Status: Accepted
- Date: 2026-10-03
- Issue: #3

## Context

`data-rewind-block` and `blockSelector` replace an element with an empty placeholder that keeps the same width and height. The recorder is tested in happy-dom, where `getBoundingClientRect` is always 0. Pages also set the box with CSS or with `width` and `height` attributes. The replaced element can hold secrets in its text, attributes, and shadow tree.

## Options

1. Use the layout box only. Headless pages and these tests would record `0`.
2. Use the layout box when it is greater than 0, otherwise computed style, otherwise the `width` and `height` attributes, otherwise `0px`. Keep only those two attributes.

## Decision

Option 2. The placeholder keeps the tag name and that width and height. Children, other attributes, and open shadow roots are dropped.

## Consequences

A blocked card keeps its box in the player. Inline style is not copied, so a secret in a style or title attribute does not survive. An element with no size is `0px` by `0px`.
