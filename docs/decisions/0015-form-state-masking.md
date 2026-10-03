# 0015. Omit password values and star the rest of form state

- Status: Superseded by 0017 (selected option) and 0018 (select value)
- Date: 2026-10-03
- Issue: #3

## Context

A snapshot has to show what the user typed. The DOM attribute is often stale: setting `input.value` or `checked` does not always write the attribute, and a `select`'s chosen option is a property. ADR 0003 already says passwords are never recorded and other input values are masked unless the host opts out. A select also copies the chosen value onto each option's `value` attribute, and a textarea repeats its value as a child text node.

## Options

1. Replace the password with stars of the same length. The secret is gone, but the length leaks, and the value key is still present.
2. Omit the password value. Store every other control from the live property. Star that value when `maskAllInputs` is on (the default) or an ancestor is masked. Star option `value` attributes under the same rule. Drop textarea children so the value attribute is the only copy.

## Decision

Option 2. `maskAllInputs` defaults to true. `maskAllInputs: false` records other control values as typed. A password value is omitted in both cases. Checkbox and radio `checked` comes from the property, so a stale `checked` attribute is removed when the control is unchecked. Option labels stay as written.

## Consequences

Password length is not in the recording. A replay can show that a field was a password without the secret. The selected option is `selected: true` even when the attribute was never set. A masked select does not keep the chosen string on its options.
