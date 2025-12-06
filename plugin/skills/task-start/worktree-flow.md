# Worktree Flow

Execute this flow when `detect-context.sh` returns `context: "worktree"`. Context validation is already complete - this flow handles task validation and workflow handoff.

**Input from SKILL.md**: `$TASK_ID`, `$BRANCH`, `$WORKTREE_PATH` from detect-context.sh JSON

---

## Step 1: Validate Task State

1. **Read** `task-system/tasks/TASK-LIST.md`

2. **Verify task exists**:
   - Search for task `$TASK_ID` in the file
   - Not found → Error: "Task $TASK_ID not found in TASK-LIST"

3. **Check status**:
   - If in COMPLETED section → Error: "Task $TASK_ID already completed"
   - If in PENDING or IN_PROGRESS → Continue

4. **Check dependencies** (read `task-system/tasks/$TASK_ID/task.md`):
   - Parse "Dependencies:" section
   - For each dependency, verify it is in COMPLETED section of TASK-LIST.md
   - Any not completed → Error: "Blocked by: XXX (PENDING), YYY (IN_PROGRESS)"

5. **Get task metadata** from TASK-LIST.md:
   - Task title
   - Task type (feature/bugfix/refactor/performance/deployment)
   - Priority (P1/P2/P3)

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
