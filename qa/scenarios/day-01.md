# Day 01: Monorepo setup

From issue #1, merged in PR #8.

S1. Open the app. The heading "Todos", the "New todo" field, the Add button and "No todos yet." are visible. No console errors.
S2. Add "Walk the dog" with the Add button. It appears in the list and the field clears.
S3. Add a todo by pressing Enter in the field.
S4. Try to add an empty title and a title of only spaces. Nothing is added.
S5. Add "  Buy milk  " with spaces around it. It appears as "Buy milk".
S6. Add a title of 500 characters. The page stays usable and the layout does not break.
S7. Add 20 todos quickly. All appear in the order they were added.
S8. Tick a todo. It looks done. Untick it. It looks normal again.
S9. Delete a todo in the middle of the list. Only that todo disappears.
S10. Delete all todos. "No todos yet." shows again.
S11. The footer shows "Format version 1".
S12. Do S2, S8 and S9 with the keyboard only.
S13. Repeat S2 to S10 on the mobile viewport. Nothing overflows the screen.
Intended: todos are not saved, a reload starts empty. Do not report this.
