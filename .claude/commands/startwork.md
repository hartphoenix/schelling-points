# Start Work

Pre-work checks before beginning any task.

## Usage
`/startwork` — pick from assigned items on the board
`/startwork #<issue-number>` — start a specific issue

## Protocol

### 1. Environment Check

1. Pull latest main (`git pull origin main`)
2. Query the project board for assigned items in "Ready"
   (`gh project item-list 1 --owner thrialectics --format json`)
3. Check blocked items for resolved conditions (see Blocking
   Conditions below)
4. Scan `.claude/todos/agent/` for stale working files (created >24h
   ago) and surface them for verification
5. Surface a brief summary before proceeding

If GitHub is unreachable, warn and continue from local branch state.
If there are no assigned items, say so — don't treat it as an error.

### 2. Identify the Task

If an issue number was provided, fetch it. Otherwise, present the
assigned "Ready" items for selection.

### 3. Check Blocking Conditions

Review the task for blockers (see definitions below). If blocked,
surface the reason and ask whether to proceed anyway or pick a
different task.

### 4. Check for Duplicates

Search open PRs and in-progress board items for overlapping scope.
Warn if found.

### 5. Check WIP Limit

Count "In Progress" items for the assignee. If at or above their
WIP limit (from CLAUDE.md team table), warn and ask for confirmation.

### 6. Move to "In Progress"

Update the board item status.

### 7. Set Up the Branch

Create or checkout the feature branch using the
`<person>/<short-description>` convention.

### 8. Summary

Print what's being worked on, the branch name, and any warnings
surfaced above.

## Blocking Conditions

Five categories checked during the environment and task checks:

- **dependency** — upstream issue still open
- **conflict** — another PR or in-progress task touches the same files
- **decision** — unresolved `human-decision` issue
- **review** — upstream PR not yet merged
- **external** — outside the team's control
