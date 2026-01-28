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

## Agent Instructions Template

```markdown
## Process

### 1. Create Task List

Use `TaskCreate` to create all tasks below, then use `TaskUpdate` to set up the dependencies (via `addBlockedBy` and `addBlocks`), then execute them.

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| ... | ... | ... | ... | ... |

### 2. Return Result

After all tasks are completed, output the result in this exact JSON format:

\`\`\`json
{
  "field": "value"
}
\`\`\`
```

## Description Column

The description column should contain all information needed to execute the task. Referencing external files or documentation is acceptable.

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

### Parallel Execution Constraints

**Important**: Subagents cannot spawn other subagents. If your agent runs as a subagent:
- Tasks execute sequentially within the agent
- Dependencies document logical order but don't enable parallelism
- Parallelism happens at the parent skill level (multiple subagents)

To maximize parallelism:
- Move shared/reusable work to the parent skill
- Keep subagent work focused and minimal
- Let the parent orchestrate parallel subagent invocations

## Reference Implementation

See `plugin/agents/generate-story.md` for a complete example of this pattern.

## Checklist

When writing or refactoring an agent/skill:

- [ ] All steps defined in a single task table
- [ ] Descriptions are self-contained (no external references needed)
- [ ] Active forms use present continuous tense
- [ ] Dependencies minimize sequential bottlenecks
- [ ] Output format clearly specified
- [ ] Environment variables used for paths
