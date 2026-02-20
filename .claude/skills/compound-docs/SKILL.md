---
name: compound-docs
description: Capture solved problems as categorized documentation with YAML frontmatter for fast lookup
disable-model-invocation: true
allowed-tools:
  - Read # Parse conversation context
  - Write # Create resolution docs
  - Bash # Create directories
  - Grep # Search existing docs
preconditions:
  - Problem has been solved (not in-progress)
  - Solution has been verified working
---

# compound-docs Skill

**Purpose:** Automatically document solved problems to build searchable institutional knowledge with category-based organization (enum-validated problem types).

## Overview

This skill captures problem solutions immediately after confirmation, creating structured documentation that serves as a searchable knowledge base for future sessions.

**Organization:** Single-file architecture - each problem documented as one markdown file in its symptom category directory (e.g., `docs/solutions/performance-issues/n-plus-one-briefs.md`). Files use YAML frontmatter for metadata and searchability.

---

<critical_sequence name="documentation-capture" enforce_order="strict">

## 7-Step Process

<step number="1" required="true">
### Step 1: Detect Confirmation

**Auto-invoke after phrases:**

- "that worked"
- "it's fixed"
- "working now"
- "problem solved"

**Non-trivial problems only:**

- Multiple investigation attempts needed
- Tricky debugging that took time
- Non-obvious solution
- Future sessions would benefit

**Skip documentation for:**

- Simple typos
- Obvious syntax errors
- Trivial fixes immediately corrected
</step>

<step number="2" required="true" depends_on="1">
### Step 2: Gather Context

Extract from conversation history:

**Required information:**

- **Module name**: Which module or component had the problem
- **Symptom**: Observable error/behavior (exact error messages)
- **Investigation attempts**: What didn't work and why
- **Root cause**: Technical explanation of actual problem
- **Solution**: What fixed it (code/config changes)
- **Prevention**: How to avoid in future

**BLOCKING REQUIREMENT:** If critical context is missing, ask user and WAIT for response before proceeding to Step 3.
</step>

<step number="3" required="false" depends_on="2">
### Step 3: Check Existing Docs

Search docs/solutions/ for similar issues:

```bash
grep -r "exact error phrase" docs/solutions/
ls docs/solutions/[category]/
```

**IF similar issue found:** Present decision options (new doc, update existing, link).
**ELSE:** Proceed directly to Step 4.
</step>

<step number="4" required="true" depends_on="2">
### Step 4: Generate Filename

Format: `[sanitized-symptom]-[module]-[YYYYMMDD].md`

**Sanitization rules:**

- Lowercase
- Replace spaces with hyphens
- Remove special characters except hyphens
- Truncate to reasonable length (< 80 chars)
</step>

<step number="5" required="true" depends_on="4" blocking="true">
### Step 5: Validate YAML Schema

**CRITICAL:** All docs require validated YAML frontmatter with enum validation.

Load [schema.yaml](./schema.yaml) and classify the problem against the enum values defined in [yaml-schema.md](./references/yaml-schema.md). Ensure all required fields are present and match allowed values exactly.

**BLOCK if validation fails.** Do NOT proceed to Step 6 until YAML frontmatter passes all validation rules.
</step>

<step number="6" required="true" depends_on="5">
### Step 6: Create Documentation

**Determine category from problem_type** using the category mapping in [yaml-schema.md](./references/yaml-schema.md).

```bash
mkdir -p "docs/solutions/${CATEGORY}"
```

**Create documentation:** Populate the structure from [resolution-template.md](./assets/resolution-template.md) with context gathered in Step 2 and validated YAML frontmatter from Step 5.
</step>

<step number="7" required="false" depends_on="6">
### Step 7: Cross-Reference & Critical Pattern Detection

If similar issues found in Step 3, add cross-references.

**Update patterns if applicable (3+ similar issues):**

Add to `docs/solutions/patterns/common-solutions.md`.

**Critical Pattern Detection:**

When user selects "Add to Required Reading", use the template from [critical-pattern-template.md](./assets/critical-pattern-template.md) to structure the pattern entry. Number it sequentially based on existing patterns in `docs/solutions/patterns/critical-patterns.md`.
</step>

</critical_sequence>

---

<decision_gate name="post-documentation" wait_for_user="true">

## Decision Menu After Capture

After successful documentation, present options and WAIT for user response:

```
✓ Solution documented

File created:
- docs/solutions/[category]/[filename].md

What's next?
1. Continue workflow (recommended)
2. Add to Required Reading - Promote to critical patterns (critical-patterns.md)
3. Link related issues - Connect to similar problems
4. View documentation - See what was captured
5. Other
```

</decision_gate>

---

## Success Criteria

- YAML frontmatter validated (all required fields, correct formats)
- File created in docs/solutions/[category]/[filename].md
- Enum values match schema exactly
- Code examples included in solution section
- Cross-references added if related issues found
- User presented with decision menu and action confirmed
