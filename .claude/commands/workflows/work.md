---
name: workflows:work
description: Execute work plans efficiently while maintaining quality and finishing features
argument-hint: "[plan file, specification, or todo file path]"
---

# Work Plan Execution Command

Execute a work plan efficiently while maintaining quality and finishing features.

## Introduction

This command takes a work document (plan, specification, or todo file) and executes it systematically. The focus is on **shipping complete features** by understanding requirements quickly, following existing patterns, and maintaining quality throughout.

## Input Document

<input_document> #$ARGUMENTS </input_document>

## Execution Workflow

### Phase 1: Quick Start

1. **Read Plan and Clarify**

   - Read the work document completely
   - Review any references or links provided in the plan
   - If anything is unclear or ambiguous, ask clarifying questions now
   - Get user approval to proceed
   - **Do not skip this** - better to ask questions now than build the wrong thing

2. **Setup Environment**

   First, read the base branch from config and check the current branch:

   ```bash
   # Read base branch from compound-engineering.local.md frontmatter
   base_branch=$(grep '^base_branch:' compound-engineering.local.md 2>/dev/null | sed 's/base_branch: *//')
   if [ -z "$base_branch" ]; then
     base_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
   fi
   if [ -z "$base_branch" ]; then
     base_branch=$(git rev-parse --verify origin/main >/dev/null 2>&1 && echo "main" || echo "master")
   fi

   current_branch=$(git branch --show-current)
   ```

   **Then, check for an existing feature branch related to this plan.** Derive an expected branch name from the plan title (e.g., a plan titled "feat: Slop Tycoon MVP" → `feat/slop-tycoon-mvp`). Check if that branch already exists locally:

   ```bash
   git branch --list "feat/*" --list "fix/*"
   ```

   **If a matching feature branch exists** (from a previous work pass on the same plan):
   - Ask: "Found existing branch `[branch_name]`. Continue on this branch?"
   - If yes, check it out and proceed to step 3
   - If no, follow "Create a new branch" below

   **If already on a feature branch** (not the base branch):
   - Ask: "Continue working on `[current_branch]`, or create a new branch?"
   - If continuing, proceed to step 3
   - If creating new, follow "Create a new branch" below

   **If on the base branch with no matching feature branch:**

   **Create a new branch**
   ```bash
   git pull origin [base_branch]
   git checkout -b feature-branch-name
   ```
   Use a meaningful name based on the work (e.g., `feat/slop-tycoon-mvp`, `fix/email-validation`).

   **Continue on the base branch** (requires explicit user confirmation)
   - Only proceed after user explicitly says "yes, commit to `[base_branch]`"
   - Never commit directly to the base branch without explicit permission

3. **Create Todo List**
   - Use TodoWrite to break plan into actionable tasks
   - Include dependencies between tasks
   - Prioritize based on what needs to be done first
   - Include testing and quality check tasks
   - Keep tasks specific and completable

### Phase 2: Execute

1. **Task Execution Loop**

   For each task in priority order:

   ```
   while (tasks remain):
     - Mark task as in_progress in TodoWrite
     - Read any referenced files from the plan
     - Look for similar patterns in codebase
     - Implement following existing conventions
     - Write tests for new functionality
     - Run tests after changes
     - Mark task as completed in TodoWrite
     - Mark off the corresponding checkbox in the plan file ([ ] → [x])
     - Evaluate for incremental commit (see below)
   ```

   **IMPORTANT**: Always update the original plan document by checking off completed items. Use the Edit tool to change `- [ ]` to `- [x]` for each task you finish. This keeps the plan as a living document showing progress and ensures no checkboxes are left unchecked.

2. **Incremental Commits**

   After completing each task, evaluate whether to create an incremental commit:

   | Commit when... | Don't commit when... |
   |----------------|---------------------|
   | Logical unit complete (model, service, component) | Small part of a larger unit |
   | Tests pass + meaningful progress | Tests failing |
   | About to switch contexts (backend → frontend) | Purely scaffolding with no behavior |
   | About to attempt risky/uncertain changes | Would need a "WIP" commit message |

   **Heuristic:** "Can I write a commit message that describes a complete, valuable change? If yes, commit. If the message would be 'WIP' or 'partial X', wait."

   **Commit workflow:**
   ```bash
   # 1. Verify tests pass (use project's test command)
   # 2. Stage only files related to this logical unit (not `git add .`)
   git add <files related to this logical unit>
   # 3. Commit with conventional message
   git commit -m "feat(scope): description of this unit"
   ```

3. **Follow Existing Patterns**

   - The plan should reference similar code - read those files first
   - Match naming conventions exactly
   - Reuse existing components where possible
   - Follow project coding standards (see CLAUDE.md)
   - When in doubt, grep for similar implementations

4. **Test Continuously**

   - Run relevant tests after each significant change
   - Don't wait until the end to test
   - Fix failures immediately
   - Add new tests for new functionality

5. **Track Progress**
   - Keep TodoWrite updated as you complete tasks
   - Note any blockers or unexpected discoveries
   - Create new tasks if scope expands
   - Keep user informed of major milestones

### Phase 3: Quality Check

1. **Run Core Quality Checks**

   Always run before submitting:

   ```bash
   # Run full test suite (use project's test command)
   # Run linting (per CLAUDE.md)
   ```

2. **Consider Reviewer Agents** (Optional)

   Use for complex, risky, or large changes. Read agents from `compound-engineering.md` frontmatter (`review_agents`).

   Run configured agents in parallel with Task tool. Present findings and address critical issues.

3. **Final Validation**
   - All TodoWrite tasks marked completed
   - All tests pass
   - Linting passes
   - Code follows existing patterns
   - No console errors or warnings

### Phase 4: Ship It

1. **Create Commit**

   ```bash
   git add .
   git status  # Review what's being committed
   git diff --staged  # Check the changes

   # Commit with conventional format
   git commit -m "$(cat <<'EOF'
   feat(scope): description of what and why

   Brief explanation if needed.

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

2. **Create Pull Request**

   Use the base branch from config (read in Phase 1 step 2) as the PR target:

   ```bash
   git push -u origin feature-branch-name

   gh pr create --base [base_branch] --title "Feature: [Description]" --body "$(cat <<'EOF'
   ## Summary
   - What was built
   - Why it was needed
   - Key decisions made

   ## Testing
   - Tests added/modified
   - Manual testing performed
   EOF
   )"
   ```

3. **Update Plan Status**

   If the input document has YAML frontmatter with a `status` field, update it to `completed`:
   ```
   status: active  →  status: completed
   ```

4. **Notify User**
   - Summarize what was completed
   - Link to PR
   - Note any follow-up work needed
   - Suggest next steps if applicable

## Key Principles

### Start Fast, Execute Faster

- Get clarification once at the start, then execute
- Don't wait for perfect understanding - ask questions and move
- The goal is to **finish the feature**, not create perfect process

### The Plan is Your Guide

- Work documents should reference similar code and patterns
- Load those references and follow them
- Don't reinvent - match what exists

### Test As You Go

- Run tests after each change, not at the end
- Fix failures immediately
- Continuous testing prevents big surprises

### Quality is Built In

- Follow existing patterns
- Write tests for new code
- Run linting before pushing
- Use reviewer agents for complex/risky changes only

### Ship Complete Features

- Mark all tasks completed before moving on
- Don't leave features 80% done
- A finished feature that ships beats a perfect feature that doesn't

## Quality Checklist

Before creating PR, verify:

- [ ] All clarifying questions asked and answered
- [ ] All TodoWrite tasks marked completed
- [ ] Tests pass (run project's test command)
- [ ] Linting passes
- [ ] Code follows existing patterns
- [ ] Commit messages follow conventional format
- [ ] PR description includes summary and testing notes
