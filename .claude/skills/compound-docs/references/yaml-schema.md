# YAML Frontmatter Schema

**See `schema.yaml` for the complete schema specification.**

## Required Fields

- **module** (string): Module name (e.g., "GameEngine") or "System" for system-wide issues
- **date** (string): ISO 8601 date (YYYY-MM-DD)
- **problem_type** (enum): One of [build_error, test_failure, runtime_error, performance_issue, database_issue, security_issue, ui_bug, integration_issue, logic_error, developer_experience, workflow_issue, best_practice, documentation_gap]
- **component** (string): Technical component involved
- **symptoms** (array): 1-5 specific observable symptoms
- **root_cause** (string): Fundamental cause of the problem
- **resolution_type** (enum): One of [code_fix, migration, config_change, test_fix, dependency_update, environment_setup, workflow_improvement, documentation_update, tooling_addition]
- **severity** (enum): One of [critical, high, medium, low]

## Optional Fields

- **tags** (array): Searchable keywords (lowercase, hyphen-separated)

## Validation Rules

1. All required fields must be present
2. Enum fields must match allowed values exactly (case-sensitive)
3. symptoms must be YAML array with 1-5 items
4. date must match YYYY-MM-DD format
5. tags should be lowercase, hyphen-separated

## Example

```yaml
---
module: Game Engine
date: 2026-02-15
problem_type: performance_issue
component: rendering_pipeline
symptoms:
  - "Frame drops below 30fps during particle effects"
  - "GPU memory spikes during scene transitions"
root_cause: "Unoptimized particle batch rendering"
resolution_type: code_fix
severity: high
tags: [performance, rendering, particles]
---
```

## Category Mapping

Based on `problem_type`, documentation is filed in:

- **build_error** → `docs/solutions/build-errors/`
- **test_failure** → `docs/solutions/test-failures/`
- **runtime_error** → `docs/solutions/runtime-errors/`
- **performance_issue** → `docs/solutions/performance-issues/`
- **database_issue** → `docs/solutions/database-issues/`
- **security_issue** → `docs/solutions/security-issues/`
- **ui_bug** → `docs/solutions/ui-bugs/`
- **integration_issue** → `docs/solutions/integration-issues/`
- **logic_error** → `docs/solutions/logic-errors/`
- **developer_experience** → `docs/solutions/developer-experience/`
- **workflow_issue** → `docs/solutions/workflow-issues/`
- **best_practice** → `docs/solutions/best-practices/`
- **documentation_gap** → `docs/solutions/documentation-gaps/`
