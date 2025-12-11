# generate-tasks

**Description**: Generate executable tasks from feature plan

## Purpose

This command analyzes a feature's definition and technical plan to generate a breakdown of executable tasks. Each task is created with its own worktree, branch, and PR for immediate execution capability.

## Usage

```bash
# Run from within a feature directory
cd task-system/features/001-user-authentication
/task-system:generate-tasks

# Or from repo root (will detect/prompt for feature)
/task-system:generate-tasks
```

## What It Does

1. **Detects feature directory** and validates prerequisites
2. **Reads feature.md and plan.md** to understand requirements and technical approach
3. **AI generates task breakdown** following implementation phases
4. **Shows proposed tasks** for review and modification
5. **After approval**:
   - Creates worktree + branch + PR for each task
   - Creates `tasks.md` in feature directory (reference)
6. **Links tasks back to feature** for traceability

## Command Logic

### Prerequisites

1. **Feature directory exists** with both feature.md and plan.md
2. **Tasks not already generated** (or user confirms regeneration)
3. **Must be run from main repo** (not a worktree)
4. **Clean working directory** (no uncommitted changes)

### Process

1. **Detect and validate feature**
   - Check current directory or prompt for feature selection
   - Verify feature.md exists
   - Verify plan.md exists
   - Check if tasks.md already exists (warn if so)

2. **Read planning artifacts**
   - Parse feature.md for:
     * User stories and acceptance criteria
     * Functional requirements
     * Success metrics
   - Parse plan.md for:
     * Implementation phases
     * Technology choices
     * Data models and APIs
     * Testing strategy
     * Risk assessment

3. **Load task breakdown template**
   - Read task-breakdown-template.md from plugin's templates/planning/
   - Use as structure guide

4. **AI-generated task breakdown**

   **Analysis Phase**:
   - Identify distinct work units from plan
   - Determine dependencies between units
   - Assess which tasks can be parallel
   - Map tasks to file changes

   **Task Generation Principles**:
   - One task per logical unit of work
   - Tasks should be completable in 1-2 days max
   - Each task tests one thing thoroughly
   - Clear, specific task descriptions
   - Explicit file paths for each task

   **Phase Organization**:

   **Phase 1: Setup & Foundation**
   - Project initialization
   - Database setup and migrations
   - Configuration and environment
   - Development tooling

   **Phase 2: Core Implementation**
   - Data models and entities
   - Business logic and services
   - Repository/data access layer
   - Core functionality

   **Phase 3: Integration**
   - API endpoints
   - External service integrations
   - Frontend integration (if applicable)
   - End-to-end workflows

   **Phase 4: Polish & Documentation**
   - Error handling improvements
   - Performance optimization
   - Documentation
   - Final testing and QA

5. **Parallelization analysis**

   Mark tasks as `[P]` if:
   - They modify different files
   - They have no data dependencies
   - They can be tested independently
   - They don't require sequential setup

6. **Generate task breakdown document**

   Create tasks.md with:
   - Task summary (total count, effort estimate)
   - All tasks with details:
     * Task ID (T001, T002, etc.)
     * Title
     * Type (feature/refactor/bugfix)
     * Priority (P1/P2/P3)
     * Dependencies
     * Files affected
     * Description
     * Parallelizable marker
   - Execution order recommendations
   - Notes for implementation

7. **Show proposal to user**

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

8. **Interactive editing** (if user chooses 'e')

9. **Create tasks in execution system**

   For each task in the breakdown (sequentially):

   a. **Determine next task ID**:
      - Scan existing `task-system/tasks/*/` directories
      - Check remote branches: `git branch -r | grep task-`
      - Find highest ID and increment by 1

   b. **Create branch**:
      ```bash
      git branch "task-$TASK_ID-$TYPE"
      ```

   c. **Create worktree**:
      ```bash
      mkdir -p task-system/tasks
      git worktree add "task-system/tasks/$TASK_ID" "task-$TASK_ID-$TYPE"
      ```

   d. **Generate task.md** from template:
      - Use task-template.md from plugin's templates/execution/
      - Fill in sections:
        * Feature Context (link to feature.md, plan.md, ADRs)
        * Overview (from task description)
        * Task Type
        * Priority
        * Dependencies (map TXXX to actual task IDs)
        * Objectives (from acceptance criteria)
        * Sub-tasks (break down further if needed)
        * Technical Approach (from plan.md)
        * Risks & Concerns (from plan.md risk assessment)
        * Resources & Links (link to plan.md, ADRs, docs)
        * Acceptance Criteria (specific to task)

   e. **Commit task definition**:
      ```bash
      cd "task-system/tasks/$TASK_ID"
      git add .
      git commit -m "docs(task-$TASK_ID): create task definition"
      ```

   f. **Push branch**:
      ```bash
      git push -u origin "task-$TASK_ID-$TYPE"
      ```

   g. **Create draft PR**:
      ```bash
      gh pr create \
        --title "Task $TASK_ID: $TITLE" \
        --body "## Task Definition\n\nSee: task-system/task-$TASK_ID/task.md\n\n## Feature\n\nFeature: $FEATURE_ID\n\n---\nStatus: Not started" \
        --head "task-$TASK_ID-$TYPE" \
        --draft
      ```

   h. **Return to main repo**:
      ```bash
      cd -
      ```

10. **Create feature tasks.md**

    - Save the task breakdown in `task-system/features/NNN-slug/tasks.md`
    - This serves as a reference/overview with links to each task
    - Include PR numbers for each task

11. **Report completion**

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

## Feature Context in Tasks

Each generated task.md includes:

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

This provides full traceability from task -> feature -> requirements.

## Error Handling

### Missing Prerequisites

```
Error: plan.md not found in task-system/features/001-example/

Please run /task-system:plan-feature first to create the technical plan.
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

---

**Next Command**: After generating tasks, `cd task-system/tasks/NNN` and use `/task-system:start-task NNN` to begin execution.
