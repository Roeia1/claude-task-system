---
name: task-creation
description: "ONLY activate on DIRECT user request to create a new task. User must explicitly mention keywords: 'new task', 'create task', 'add task'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to create a standalone task."
---

# Task Creation Skill

When activated, create a comprehensive task definition from user description through interactive analysis and clarification. Creates worktree, branch, and PR upfront.

## File Locations

- **Task Template**: Read from plugin's `templates/execution/task-template.md`
- **Task Type Workflows**: Read from plugin's `skills/task-start/workflows/{type}-workflow.md`
  - `feature-workflow.md` - New functionality
  - `bugfix-workflow.md` - Error corrections
  - `refactor-workflow.md` - Code improvements
  - `performance-workflow.md` - Optimization
  - `deployment-workflow.md` - Infrastructure
- **Output**: `task-system/tasks/NNN/` (git worktree with task.md)
- **Full Workflow**: Plugin's `commands/new-task.md`

## Prerequisites

- Must be run from main repository (not a worktree)
- Working directory must be clean (no uncommitted changes)

## Process

### Phase 1: Context Understanding

1. **Review codebase** patterns and architecture
2. **Identify relevant** existing tasks and dependencies
3. **Understand project** conventions and standards

### Phase 2: Task Type Classification

1. **Analyze description** to determine task type
2. **Select appropriate workflow** template
3. **Read task type workflow** from plugin's `skills/task-start/workflows/{type}-workflow.md`
4. **Consider type-specific** requirements and constraints

### Phase 3: Task Decomposition

1. **Break down description** into clear, measurable objectives
2. **Generate specific sub-tasks** based on task type
3. **Identify technical** requirements and constraints
4. **Evaluate approaches** appropriate for task type

### Phase 4: Interactive Clarification

1. **Spot ambiguous** requirements
2. **Identify missing** technical details
3. **Flag areas** requiring architectural decisions
4. **Ask questions** to resolve ambiguities:
   - Scope clarification
   - Technical approach preferences
   - Priority tradeoffs
   - Dependency decisions
5. **Discuss alternatives** when multiple valid approaches exist

### Phase 5: Task Definition Generation

1. **Read template** from plugin's `templates/execution/task-template.md`
2. **Generate comprehensive task** with all sections populated:
   - Feature Context (if applicable)
   - Overview and motivation
   - Task Type classification
   - Priority (P1/P2/P3)
   - Dependencies
   - Objectives (measurable checkboxes)
   - Sub-tasks (actionable items)
   - Technical Approach
   - Risks & Concerns with mitigation
   - Resources & Links
   - Acceptance Criteria (testable)
3. **Iterative refinement** based on user feedback

### Phase 6: Task Creation (After Approval)

**Only when task definition is complete and approved**:

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
# Ensure on default branch and up to date
git checkout main || git checkout master
git pull

# Create task branch
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
mkdir -p "task-system/tasks/$TASK_ID/task-system/tasks/$TASK_ID"

# Write task.md to worktree
# Location: task-system/tasks/$TASK_ID/task-system/tasks/$TASK_ID/task.md
```

#### Step 5: Commit Task Definition

```bash
cd "task-system/tasks/$TASK_ID"
git add .
git commit -m "docs(task-$TASK_ID): create task definition

Task: $TITLE
Type: $TYPE
Priority: $PRIORITY"
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

See: task-system/tasks/$TASK_ID/task.md

## Overview

$OVERVIEW

---
Status: Not started (pending execution)" \
  --head "task-$TASK_ID-$TYPE" \
  --draft
```

#### Step 8: Display Success

```
===============================================================
Task $TASK_ID Created Successfully
===============================================================

Title: $TITLE
Type: $TYPE
Priority: $PRIORITY
Branch: task-$TASK_ID-$TYPE
PR: #$PR_NUMBER (draft)
Worktree: task-system/tasks/$TASK_ID/

---------------------------------------------------------------
NEXT STEPS
---------------------------------------------------------------

To start working on this task:
1. Open a new terminal
2. cd task-system/tasks/$TASK_ID
3. Start Claude Code
4. Say "start task $TASK_ID"

Or use "start task $TASK_ID" from main repo to get instructions.

===============================================================
```

## Quality Standards

Generated tasks must have:

- **Correct task type** classification (feature/refactor/bugfix/performance/deployment)
- **Clear, measurable objectives** with specific success criteria
- **Actionable sub-tasks** individually completable
- **Detailed technical approach** with architectural considerations
- **Realistic risk assessment** with mitigation strategies
- **Comprehensive acceptance criteria** for verification
- **Proper dependency** identification and sequencing

## Task Type Guidelines

### Feature Tasks
- Focus on new functionality and user value
- Emphasize acceptance criteria and user scenarios
- Include integration and end-to-end testing

### Refactor Tasks
- Focus on code quality improvements without behavior changes
- Emphasize safety, incremental changes, quality metrics
- Include test coverage analysis and behavior preservation

### Bugfix Tasks
- Focus on reproducing and fixing specific issues
- Emphasize minimal scope, root cause analysis
- Include validation scenarios and regression prevention

### Performance Tasks
- Focus on measurable performance improvements
- Emphasize baseline metrics, optimization targets
- Include load testing and performance monitoring

## Next Steps

After task creation:
- Use `list tasks` to see the new task
- Use `start task NNN` to begin execution
- Task worktree is ready for immediate work

## References

- Complete workflow details: Plugin's `commands/new-task.md`
- Task template: Plugin's `templates/execution/task-template.md`
- Task type workflows: Plugin's `skills/task-start/workflows/`
