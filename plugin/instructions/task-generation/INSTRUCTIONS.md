# Task Generation Skill

When activated, generate executable tasks from feature planning artifacts. Each task is created with its own worktree, branch, and PR.

## File Locations

- **Task Breakdown Template**: `${CLAUDE_PLUGIN_ROOT}/instructions/task-generation/templates/task-breakdown-template.md`
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
3. **Read template**:
   - `${CLAUDE_PLUGIN_ROOT}/instructions/task-generation/templates/task-breakdown-template.md` for structure
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

Task creation spawns parallel `task-builder` subagents, one per task. Each handles git setup, content generation, and PR creation.

#### Step 2a: Verify Sync with Origin (Critical)

Before creating any tasks, verify local master is in sync with origin:

```bash
# Fetch latest from origin
git fetch origin

# Check if local has unpushed commits or differs from origin
if ! git diff HEAD origin/master --quiet 2>/dev/null; then
    echo "ERROR: Local master is not in sync with origin/master."
    echo "Push or pull changes before generating tasks."
    exit 1
fi
```

**If this check fails, stop immediately.** Do not spawn task-builders. Creating worktrees from an unsynced state will cause orphaned merges where PRs merge into a base that doesn't exist on origin.

#### Step 2b: Pre-allocate Task IDs

Allocate all task IDs upfront to prevent race conditions:

```bash
# Count approved tasks
TASK_COUNT=<number of approved tasks>

# Allocate consecutive IDs atomically
bash scripts/allocate-task-ids.sh $TASK_COUNT
```

**Expected output**:

```json
{
  "status": "ok",
  "task_ids": ["015", "016", "017"],
  "start_id": "015",
  "end_id": "017"
}
```

Store the allocated `task_ids` array for use in subsequent steps.

**Dependency mapping**: Map internal task references to allocated IDs:

- If task T001 depends on T002 within the same batch
- T001 gets ID 015, T002 gets ID 016
- T001's dependencies reference "016" (not T002)

#### Step 2c: Build Tasks (Parallel Subagents)

For each approved task, spawn a `task-builder` subagent that handles both git setup and content generation:

| Parameter      | Value                                            |
| -------------- | ------------------------------------------------ |
| `task_id`      | Pre-allocated ID (e.g., "015")                   |
| `task_type`    | feature/bugfix/refactor/performance/deployment   |
| `task_title`   | Task title                                       |
| `task_brief`   | 1-3 sentence description from breakdown          |
| `task_scope`   | Which section(s) of plan.md this task implements |
| `feature_path` | Path to feature.md                               |
| `plan_path`    | Path to plan.md                                  |
| `adr_paths`    | Array of relevant ADR paths                      |
| `dependencies` | List of dependency task IDs and titles           |
| `priority`     | P1/P2/P3                                         |
| `feature_id`   | Feature ID (e.g., "001-user-authentication")     |

**Parallel execution**: All task-builder instances run concurrently. Each instance:

1. Creates git branch and worktree (fast-fail before expensive work)
2. Generates comprehensive task.md content
3. Commits, pushes, and creates draft PR

**Wait for all subagents** to complete before proceeding.

#### Step 2d: Collect Results

Wait for all subagents to complete and collect results:

| Task ID | Status  | PR # | Notes                  |
| ------- | ------- | ---- | ---------------------- |
| 015     | Success | #42  |                        |
| 016     | Success | #43  |                        |
| 017     | Failed  | -    | Branch creation failed |

**On partial failure**:

- Report which tasks succeeded and which failed
- Successful tasks are ready for execution
- Failed tasks can be retried by running `task-generation` again for just that task

**On complete success**:

- All tasks have worktrees, branches, and draft PRs
- Proceed to Phase 3 (Reference Documentation)

### Phase 3: Reference Documentation

After all tasks are created:

1. **Create reference `tasks.md`** in feature directory:

   ````markdown
   # Tasks for Feature $FEATURE_ID: $FEATURE_NAME

   Generated from: plan.md

   ## Task List

   | ID  | Title                        | Type    | Priority | PR  |
   | --- | ---------------------------- | ------- | -------- | --- |
   | 015 | [Title](../task-015/task.md) | feature | P1       | #XX |
   | 016 | [Title](../task-016/task.md) | feature | P1       | #YY |

   ## Dependencies

   ```mermaid
   graph TD
       015 --> 016
       015 --> 017
       016 --> 018
   ```
   ````

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
2. Use "/implement 015" to begin autonomous execution

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
- Use `/implement NNN` to begin autonomous execution on a specific task
- Tasks are ready to be worked on in parallel (different machines/sessions)
