---
name: workflows:compound
description: Document a recently solved problem to compound your team's knowledge
argument-hint: "[optional: brief context about the fix]"
---

# /compound

Coordinate multiple subagents working in parallel to document a recently solved problem.

## Purpose

Captures problem solutions while context is fresh, creating structured documentation in `docs/solutions/` with YAML frontmatter for searchability and future reference. Uses parallel subagents for maximum efficiency.

**Why "compound"?** Each documented solution compounds your team's knowledge. The first time you solve a problem takes research. Document it, and the next occurrence takes minutes. Knowledge compounds.

## Usage

```bash
/workflows:compound                    # Document the most recent fix
/workflows:compound [brief context]    # Provide additional context hint
```

## Execution Strategy: Two-Phase Orchestration

<critical_requirement>
**Only ONE file gets written - the final documentation.**

Phase 1 subagents return TEXT DATA to the orchestrator. They must NOT use Write, Edit, or create any files. Only the orchestrator (Phase 2) writes the final documentation file.
</critical_requirement>

### Phase 1: Parallel Research

<parallel_tasks>

Launch these subagents IN PARALLEL. Each returns text data to the orchestrator.

#### 1. **Context Analyzer**
   - Extracts conversation history
   - Identifies problem type, component, symptoms
   - Validates against schema
   - Returns: YAML frontmatter skeleton

#### 2. **Solution Extractor**
   - Analyzes all investigation steps
   - Identifies root cause
   - Extracts working solution with code examples
   - Returns: Solution content block

#### 3. **Related Docs Finder**
   - Searches `docs/solutions/` for related documentation
   - Identifies cross-references and links
   - Returns: Links and relationships

#### 4. **Prevention Strategist**
   - Develops prevention strategies
   - Creates best practices guidance
   - Generates test cases if applicable
   - Returns: Prevention/testing content

#### 5. **Category Classifier**
   - Determines optimal `docs/solutions/` category
   - Validates category against schema
   - Suggests filename based on slug
   - Returns: Final path and filename

#### 6. **Session Log Analyzer** (subagent: `session-log-analyzer`)
   - Reads Claude Code session logs from `~/.claude/projects/` for this project
   - Filters to sessions since the last compound run (by `docs/solutions/` modification time)
   - Extracts human observations, decisions, errors, workflow friction, and unresolved concerns from conversation transcripts
   - Returns: Structured summary of human context that would otherwise be lost between `/clear` boundaries

</parallel_tasks>

### Phase 2: Assembly & Write

<sequential_tasks>

**WAIT for all Phase 1 subagents to complete before proceeding.**

**Verify completeness:** After all agents return, check that each returned
a non-empty result. If any agent returned empty or errored, note which
analysis is missing in the final document (e.g., "Session log analysis
unavailable — no recent session logs found").

The orchestrating agent (main conversation) performs these steps:

1. Collect all text results from Phase 1 subagents
2. Assemble complete markdown file from the collected pieces
3. Validate YAML frontmatter against schema
4. Create directory if needed: `mkdir -p docs/solutions/[category]/`
5. Write the SINGLE final file: `docs/solutions/[category]/[filename].md`

</sequential_tasks>

## What It Captures

- **Problem symptom**: Exact error messages, observable behavior
- **Investigation steps tried**: What didn't work and why
- **Root cause analysis**: Technical explanation
- **Working solution**: Step-by-step fix with code examples
- **Prevention strategies**: How to avoid in future
- **Cross-references**: Links to related issues and docs
- **Human observations**: What the user noticed during testing and implementation (from session logs)
- **Workflow friction**: Where the process itself caused problems or required workarounds
- **Unresolved concerns**: Things flagged but not fully addressed

## What It Creates

**Organized documentation:**

- File: `docs/solutions/[category]/[filename].md`

**Categories:** Auto-detected from the problem. See
`.claude/skills/compound-docs/schema.yaml` for the canonical `problem_type`
list. Use an existing category directory when one fits; create a new one
(kebab-case) when none does.

## The Compounding Philosophy

This creates a compounding knowledge system:

1. First time you solve "N+1 query in brief generation" → Research (30 min)
2. Document the solution → docs/solutions/performance-issues/n-plus-one-briefs.md (5 min)
3. Next time similar issue occurs → Quick lookup (2 min)
4. Knowledge compounds → Team gets smarter

**Each unit of engineering work should make subsequent units of work easier—not harder.**

## Auto-Invoke

<auto_invoke>
<trigger_phrases>
- "that worked"
- "it's fixed"
- "working now"
- "problem solved"
</trigger_phrases>
</auto_invoke>

## Routes To

`compound-docs` skill
