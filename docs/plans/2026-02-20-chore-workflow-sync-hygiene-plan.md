---
title: "chore: Workflow Synchronization & Hygiene"
type: chore
status: completed
date: 2026-02-20
brainstorm: docs/brainstorms/2026-02-20-workflow-sync-hygiene-brainstorm.md
---

# chore: Workflow Synchronization & Hygiene

## Overview

Targeted updates to CLAUDE.md, .gitignore, and `.claude/` workflow files
that close three synchronization gaps in the team's shared development
pipeline: triage creates duplicate issues, no start-work gate exists,
and ephemeral files accumulate without cleanup.

All decisions were made during brainstorming. This plan defines the
implementation order, exact file changes, and edge-case mitigations.

## Problem Statement

The shared workflow system (PR #69, 2026-02-19) is one day old. Three
gaps are already visible:

1. **Triage creates duplicates.** No dedup check before creating issues.
2. **No start-work gate.** Nothing prompts board check or status update.
3. **Files accumulate.** Brainstorms, plans, and todo files persist
   after their purpose is served.

Additional: undefined blocking vocabulary, no session-start protocol,
file-todos skill out of sync with directory structure.

## Proposed Solution

Eight coordinated changes, ordered to avoid breaking the workflow
mid-implementation:

1. Add `.claude/todos/` to `.gitignore` + remove tracked files
2. Remove `file-todos` skill
3. Update `review.md` — collapse Phase 5+6 into single triage step
4. Update `triage-todos.md` — add dedup logic + confirmation gate
5. Update `work.md` — add cleanup step in Phase 4
6. Create `/startwork` slash command — executable start-work gate
7. Update `CLAUDE.md` — add Session Start, Start Work Gate, Resource
   Lifecycle sections; update Triage & Assignment
8. Verify + commit

## Implementation

### Phase 1: Git Cleanup (do first — avoids conflicts)

- [x] Add `.claude/todos/` to `.gitignore`
- [x] Run `git rm -r --cached .claude/todos/` to untrack all files
- [x] Verify: `git status` shows removed files + .gitignore change

**Files:**
- `.gitignore` — add `.claude/todos/` entry

### Phase 2: Remove file-todos Skill

- [x] Delete `.claude/skills/file-todos/SKILL.md`
- [x] Delete `.claude/skills/file-todos/assets/todo-template.md`
- [x] Delete `.claude/skills/file-todos/` directory

**Files:**
- `.claude/skills/file-todos/` — remove entirely

### Phase 3: Update review.md

Replace Phase 5 (file-todos creation) and Phase 6 (triage spawn) with
a single collapsed triage step that goes direct to GitHub.

- [x] Remove Phase 5 (Findings Synthesis & Todo Creation)
- [x] Replace Phase 6 with new triage step:

```markdown
## Phase 5: Triage & Issue Routing

For each finding from the review:

1. **Search existing issues** — `gh issue list --search "<finding keywords>"`
2. **Match found →** Present match with one-line rationale. If confirmed
   relevant, append finding as comment on existing issue. If false
   positive, proceed to step 3.
3. **No match + human-needed →** Create new GitHub issue using
   Assignment Protocol in CLAUDE.md.
4. **No match + agent-resolvable →** Create GitHub issue (labeled
   `agent-resolvable`) AND create lightweight working file:

   ```
   mkdir -p .claude/todos/agent
   ```

   File: `.claude/todos/agent/<issue-number>-<short-description>.md`
   Contents: description, file location, acceptance criteria. No YAML
   lifecycle, no status field. Delete after agent completes work.

Decision criteria for agent-resolvable vs. human-needed: see
`.claude/commands/workflows/triage-todos.md`.
```

- [x] Renumber subsequent sections
- [x] Remove all references to `file-todos` skill and todo-template

**Files:**
- `.claude/commands/workflows/review.md`

### Phase 4: Update triage-todos.md

- [x] Add dedup protocol at the top of the decision flow:

```markdown
## Dedup Protocol

Before creating any new issue:

1. Search open issues: `gh issue list --search "<keywords>" --state open`
2. Search closed issues for recent duplicates: `gh issue list --search "<keywords>" --state closed --limit 5`
3. **If a match is found:** Present the match with a one-line rationale
   for why it overlaps. Wait for confirmation before commenting.
   (Prevents false-positive noise on unrelated issues.)
4. **If no match:** Proceed with issue creation.
```

- [x] Remove references to `todos/user/`, `todos/resolved/`, file
  renaming, and YAML lifecycle
- [x] Keep the agent-resolvable vs. human-needed decision criteria
  tables (they're good)
- [x] Remove the "Session Context (from Feb 18, 2026)" section — the
  enumerated item lists (13 agent-resolvable, 7 human-needed) were a
  one-time snapshot from the initial codebase review

**Files:**
- `.claude/commands/workflows/triage-todos.md`

### Phase 5: Update work.md

Add cleanup step to Phase 4 (Ship It), after PR creation:

- [x] Add resource cleanup step:

```markdown
### Resource Cleanup

After PR creation, clean up ephemeral working docs:

1. If a brainstorm file was used as input, check whether any other
   open branches reference it (`git log --all --oneline -- <file>`).
   If no other branches reference it, delete it.
2. Same check for the plan file.
3. Delete any `.claude/todos/agent/` working files for completed items.
4. Commit the deletions as part of the PR.
```

- [x] Add `mkdir -p .claude/todos/agent` to Phase 1 (Quick Start)
  setup steps — ensures directory exists even if gitignored

**Files:**
- `.claude/commands/workflows/work.md`

### Phase 6: Create `/startwork` Slash Command

Create a new slash command available to all teammates at
`.claude/commands/startwork.md`. Invoked as `/startwork` (or
`/startwork #42` to target a specific issue).

- [x] Create `.claude/commands/startwork.md` with the following behavior:

```markdown
# Start Work

Run the start-work gate before beginning any task.

## Usage
`/startwork` — pick from your assigned items
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

4. **Check WIP limit.** Count the user's current "In Progress" items.
   If at or above their WIP limit (from CLAUDE.md team table), warn
   and ask for confirmation.

5. **Move to "In Progress."** Update the board item status.

6. **Set up the branch.** Create or checkout the feature branch
   using the `<person>/<short-description>` convention.

7. **Summary.** Print what you're working on, the branch name,
   and any warnings surfaced above.
```

- [x] Verify the command is discoverable: `ls .claude/commands/startwork.md`

**Files:**
- `.claude/commands/startwork.md` — new file

### Phase 7: Update CLAUDE.md

Three new sections + one update to existing section.

- [x] Add **Session Start** section (after Workflow Protocol):

```markdown
## Session Start

At the start of each session, Claude should:
1. Pull latest main (`git pull origin main`)
2. Query the board for the current user's assigned items
   (`gh project item-list 1 --owner thrialectics --format json`)
3. Check blocked items for resolved conditions (dependency, conflict,
   decision, review, external)
4. Scan `.claude/todos/agent/` for stale working files (created >24h ago)
   and surface them for verification
5. Surface a brief summary before proceeding

If GitHub is unreachable, warn and continue from local branch state.
If the user has no assigned items, say so — don't treat it as an error.
```

- [x] Add **Start Work Gate** section (after Session Start):

```markdown
## Start Work Gate

Before beginning work on any task, run `/startwork` (or follow its
protocol manually). The command checks for blocking conditions,
duplicates, and WIP limits, then moves the task to "In Progress."

See `.claude/commands/startwork.md` for the full protocol.

Agents should only work items from `.claude/todos/agent/` or
explicitly assigned GitHub issues — never unassigned "Ready" items.
```

- [x] Add **Resource Lifecycle** section (after Start Work Gate):

```markdown
## Resource Lifecycle

| Artifact | Lifecycle | Cleanup Trigger |
|----------|-----------|-----------------|
| `docs/brainstorms/*.md` | Ephemeral | Delete after corresponding PR merges (if no other branches reference it) |
| `docs/plans/*.md` | Ephemeral | Delete after corresponding PR merges (if no other branches reference it) |
| `docs/solutions/*.md` | Persistent | Never — institutional knowledge |
| `.claude/todos/agent/*` | Ephemeral | Delete after agent completes work |
```

- [x] Update **Triage & Assignment** section — add dedup as step 0:

```markdown
0. **Check for duplicates.** Search open issues for keyword overlap
   before creating new ones. If a match is found, confirm relevance
   before commenting. Merge findings into existing issues when overlap
   is confirmed.
```

- [x] Update **Handoff Protocol** table — remove `.claude/todos/user/`
  from the Triage row. New value:
  `GitHub issues + .claude/todos/agent/`

- [x] Add **Blocking Conditions** definition (in Triage & Assignment
  or its own subsection):

```markdown
### Blocking Conditions

Five categories — used by Session Start and Start Work Gate:

- **dependency** — upstream issue still open
- **conflict** — another PR or in-progress task touches the same files
- **decision** — unresolved `human-decision` issue
- **review** — upstream PR not yet merged
- **external** — outside the team's control
```

**Files:**
- `CLAUDE.md` (project root)

### Phase 8: Verify & Commit

- [x] Run `git status` to verify all changes
- [x] Confirm no workflow references to `file-todos` remain
  (`grep -r "file-todos" .claude/`)
- [x] Confirm no references to `todos/user/` or `todos/resolved/`
  in workflow files
- [x] Verify `/startwork` command is at `.claude/commands/startwork.md`
- [x] Commit with message: `chore: workflow sync hygiene — collapse triage, add startwork command, clean up ephemeral files`

## Edge Cases & Mitigations

These came from SpecFlow analysis and are addressed in the
implementation above:

| Risk | Severity | Mitigation |
|------|----------|------------|
| Multi-PR plan file deletion | High | Guard: check other branches before deleting (Phase 5) |
| Triage false-positive auto-comment | High | Confirmation gate before commenting (Phase 3, 4) |
| Orphaned agent working files | Medium | Session-start stale-file scan (Phase 7) |
| `.claude/todos/` not untracked before gitignore | Medium | Explicit `git rm --cached` as first step (Phase 1) |
| Session-start offline failure | Low | Degraded-mode path: warn + continue (Phase 7) |
| Race condition on simultaneous work start | Low | Small team, convention-based — noted but not automated |

## Acceptance Criteria

- [x] `.claude/todos/` is gitignored and no files are tracked
- [x] `file-todos` skill directory is removed
- [x] `review.md` has single triage step with dedup + confirmation gate
- [x] `triage-todos.md` has dedup protocol, no file lifecycle references
- [x] `work.md` Phase 4 includes resource cleanup with multi-branch guard
- [x] `/startwork` command exists at `.claude/commands/startwork.md`
  with blocker check, dedup check, WIP limit check, and board update
- [x] `CLAUDE.md` has Session Start, Start Work Gate, Resource Lifecycle,
  Blocking Conditions sections
- [x] `CLAUDE.md` Start Work Gate references `/startwork` command
- [x] `CLAUDE.md` Triage & Assignment includes dedup step 0
- [x] No remaining references to `file-todos`, `todos/user/`, or
  `todos/resolved/` in any workflow file

## Dependencies & Risks

- **No blocking dependencies.** This is a workflow-only change — no
  application code affected.
- **Low merge-conflict risk.** These files aren't actively edited on
  other branches right now.
- **Team communication:** After merge, team should be told about the
  session-start and start-work-gate conventions so they're not surprised.

## References

- Brainstorm: [2026-02-20-workflow-sync-hygiene-brainstorm.md](docs/brainstorms/2026-02-20-workflow-sync-hygiene-brainstorm.md)
- Architecture: [2026-02-18-codebase-review-handoff.md](docs/solutions/2026-02-18-codebase-review-handoff.md)
- Shared workflows PR: #69
- Current workflow files:
  - [review.md](.claude/commands/workflows/review.md)
  - [triage-todos.md](.claude/commands/workflows/triage-todos.md)
  - [work.md](.claude/commands/workflows/work.md)
  - [file-todos SKILL.md](.claude/skills/file-todos/SKILL.md)
