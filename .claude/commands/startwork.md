# Start Work

Run the start-work gate before beginning any task.

## Usage
`/startwork` — pick from the current user's assigned items
`/startwork #<issue-number>` — start a specific issue

## Protocol

1. **Identify the task.** If an issue number was provided, fetch it.
   Otherwise, query the board for the current user's assigned items
   in "Ready" and present them for selection.

2. **Check blocking conditions.**
   - **dependency** — upstream issue still open
   - **conflict** — another PR or in-progress task touches the same files
   - **decision** — unresolved `human-decision` issue
   - **review** — upstream PR not yet merged
   - **external** — outside the team's control

   If blocked, surface the reason and ask whether to proceed anyway
   or pick a different task.

3. **Check for duplicates.** Search open PRs and in-progress board
   items for overlapping scope. Warn if found.

4. **Check WIP limit.** Count the current user's "In Progress" items.
   If at or above their WIP limit (from CLAUDE.md team table), warn
   and ask for confirmation.

5. **Move to "In Progress."** Update the board item status.

6. **Set up the branch.** Create or checkout the feature branch
   using the `<person>/<short-description>` convention.

7. **Summary.** Print what the current user is working on, the branch
   name, and any warnings surfaced above.
