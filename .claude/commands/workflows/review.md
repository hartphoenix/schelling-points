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

### 5. Findings Synthesis

- [ ] Collect findings from all parallel agents
- [ ] Surface learnings-researcher results: if past solutions are relevant, flag them as "Known Pattern" with links to docs/solutions/ files
- [ ] Discard any findings that recommend deleting files in `docs/plans/` or `docs/solutions/`
- [ ] Categorize by type: security, performance, architecture, quality, etc.
- [ ] Assign severity levels: P1 (CRITICAL), P2 (IMPORTANT), P3 (NICE-TO-HAVE)
- [ ] Remove duplicate or overlapping findings
- [ ] Estimate effort for each finding (Small/Medium/Large)

### 6. Triage & Issue Routing

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

### 7. Summary Report

Present comprehensive summary:

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
- **Agent-resolvable:** [count] → GitHub issues + `.claude/todos/agent/`
- **Human-needed:** [count] → GitHub issues

### Next Steps:
1. Address P1 Findings (CRITICAL - must be fixed before merge)
2. Run `/workflows:work` on agent-resolvable items
3. Review human-needed items on the project board
```

### Important: P1 Findings Block Merge

Any P1 (CRITICAL) findings must be addressed before merging the PR. Present these prominently and ensure they're resolved before accepting the PR.
