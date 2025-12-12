---
name: task-builder
description: "Internal skill - builds a complete task with git infrastructure and task.md content. Invoked by task-builder agent only."
---

# Task Builder Skill

Builds a complete task: git branch, worktree, task.md content, commit, push, and draft PR.

## Input Parameters

You receive these from the task-builder agent:

| Parameter      | Description                                            |
| -------------- | ------------------------------------------------------ |
| `task_id`      | Pre-allocated ID (e.g., "015")                         |
| `task_type`    | feature/bugfix/refactor/performance/deployment         |
| `task_title`   | Title for the task                                     |
| `task_brief`   | 1-3 sentence description of what this task accomplishes|
| `task_scope`   | Which section(s) of plan.md this task implements       |
| `feature_path` | Path to feature.md                                     |
| `plan_path`    | Path to plan.md                                        |
| `adr_paths`    | Array of relevant ADR paths (may be empty)             |
| `dependencies` | List of dependency task IDs and titles                 |
| `priority`     | P1/P2/P3                                               |
| `feature_id`   | Feature ID (e.g., "001-user-auth") - optional          |

## Execution Process

Execute these steps **in order**. Read each instruction file just before executing that step.

### Step 1: Git Setup

Read and execute `instructions/01-git-setup.md`

### Step 2: Content Generation

Read and execute `instructions/02-content-gen.md`

### Step 3: Finalize

Read and execute `instructions/03-finalize.md`

## Output Format

**On success:**
```
Task {task_id} created successfully.

Branch: task-{task_id}-{task_type}
Worktree: task-system/tasks/{task_id}
PR: #{pr_number} - {pr_url}
```

**On failure:**
```
Task {task_id} creation failed at stage: {stage}

Error: {error_message}

Cleanup: {what was cleaned up, if any}
```

## Critical Rules

- **Never skip steps** - execute in order
- **Stop on first error** - do not attempt partial recovery
- **Use exact task_id** - never allocate a new one
- **Read instructions just-in-time** - helps manage context
