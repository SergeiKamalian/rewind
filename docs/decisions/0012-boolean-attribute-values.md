# 0012. Store canonical boolean attributes as true

- Status: Accepted
- Date: 2026-10-02
- Issue: #3

## Context

A boolean attribute is true when it is present. The DOM often reports the value as `""` or the attribute name (`checked="checked"`). `true` in the session format means that case. Two nearby cases are different: `alt=""` is a real empty string, and `hidden="until-found"` is a keyword on an attribute that used to be only boolean.

## Options

1. Store `true` for every empty attribute value. Loses `alt=""` and `data-empty=""`.
2. Store `true` for every name on the boolean list, whatever the value is. Loses `hidden="until-found"`.
3. Store `true` only when the name is on the boolean list and the value is empty or equal to that name, ignoring case. Any other value stays a string.

## Decision

Option 3. The list is the HTML boolean attributes, including `hidden` so the empty form still becomes `true`.

## Consequences

`disabled`, `async=""`, and `checked="checked"` become `true`. `hidden="until-found"` and `alt=""` stay strings. The player treats `true` as the attribute present with no value.
