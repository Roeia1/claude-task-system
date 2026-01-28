---
name: task-pattern
description: "Guidance for writing or refactoring agents and skills using structured task patterns. Use when creating new agents or skills, or refactoring existing ones."
allowed-tools: Read, Edit, Write, Glob, Grep
---

# Task Pattern for Agents and Skills

Patterns and best practices for writing or refactoring agents and skills using structured task tracking.

## Task Table Pattern

When an agent or skill has multiple steps, define them in a structured table using `TaskCreate` fields:

| Column | Description | Required |
|--------|-------------|----------|
| Subject | Brief task title (imperative form) | Yes |
| Description | Complete instructions to execute the task | Yes |
| Active Form | Present continuous form for spinner display | Yes |
| Blocked By | Tasks that must complete first | No |
| Blocks | Tasks waiting on this one | No |

### Example Table

```markdown
| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Read config | Read `config.json` from project root | Reading config | - | Validate config |
| Validate config | Check required fields exist and types are correct | Validating config | Read config | Apply changes |
| Apply changes | Update target files based on config values | Applying changes | Validate config | - |
```

## Description Column

The description column must be self-contained with all information needed to execute the task. Include commands, code snippets, and formats directly in the description. References to external files (other documents in the repo) are acceptable, but never reference sections within the same file.

## Dependency Design

Design dependencies to maximize parallel execution where possible:

```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Task A  │  │ Task B  │  │ Task C  │   ← Wave 1 (parallel)
└────┬────┘  └────┬────┘  └────┬────┘
     │            └─────┬──────┘
     │                  │
     ▼                  ▼
┌─────────┐       ┌─────────┐
│ Task D  │       │ Task E  │            ← Wave 2 (parallel)
└────┬────┘       └────┬────┘
     └────────┬────────┘
              │
              ▼
        ┌─────────┐
        │ Task F  │                      ← Wave 3
        └─────────┘
```

## Checklist

- [ ] Steps defined in a task table
- [ ] Each task has subject, description, and active form
- [ ] Dependencies defined where applicable
