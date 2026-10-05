# 0013. Represent an open shadow root as an element

- Status: Accepted
- Date: 2026-10-02
- Issue: #3

## Context

An open shadow root is part of the page the player must rebuild. It is a `DocumentFragment`, not an element, and the session format has no fragment kind. Closed roots are not visible to script (`element.shadowRoot` is null).

## Options

1. Add a new node kind. Honest about the DOM type. Every reader and the example session have to learn it.
2. Store the shadow tree as an element child with `isShadowRoot: true` and tag name `shadow-root`. Same shape as every other element. The flag tells the player not to create a real element with that tag.

## Decision

Option 2. The shadow root is the host's last child, after the light DOM children, so existing child order stays put. Only open roots are recorded. The flag is optional, like `isSVG`, and `parseEvent` accepts it.

## Consequences

The player creates a shadow root when it sees the flag, then fills it with the child nodes. A closed root is absent from the recording. Light DOM and shadow DOM for one host share one parent in the snapshot.
