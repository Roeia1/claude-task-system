---
name: task-generation
description: "ONLY activate on DIRECT user request to generate tasks. User must explicitly mention keywords: 'generate tasks', 'break down feature', 'create tasks'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to generate tasks."
---

# Task Generation Skill

When activated, generate executable tasks from feature planning artifacts. Each task is created with its own worktree, branch, and PR.

## File Locations

- **Task Breakdown Template**: Read from plugin's `templates/planning/task-breakdown-template.md`
- **Task Template**: Read from plugin's `templates/execution/task-template.md`
- **Input**: `task-system/features/NNN-slug/feature.md` and `plan.md`
- **Output (Reference)**: `task-system/features/NNN-slug/tasks.md`
- **Output (Task Worktrees)**: `task-system/tasks/NNN/` (git worktrees)

## Prerequisites

1. Feature directory must exist with both `feature.md` and `plan.md`
2. Tasks not already generated (or user confirms regeneration)
3. Must be run from main repository (not a worktree)
4. Working directory must be clean (no uncommitted changes)

## Process

### Phase 1: Analysis and Planning

1. **Detect and validate feature** (current directory or prompt for selection)
2. **Read planning artifacts**:
   - `feature.md` for user stories, acceptance criteria, requirements
   - `plan.md` for implementation phases, technology choices, data models, APIs
3. **Read templates** from plugin:
   - `templates/planning/task-breakdown-template.md` for structure
   - `templates/execution/task-template.md` for individual tasks
4. **AI-generated task breakdown**:
   - Identify distinct work units from plan
   - Determine dependencies between units
   - Assess which tasks can be parallelized
   - Map tasks to file changes
   - Organize into phases (Setup -> Core -> Integration -> Polish)
5. **Show proposed tasks** for user review:

   ```markdown
   ## Proposed Task Breakdown

   Total: 12 tasks
   Parallelizable: 6 tasks

   Phase 1: Setup (2 tasks)
   - T001: Setup project structure and dependencies
   - T002: Create database schema and migrations

   Phase 2: Core (5 tasks, 3 parallelizable)
   - T003: Implement User model and repository [P]
   - T004: Implement Session model and repository [P]
   - T005: Implement AuthService (depends on T003, T004)
   - T006: Implement password hashing utilities [P]
   - T007: Implement JWT token generation

   Phase 3: Integration (3 tasks)
   - T008: Create login API endpoint
   - T009: Create logout API endpoint
   - T010: Create password reset flow

   Phase 4: Polish (2 tasks, parallelizable)
   - T011: Add comprehensive error handling [P]
   - T012: Write integration tests [P]

   Review this breakdown:
   [y] Looks good, create tasks
   [e] Edit tasks (merge/split/reorder)
   [n] Regenerate with different approach

   Your choice: [y/e/n]
   ```

6. **Interactive editing** (if user chooses 'e')
   - Merge tasks that are too small
   - Split tasks that are too large
   - Reorder for better dependency flow
   - Modify titles and descriptions

### Phase 2: Task Creation (After Approval)

Task creation runs in **parallel** using the `task-generator` subagent.

#### Step 2a: Pre-allocate Task IDs

Allocate all task IDs upfront to prevent race conditions:

```bash
# Count approved tasks
TASK_COUNT=<number of approved tasks>

# Allocate consecutive IDs atomically
bash scripts/allocate-task-ids.sh $TASK_COUNT
```

**Expected output**:
```json
{"status": "ok", "task_ids": ["015","016","017"], "start_id": "015", "end_id": "017"}
```

Store the allocated `task_ids` array for use in Step 2c.

#### Step 2b: Prepare Task Content

For each approved task, prepare the full `task.md` content:

1. Read `templates/execution/task-template.md`
2. Populate template with:
   - Pre-allocated task ID from Step 2a
   - Feature context links (feature.md, plan.md, ADRs)
   - Task overview and motivation
   - Objectives and acceptance criteria
   - Sub-tasks and technical approach
   - Dependencies (mapped to pre-allocated IDs)

**Dependency mapping**: If task T001 depends on T002 within the same batch:
- T001 gets ID 015, T002 gets ID 016
- T001's dependencies section references "016" (not T002)

#### Step 2c: Spawn Task-Generator Subagents in Parallel

For each approved task, invoke the `task-generator` subagent with:

| Parameter | Value |
|-----------|-------|
| `task_id` | Pre-allocated ID (e.g., "015") |
| `task_type` | feature/bugfix/refactor/performance/deployment |
| `task_title` | Task title |
| `task_content` | Full task.md content from Step 2b |
| `feature_id` | Feature ID (e.g., "001-user-authentication") |
| `feature_name` | Feature name for PR body |
| `priority` | P1/P2/P3 |

**Parallel execution**: All subagents run concurrently. Each operates on its own pre-allocated task ID, branch, and worktree.

#### Step 2d: Collect Results

Wait for all subagents to complete and collect results:

| Task ID | Status | PR # | Notes |
|---------|--------|------|-------|
| 015 | Success | #42 | |
| 016 | Success | #43 | |
| 017 | Failed | - | Branch creation failed |

**On partial failure**:
- Report which tasks succeeded and which failed
- Successful tasks are ready for execution
- Failed tasks can be retried using the `task-creation` skill individually

**On complete success**:
- All tasks have worktrees, branches, and draft PRs
- Proceed to Phase 3 (Reference Documentation)

### Phase 3: Reference Documentation

After all tasks are created:

1. **Create reference `tasks.md`** in feature directory:
   ```markdown
   # Tasks for Feature $FEATURE_ID: $FEATURE_NAME

   Generated from: plan.md

   ## Task List

   | ID | Title | Type | Priority | PR |
   |----|-------|------|----------|-----|
   | 015 | [Title](../task-015/task.md) | feature | P1 | #XX |
   | 016 | [Title](../task-016/task.md) | feature | P1 | #YY |

   ## Dependencies

   ```mermaid
   graph TD
       015 --> 016
       015 --> 017
       016 --> 018
   ```
   ```

2. **Commit reference** in main repo:
   ```bash
   git add task-system/features/$FEATURE_SLUG/tasks.md
   git commit -m "docs($FEATURE_ID): add task breakdown reference"
   git push
   ```

## Task Generation Principles

- **One task per logical unit** of work (1-2 days max)
- **Clear dependencies** with proper sequencing
- **Parallelization analysis** (mark tasks that can run concurrently)
- **Full traceability** (every task links back to feature/plan/ADRs)
- **Specific acceptance criteria** for each task
- **Immediate PR creation** (enables visibility and collaboration)

## Task Structure

Each generated task includes:
- Feature Context (links to feature.md, plan.md, ADRs)
- Overview and motivation
- Task Type (feature/refactor/bugfix/performance/deployment)
- Priority (P1/P2/P3)
- Dependencies
- Objectives (measurable checkboxes)
- Sub-tasks (actionable items)
- Technical Approach
- Risks & Concerns
- Acceptance Criteria

### Feature Context Example

Each generated task.md includes traceability to the feature:

```markdown
# Task 015: Implement User Model

## Feature Context

**Feature**: [001-user-authentication](../features/001-user-authentication/feature.md)
**Technical Plan**: [plan.md](../features/001-user-authentication/plan.md)
**Feature Tasks**: [tasks.md](../features/001-user-authentication/tasks.md)
**ADRs**:
- [001-use-postgresql.md](../features/001-user-authentication/adr/001-use-postgresql.md)
- [002-password-hashing.md](../features/001-user-authentication/adr/002-password-hashing.md)

## Overview
[Task-specific content...]
```

## Completion Report

After all tasks are created, display completion summary:

```
Tasks generated successfully!

Summary:
- Tasks created: 015-026 (12 tasks)
- Task breakdown: task-system/features/001-user-authentication/tasks.md

Tasks with worktrees and PRs:
- task-system/tasks/015/ (PR #XX)
- task-system/tasks/016/ (PR #YY)
- ...

Next steps:
1. Use "list tasks" to see all tasks
2. cd task-system/tasks/015 && claude
3. Say "start task 015" to begin workflow

Recommended execution order:
1. Tasks 015-016 (Setup, sequential)
2. Tasks 017-019 + 021 (Core, can be parallel)
3. Task 020 (depends on 017-019)
4. Tasks 022-024 (Integration, sequential)
5. Tasks 025-026 (Polish, can be parallel)
```

## Error Handling

### Missing Prerequisites

```
Error: plan.md not found in task-system/features/001-example/

Please use "plan feature" first to create the technical plan.
```

### Tasks Already Generated

```
Warning: tasks.md already exists in this feature.

Existing task worktrees found:
- task-system/tasks/015/ (PR #XX - open)
- task-system/tasks/016/ (PR #YY - open)

Do you want to:
1. Regenerate tasks (will create new task IDs and PRs)
2. Cancel

Your choice: [1/2]
```

## Notes

- Review generated tasks before starting execution
- Each task has its own worktree, branch, and PR
- Tasks can be worked on in parallel from different machines
- Use "list tasks" to see status of all tasks
- Use "resume task NNN" to continue work on a task from another machine
- Large features may generate 15-20+ tasks - that's fine

## Next Steps

After task generation:
- Use `list tasks` to see all generated tasks
- Use `start task NNN` to begin execution on a specific task
- Tasks are ready to be worked on in parallel (different machines/sessions)

## References

- Task template: Plugin's `templates/execution/task-template.md`
- Task breakdown template: Plugin's `templates/planning/task-breakdown-template.md`
