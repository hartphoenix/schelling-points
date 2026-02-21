# Start Work

Pre-work checks before beginning any task. Surfaces conflicts with
active work so the human can make an informed choice.

## Usage

`/startwork` — pick the highest-priority available task from the board
`/startwork #<issue-number>` — start a specific issue

## Protocol

### 1. Gather

All data gathering is handled by a local script. Run:

```
git pull origin main && bun .claude/scripts/startwork-gather.ts
```

The script outputs a single JSON object with:
- `activeWork` — items In Progress, In Review, and open PRs
- `candidates` — items in Ready and Backlog, each with pre-computed
  `dependencies` (resolved or not) and `flags` (dependency, decision,
  external)
- `staleTodos` — agent todo files older than 24h
- `warnings` — any data sources that failed

If the script fails entirely, warn and stop.

If there are no candidates, say so and stop.

If `staleTodos` is non-empty, surface them for verification.

### 2. Detect

The script pre-computes structural flags (dependency, decision,
external) from labels and `### Dependencies` sections. You only need
to add **semantic conflict detection**:

For each candidate, check against `activeWork.inProgress` and
`activeWork.openPRs`:

| Type | Definition | How to detect |
|------|-----------|---------------|
| conflict | Another PR or In Progress task overlaps in scope | Compare titles/descriptions for overlapping scope. Flag as "possible conflict" with low confidence. If open PRs have file lists, check for file overlap with the candidate's likely files. |

Append any conflict flags to the candidate's existing `flags` array.

### 3. Rank

Rank all candidates (Ready + Backlog) using these priority tiers.
Ready items surface above Backlog items at the same tier. Within a
tier, prefer items that also rank well in lower tiers.

1. **Urgency** — `p1-critical` and `p2-important` first, regardless
   of assignee
2. **Assigned to current user** — user's tasks above unassigned or
   others' work
3. **Unblocks other work** — check if any issue in the full candidate
   or active work list has a dependency on this candidate (i.e., this
   candidate's number appears in another issue's `dependencies` array)
4. **MVP-critical path** — foundational structure the product needs
   (core game loop, essential UI flows, shared infrastructure) above
   nice-to-have improvements

**Then demote:** Any candidate with one or more flags ranks below all
clean (unflagged) candidates at the same priority tier. Within the
demoted group, preserve the original tier ordering.

If a specific issue was provided via `/startwork #N`, skip ranking
and proceed directly to Present (step 4) to show its flags.

### 4. Present

Show the top candidates as an ordered list. For each item, show:

- Why it ranks where it does (tier + assignment)
- Any flags, one line per flag with link:

```
[conflict] #42 (In Progress, Ulysse) — overlapping scope in scoring logic
[dependency] #38 (open) — scoring algorithm not yet decided
[decision] #51 (human-decision) — UX flow for timer display unresolved
[external] blocked — waiting on API key from vendor
```

If `warnings` is non-empty, include them:

```
Note: PR data unavailable — conflict detection may be incomplete.
```

Let the user choose.

### 5. Validate

After the user picks a task, run these checks on the selected item:

- **Blocking conditions** — if flagged, surface the specific flags
  and ask whether to proceed anyway or pick a different task.
- **WIP limit** — count "In Progress" items for the assignee. If at
  or above their limit (from CLAUDE.md team table), warn and ask for
  confirmation.

### 6. Activate

Update the board item status to "In Progress". Create or checkout the
feature branch using the `<person>/<short-description>` convention.

### 7. Summary

Print what's being worked on, the branch name, and any flags that
were acknowledged during Validate.
