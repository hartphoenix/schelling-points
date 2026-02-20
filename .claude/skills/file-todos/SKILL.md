---
name: file-todos
description: This skill should be used when managing the file-based todo tracking system in the .claude/todos/ directory. It provides workflows for creating todos, managing status and dependencies, conducting triage, and integrating with code review processes.
disable-model-invocation: true
---

# File-Based Todo Tracking Skill

## Overview

The `.claude/todos/` directory contains a file-based tracking system for managing code review feedback, technical debt, feature requests, and work items. Each todo is a markdown file with YAML frontmatter and structured sections.

This skill should be used when:
- Creating new todos from findings or feedback
- Managing todo lifecycle (pending → ready → complete)
- Triaging pending items for approval
- Checking or managing dependencies
- Converting PR comments or code findings into tracked work
- Updating work logs during todo execution

## File Naming Convention

Todo files follow this naming pattern:

```
{issue_id}-{status}-{priority}-{description}.md
```

**Components:**
- **issue_id**: Sequential number (001, 002, 003...) - never reused
- **status**: `pending` (needs triage), `ready` (approved), `complete` (done)
- **priority**: `p1` (critical), `p2` (important), `p3` (nice-to-have)
- **description**: kebab-case, brief description

**Examples:**
```
001-pending-p1-mailer-test.md
002-ready-p1-fix-n-plus-1.md
005-complete-p2-refactor-csv.md
```

## File Structure

Each todo is a markdown file with YAML frontmatter and structured sections. Use the template at [todo-template.md](./assets/todo-template.md) as a starting point when creating new todos.

**Required sections:**
- **Problem Statement** - What is broken, missing, or needs improvement?
- **Findings** - Investigation results, root cause, key discoveries
- **Proposed Solutions** - Multiple options with pros/cons, effort, risk
- **Recommended Action** - Clear plan (filled during triage)
- **Acceptance Criteria** - Testable checklist items
- **Work Log** - Chronological record with date, actions, learnings

**YAML frontmatter fields:**
```yaml
---
status: ready              # pending | ready | complete
priority: p1              # p1 | p2 | p3
issue_id: "002"
tags: [performance, database]
dependencies: ["001"]     # Issue IDs this is blocked by
---
```

## Common Workflows

### Creating a New Todo

1. Determine next issue ID: `ls .claude/todos/ | grep -o '^[0-9]\+' | sort -n | tail -1`
2. Copy template: `cp assets/todo-template.md .claude/todos/{NEXT_ID}-pending-{priority}-{description}.md`
3. Fill required sections
4. Determine status: `pending` (needs triage) or `ready` (pre-approved)
5. Add relevant tags for filtering

### Triaging Pending Items

1. List pending items: `ls .claude/todos/*-pending-*.md`
2. For each todo: read, review, make decision
3. Update approved todos:
   - Rename file: `pending` → `ready`
   - Update frontmatter status
   - Fill "Recommended Action" section

### Completing a Todo

1. Verify all acceptance criteria checked off
2. Update Work Log with final session and results
3. Rename file: `ready` → `complete`
4. Update frontmatter status
5. Check for unblocked work
6. Commit with issue reference

## Quick Reference Commands

```bash
# List highest priority unblocked work
grep -l 'dependencies: \[\]' .claude/todos/*-ready-p1-*.md

# List all pending items needing triage
ls .claude/todos/*-pending-*.md

# Find next issue ID
ls .claude/todos/ | grep -o '^[0-9]\+' | sort -n | tail -1 | awk '{printf "%03d", $1+1}'

# Count by status
for status in pending ready complete; do
  echo "$status: $(ls -1 .claude/todos/*-$status-*.md 2>/dev/null | wc -l)"
done
```
