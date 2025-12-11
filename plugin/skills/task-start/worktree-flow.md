# Worktree Flow

Validates task state and hands off to the type-specific workflow.

**Input**: `$TASK_ID`, `$BRANCH`, `$WORKTREE_PATH` from detect-context.sh JSON

---

## Step 1: Validate Task State

1. **Read task definition** from `task-system/task-$TASK_ID/task.md`:
   - Extract task type (feature/bugfix/refactor/performance/deployment)
   - Extract priority (P1/P2/P3)
   - Extract title and description
   - Extract dependencies (if any)

2. **Determine task status**:
   - If `task-system/task-$TASK_ID/journal.md` exists: Task is IN_PROGRESS (resuming work)
   - If no `journal.md`: Task is PENDING (starting fresh)

3. **Check dependencies** (from task.md "Dependencies:" section):
   - For each dependency, check if archived or PR is merged:
     ```bash
     # Check archive first (fast local check), then PR status
     if [ -d "task-system/archive/$DEP_ID" ]; then
         # Dependency satisfied - archived
     else
         gh pr list --state merged --head "task-$DEP_ID-*" --json number
     fi
     ```
   - Archived or merged → Dependency satisfied
   - Neither → Warning: "Dependency task $DEP_ID not yet completed"
   - Note: Dependencies are advisory (documented but not enforced)

4. **Get task metadata** from task.md:
   - Task title
   - Task type
   - Priority

---

## Step 2: Load Journaling Guidelines

Read `journaling-guidelines.md` (in this skill folder) for reference during workflow execution.

---

## Step 3: Handoff to Workflow

Display task context and hand off to type-specific workflow:

```
===============================================================
Task $TASK_ID Ready for Execution
===============================================================

Branch: $BRANCH
Type: {type}
Priority: {priority}
Status: {PENDING or IN_PROGRESS}

---------------------------------------------------------------
Ready to begin workflow execution
---------------------------------------------------------------

Read the workflow at: workflows/{type}-workflow.md

You are in an ISOLATED worktree environment:
- All file operations are relative to this directory
- Do NOT use ../ paths or absolute paths to main repo
- This worktree IS your root directory
===============================================================
```

Point to type-specific workflow for Phase 1 execution:
- `workflows/feature-workflow.md`
- `workflows/bugfix-workflow.md`
- `workflows/refactor-workflow.md`
- `workflows/performance-workflow.md`
- `workflows/deployment-workflow.md`

---

## Step 4: Task Completion

After the type-specific workflow completes and user grants completion permission:

1. **Invoke task-completer subagent** with task_id
2. **On error**: Control returns to user with specific issue
3. **On success**: Display completion message and cleanup instructions
