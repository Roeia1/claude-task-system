---
name: task-resume
description: "ONLY activate on DIRECT user request to resume a remote task. User must explicitly mention keywords: 'resume task', 'checkout task', 'get task'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to resume a task that exists remotely but not locally."
---

# Task Resume Skill

Creates a local worktree from an existing remote task branch, allowing work to continue on a task started elsewhere.

## When to Use

Use this skill when:
- A task exists as a remote PR but has no local worktree
- The user wants to continue work on a task started on another machine
- The `task-list` skill shows a task as "REMOTE (no local worktree)"

---

## Process

### Step 1: Get Task ID

**If user specified a task ID** (e.g., "resume task 017"):
- Extract the task ID from their prompt
- Store as `$TASK_ID`

**If no task ID specified**:
- Ask user: "Which task ID do you want to resume?"
- Wait for response
- Store as `$TASK_ID`

### Step 2: Verify No Local Worktree Exists

```bash
# Check if worktree already exists
if [ -d "task-system/tasks/$TASK_ID" ]; then
    ERROR="Task $TASK_ID already has a local worktree at task-system/tasks/$TASK_ID"
fi

# Also check git worktree list
git worktree list | grep -E "task-system/tasks/$TASK_ID\s"
```

**If worktree exists**: Display error and suggest using `start task $TASK_ID` instead.

### Step 3: Find Remote Branch

```bash
# Look for task branch on remote
git fetch --all --prune
BRANCH=$(git branch -r | grep -E "origin/task-0*$TASK_ID-" | head -1 | tr -d ' ')
```

**If no branch found**: Error "No remote branch found for task $TASK_ID"

### Step 4: Create Local Worktree

```bash
# Extract branch name without origin/ prefix
LOCAL_BRANCH="${BRANCH#origin/}"

# Create worktree tracking the remote branch
mkdir -p task-system/tasks
git worktree add "task-system/tasks/$TASK_ID" "$LOCAL_BRANCH"
```

### Step 5: Verify Task Files

Check that expected files exist in the worktree:

```bash
# Verify task.md exists
if [ ! -f "task-system/tasks/$TASK_ID/task-system/tasks/$TASK_ID/task.md" ]; then
    # Try alternate location (worktree root)
    if [ ! -f "task-system/tasks/$TASK_ID/task.md" ]; then
        WARN="task.md not found in expected location"
    fi
fi
```

### Step 6: Display Success

```
===============================================================
Task $TASK_ID Resumed Successfully
===============================================================

Branch: $LOCAL_BRANCH
Worktree: task-system/tasks/$TASK_ID/

---------------------------------------------------------------
NEXT STEP: Open a new Claude session in the worktree
---------------------------------------------------------------

1. Open a new terminal
2. cd task-system/tasks/$TASK_ID
3. Start Claude Code (e.g., `claude`)
4. Say "start task $TASK_ID" to continue the workflow

This session will now STOP.
===============================================================
```

---

## Error Handling

| Error | Message |
|-------|---------|
| Worktree exists | "Task $TASK_ID already has a local worktree. Use 'start task $TASK_ID' instead" |
| No remote branch | "No remote branch found for task $TASK_ID. Use 'list tasks' to see available tasks" |
| Fetch failed | "Failed to fetch from remote. Check your network connection" |
| Worktree creation failed | "Failed to create worktree. Check git status and try again" |

---

## Usage Examples

- "resume task 017"
- "checkout task 17"
- "get task 017"
- "resume task" (interactive - will prompt for ID)

---

## Notes

- **Main repo only**: This skill should be run from the main repository, not from within another worktree
- **Remote branch required**: The task must exist as a branch on the remote (typically with an open PR)
- **After resume**: Open a new Claude session in the worktree to continue work
- **Status preservation**: If `journal.md` exists in the remote branch, the task will show as IN_PROGRESS after resume
