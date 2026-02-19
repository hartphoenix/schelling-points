---
name: workflows:review
description: Perform exhaustive code reviews using multi-agent analysis
argument-hint: "[PR number, GitHub URL, branch name, or latest]"
---

# Review Command

<command_purpose> Perform exhaustive code reviews using multi-agent analysis. </command_purpose>

## Introduction

<role>Senior Code Review Architect with expertise in security, performance, architecture, and quality assurance</role>

## Prerequisites

<requirements>
- Git repository with GitHub CLI (`gh`) installed and authenticated
- Clean main/master branch
- Proper permissions to access the repository
</requirements>

## Main Tasks

### 1. Determine Review Target & Setup (ALWAYS FIRST)

<review_target> #$ARGUMENTS </review_target>

#### Immediate Actions:

- [ ] Determine review type: PR number (numeric), GitHub URL, file path (.md), or empty (current branch)
- [ ] Check current git branch
- [ ] If ALREADY on the target branch → proceed with analysis on current branch
- [ ] If DIFFERENT branch → checkout the target branch
- [ ] Fetch PR metadata using `gh pr view --json` for title, body, files, linked issues
- [ ] Make sure we are on the branch we are reviewing

#### Protected Artifacts

<protected_artifacts>
The following paths are pipeline artifacts and must never be flagged for deletion:

- `docs/plans/*.md` — Plan files created by `/workflows:plan`
- `docs/solutions/*.md` — Solution documents created during the pipeline
</protected_artifacts>

#### Load Review Agents

Read `compound-engineering.md` in the project root. Use `review_agents` from YAML frontmatter. If the markdown body contains review context, pass it to each agent as additional instructions.

#### Parallel Agents to review the PR:

<parallel_tasks>

Run all configured review agents in parallel using Task tool. For each agent in the `review_agents` list:

```
Task {agent-name}(PR content + review context from settings body)
```

Additionally, always run these regardless of settings:
- Task learnings-researcher(PR content) - Search docs/solutions/ for past issues related to this PR's modules and patterns
- Task feature-ui-completeness(PR content + changed files) - Phase 5 audit (see instructions below)
- Task decision-balance-audit(PR content + changed files) - Phase 6 audit (see instructions below)

</parallel_tasks>

### 4. Deep Dive Phases

#### Phase 3: Stakeholder Perspective Analysis

1. **Developer Perspective** — How easy is this to understand and modify?
2. **Operations Perspective** — How do I deploy this safely?
3. **End User Perspective** — Is the feature intuitive?
4. **Security Team Perspective** — What's the attack surface?

#### Phase 4: Scenario Exploration

- [ ] **Happy Path**: Normal operation with valid inputs
- [ ] **Invalid Inputs**: Null, empty, malformed data
- [ ] **Boundary Conditions**: Min/max values, empty collections
- [ ] **Concurrent Access**: Race conditions, deadlocks
- [ ] **Network Issues**: Timeouts, partial failures
- [ ] **Security Attacks**: Injection, overflow, DoS

#### Phase 5: Feature-UI Completeness Audit (subagent)

Run as a Task subagent with the diff/file list. Read agent instructions from `.claude/subagents/feature-ui-completeness.md`.

#### Phase 6: Decision & Balance Audit (subagent)

Run as a Task subagent with the diff/file list. Read agent instructions from `.claude/subagents/decision-balance-audit.md`.

### 4. Simplification and Minimalism Review

Run the Task code-simplicity-reviewer() to see if we can simplify the code.

### 5. Findings Synthesis and Todo Creation Using file-todos Skill

<critical_requirement> ALL findings MUST be stored in the .claude/todos/ directory using the file-todos skill. Create todo files immediately after synthesis. </critical_requirement>

#### Step 1: Synthesize All Findings

- [ ] Collect findings from all parallel agents
- [ ] Surface learnings-researcher results: if past solutions are relevant, flag them as "Known Pattern" with links to docs/solutions/ files
- [ ] Discard any findings that recommend deleting files in `docs/plans/` or `docs/solutions/`
- [ ] Categorize by type: security, performance, architecture, quality, etc.
- [ ] Assign severity levels: P1 (CRITICAL), P2 (IMPORTANT), P3 (NICE-TO-HAVE)
- [ ] Remove duplicate or overlapping findings
- [ ] Estimate effort for each finding (Small/Medium/Large)

#### Step 2: Create Todo Files Using file-todos Skill

Use the file-todos skill to create todo files for ALL findings immediately.

- Create todo files directly using Write tool
- Use standard template from `.claude/skills/file-todos/assets/todo-template.md`
- Follow naming convention: `{issue_id}-pending-{priority}-{description}.md`

**Examples:**
```
001-pending-p1-path-traversal-vulnerability.md
002-pending-p1-api-response-validation.md
003-pending-p2-concurrency-limit.md
004-pending-p3-unused-parameter.md
```

#### Step 3: Triage — Classify Ownership

<critical_requirement> After todos are created, spawn a fresh triage agent to classify every finding by ownership. Do NOT skip this step. </critical_requirement>

Spawn a Task agent with the following prompt:

> Read all todo files in `.claude/todos/`. Read the team roster and assignment
> protocol from `CLAUDE.md`. For each finding, classify it:
>
> **Agent-resolvable** (all must be true):
> - One correct answer derivable from code context, language rules, or repo conventions
> - No product behavior, UX flow, or architecture shape is being decided
> - A wrong fix would be an obvious bug, not a defensible design choice
>
> **Human-needed** (any is true):
> - Fix requires choosing between multiple legitimate options
> - Decision affects user-facing behavior or product feel
> - "Right" answer depends on intent the codebase doesn't encode
> - Finding involves removing/keeping code whose purpose is unclear
>
> Create `.claude/todos/agent/README.md` listing agent-resolvable items with status.
> Create `.claude/todos/user/README.md` listing human-needed items linked to GitHub issues.
>
> For each human-needed item, file a GitHub issue (if one doesn't already exist)
> and add it to the project board. Use `gh issue create` and `gh project item-add`.

The triage agent produces two directories:

```
.claude/todos/
├── agent/    # Agent works these autonomously via /workflows:work
└── user/     # Human reviews these; linked to GitHub issues
```

See `.claude/commands/workflows/triage-todos.md` for decision
criteria details and examples.

#### Step 4: Summary Report

After triage completes, present comprehensive summary:

```markdown
## Code Review Complete

**Review Target:** PR #XXXX - [PR Title]
**Branch:** [branch-name]

### Findings Summary:
- **Total Findings:** [X]
- **CRITICAL (P1):** [count] - BLOCKS MERGE
- **IMPORTANT (P2):** [count] - Should Fix
- **NICE-TO-HAVE (P3):** [count] - Enhancements

### Triage:
- **Agent-resolvable:** [count] → `todos/agent/`
- **Human-needed:** [count] → `todos/user/` (GitHub issues filed)

### Created Todo Files:
[list all created todo files]

### Next Steps:
1. Address P1 Findings (CRITICAL - must be fixed before merge)
2. Run `/workflows:work` on agent-resolvable items
3. Review human-needed items on the project board
```

### Important: P1 Findings Block Merge

Any P1 (CRITICAL) findings must be addressed before merging the PR. Present these prominently and ensure they're resolved before accepting the PR.
