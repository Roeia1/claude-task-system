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

For each approved task, **sequentially**:

#### Step 1: Determine Next Task ID

```bash
# Find highest existing task ID by scanning:
# 1. Local worktrees
# 2. Remote branches with task- pattern
HIGHEST_LOCAL=$(ls -d task-system/tasks/*/ 2>/dev/null | grep -oP '\d+' | sort -n | tail -1)
HIGHEST_REMOTE=$(git branch -r | grep -oP 'task-\K\d+' | sort -n | tail -1)
NEXT_ID=$(( $(echo -e "$HIGHEST_LOCAL\n$HIGHEST_REMOTE" | sort -n | tail -1) + 1 ))
# Pad to 3 digits
TASK_ID=$(printf "%03d" $NEXT_ID)
```

#### Step 2: Create Branch

```bash
# Create branch from current HEAD (should be on main/master)
git branch "task-$TASK_ID-$TYPE"
```

#### Step 3: Create Worktree

```bash
mkdir -p task-system/tasks
git worktree add "task-system/tasks/$TASK_ID" "task-$TASK_ID-$TYPE"
```

#### Step 4: Write Task Definition

```bash
# Create task directory structure in worktree
mkdir -p "task-system/tasks/$TASK_ID/task-system/task-$TASK_ID"

# Write task.md with full context
# Location: task-system/tasks/$TASK_ID/task-system/task-$TASK_ID/task.md
# (Use task template, populate with feature links, objectives, etc.)
```

#### Step 5: Commit Task Definition

```bash
cd "task-system/tasks/$TASK_ID"
git add .
git commit -m "docs(task-$TASK_ID): create task definition

Task: $TITLE
Type: $TYPE
Priority: $PRIORITY
Feature: $FEATURE_ID"
```

#### Step 6: Push Branch

```bash
git push -u origin "task-$TASK_ID-$TYPE"
```

#### Step 7: Create PR

```bash
gh pr create \
  --title "Task $TASK_ID: $TITLE" \
  --body "## Task Definition

See: task-system/task-$TASK_ID/task.md

## Feature Context

Feature: $FEATURE_ID - $FEATURE_NAME
Plan: task-system/features/$FEATURE_SLUG/plan.md

---
Status: Not started (pending execution)" \
  --head "task-$TASK_ID-$TYPE" \
  --draft
```

#### Step 8: Return to Main Repo

```bash
cd - # Return to main repo root
```

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
