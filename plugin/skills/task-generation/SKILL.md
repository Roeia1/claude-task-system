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
- **Full Workflow**: Plugin's `commands/generate-tasks.md`

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
5. **Show proposed tasks** with:
   - Task ID, title, type, priority
   - Dependencies
   - Files affected
   - Parallelizable markers
6. **Interactive editing** (merge/split/reorder as needed)

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

## Next Steps

After task generation:
- Use `list tasks` to see all generated tasks
- Use `start task NNN` to begin execution on a specific task
- Tasks are ready to be worked on in parallel (different machines/sessions)

## References

- Complete workflow details: Plugin's `commands/generate-tasks.md`
- Task template: Plugin's `templates/execution/task-template.md`
- Task breakdown template: Plugin's `templates/planning/task-breakdown-template.md`
