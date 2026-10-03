# 0017. Do not record the selected option of a masked select

- Status: Accepted
- Date: 2026-10-03
- Issue: #3
- Supersedes: 0015 (selected option only)

## Context

ADR 0015 records a masked select's value as stars and still sets `selected: true` on the chosen option. The option label stays as written, so a reader can see that the user picked "Pear", a country, or a diagnosis. The list of choices is page structure. Which one was picked is user input, and Step 4 says that input is masked by the privacy rules.

## Options

1. Keep `selected: true` and star the value. The length of the stars plus the label still names the choice.
2. When the option value is masked, omit `selected`, including a `selected` attribute that was in the HTML. Leave the labels. When `maskAllInputs` is false and the select is not in a masked region, keep `selected: true`.

## Decision

Option 2. This supersedes only the selected-option point of ADR 0015. Passwords, starred values, and textarea children stay as that ADR describes.

## Consequences

A masked select shows the choices and a starred value, not which choice was current. An unmasked select still records `selected`. Replay of a masked select cannot restore the chosen option.
