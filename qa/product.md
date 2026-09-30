# Rewind: product description for QA

This file describes the product from the user's side. QA agents test against it without seeing the code.
Update it when a task changes what a user can see or do.

## What Rewind is

Rewind records a user session in a web app and lets a developer replay it like a video.
Right now only the demo app exists. The recorder and the player are being built.

## Demo app (the app deployed for every PR)

A small todo list. It is the app Rewind will record.

What a user can do:
- Type a title in the "New todo" field and press Add or Enter. The todo appears at the end of the list and the field clears.
- Titles are trimmed. An empty or spaces-only title adds nothing.
- Tick the checkbox of a todo to mark it done. The todo looks done. Tick again to undo.
- Press Delete on a todo to remove it.
- When the list is empty, the page says "No todos yet."
- The footer shows "Format version 1". This is the session format version from the Rewind SDK.
- Todos are not saved. A reload starts with an empty list. This is intended.

## Smoke check

Run this in every QA run, on every viewport:
1. The page loads without console errors. The heading "Todos" is visible.
2. Add two todos. Both appear in order.
3. Mark the first one done, then undo it.
4. Delete the second one.
5. The footer shows "Format version 1".
6. Everything is usable with the keyboard only (Tab, Space, Enter).
