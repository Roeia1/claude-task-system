# Worktree Flow

Execute this flow when `detect-context.sh` returns "worktree". This flow validates the session, prepares task context, and hands off to the workflow.

---

## Step 1: Invoke Worktree Prep Subagent

Invoke `plugin/agents/worktree-prep.md` with:
- **user_task_id**: Task ID if user specified one (e.g., from "start task 042")

**Handle subagent response:**
- If `status: "error"` → Display error and stop
- If `status: "pending_confirmation"` → Ask user: "This worktree is for task XXX: [title]. Continue? (yes/no)"
  - If no → Instruct user to navigate to correct worktree and stop
- If `status: "ready"` → Continue to Step 2

---

## Step 2: Load Journaling Guidelines

Read `journaling-guidelines.md` (in this skill folder) for reference during workflow execution.

---

## Step 3: Handoff to Workflow

Display task context and hand off to type-specific workflow:

```
===============================================================
Task XXX Ready for Execution
===============================================================

Branch: feature/task-XXX-description
PR: #YY (draft)
Type: {type}

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
