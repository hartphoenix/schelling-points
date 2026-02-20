# Start Work

Pre-work checks before beginning any task.

## Usage
`/startwork` — pick the highest-priority available task from the board
`/startwork #<issue-number>` — start a specific issue

## Protocol

### 1. Environment Check

1. Pull latest main (`git pull origin main`)
2. Query the project board for all items in "Ready" and "Backlog" — not
   just assigned ones (`gh project item-list 1 --owner thrialectics --format json`)
3. Check blocked items for resolved conditions (see Blocking
   Conditions below)
4. Scan `.claude/todos/agent/` for stale working files (created >24h
   ago) and surface them for verification
5. Surface a brief summary before proceeding

If GitHub is unreachable, warn and continue from local branch state.
If there are no items in "Ready" or "Backlog", say so — don't treat it as an error.

### 2. Identify the Task

If an issue number was provided, fetch it directly (skip prioritization).

Otherwise, rank all "Ready" and "Backlog" items using the following
priority order. "Ready" items should generally surface above "Backlog"
items at the same priority level. Within a tier, prefer items that
also rank well in lower tiers.

1. **Urgency and severity** — `p1-critical` and `p2-important` items
   come first, regardless of assignee. An unassigned urgent task is
   more important than an assigned low-priority one.
2. **Assigned to the current user** — tasks explicitly assigned to
   this team member take priority over unassigned or others' work.
3. **Unblocks other work** — tasks that appear in another issue's
   `### Dependencies` section (i.e., something else is waiting on
   this task) should surface higher. Check for issues carrying the
   `blocked` label that reference these items.
4. **MVP-critical path** — tasks that provide foundational structure
   the product needs to function (core game loop, essential UI flows,
   shared infrastructure) rank above nice-to-have improvements.

Present the top candidates as an ordered recommendation, noting why
each ranks where it does. Let the user choose.

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
