# 0018. Do not record the value of a masked select

- Status: Accepted
- Date: 2026-10-03
- Issue: #3
- Supersedes: 0015 (select value only)

## Context

ADR 0015 stores a masked select's value as stars of the same length, and each option value as stars of its own length. ADR 0017 already drops `selected`. The star length still names the choice: the reader finds the option whose stars match the select value. A country, gender, or diagnosis list leaks that way. Text inputs and textareas have no sibling list of choices, so stars of the same length stay useful there.

## Options

1. Keep stars of the same length on the select. The chosen option is recoverable whenever option values have different lengths.
2. When the select value is masked, omit the select's `value` attribute, including one that was in the HTML. Keep option values starred and labels as written. When `maskAllInputs` is false and the select is not in a masked region, record the select value as typed.

## Decision

Option 2. This supersedes only the select-value point of ADR 0015. Passwords, starred input and textarea values, option value stars, and textarea children stay as that ADR describes. ADR 0017 still omits `selected` on a masked select.

## Consequences

A masked select shows the choices and starred option values, not which choice was current. An unmasked select still records its value. Replay of a masked select cannot restore the chosen option from the select's value.
