# 0003. Mask sensitive data by default

- Status: Accepted
- Date: 2026-09-30

## Context
The recorder runs inside other people's apps and sees everything the user types and loads.
A leak of passwords or personal data would make the tool unusable for real teams.

## Options
1. Record everything, let users opt in to masking. More useful replays. Unsafe default.
2. Mask by default, let users opt out per element. Safer. Some replays show `***`.

## Decision
Option 2. Passwords are never recorded. All input values are masked unless configured otherwise.
Sensitive headers are never recorded. Request and response bodies are off by default.

## Consequences
Safe to add to any app without a privacy review first.
Replays of forms show masked values unless the team opts out.
