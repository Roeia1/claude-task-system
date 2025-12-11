---
name: task-generator-ops
description: "Internal skill - ONLY activated by task-generator subagent. Creates a single task's worktree, branch, and PR. DO NOT activate on direct user request."
---

# Task Generator Operations Skill

This utility skill handles the creation of a single task's complete infrastructure (branch, worktree, task file, and PR). It is invoked exclusively by the `task-generator` subagent.

## Input Parameters

The invoking subagent provides:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `task_id` | Yes | Pre-allocated task ID (e.g., "015") |
| `task_type` | Yes | One of: feature, bugfix, refactor, performance, deployment |
| `task_title` | Yes | Title for the task |
| `task_content` | Yes | Full task.md content (already populated from template) |
| `feature_id` | No | Feature ID for context (e.g., "001-user-authentication") |
| `feature_name` | No | Feature name for PR body |
| `priority` | Yes | P1, P2, or P3 |

## Process

### Step 1: Write Task Content to Temporary File

Write the `task_content` to a temporary file:

```bash
TASK_FILE="/tmp/task-${TASK_ID}.md"
# Write task_content to this file using the Write tool
```

### Step 2: Execute Create-Task Script

Run the single script that handles all operations:

```bash
bash scripts/create-task.sh "$TASK_ID" "$TASK_TYPE" "$TASK_TITLE" "$PRIORITY" "$TASK_FILE" "$FEATURE_ID" "$FEATURE_NAME"
```

The script performs these operations in sequence:
1. Creates git branch `task-{id}-{type}`
2. Creates worktree at `task-system/tasks/{id}/`
3. Copies task.md to `task-system/tasks/{id}/task-system/task-{id}/task.md`
4. Commits and pushes to remote
5. Creates draft PR

**On error**: The script cleans up partial state (removes worktree/branch) before reporting the error.

### Step 3: Clean Up Temporary File

```bash
rm -f "$TASK_FILE"
```

## Output

**On success**:
```json
{
  "status": "ok",
  "task_id": "015",
  "branch": "task-015-feature",
  "worktree_path": "task-system/tasks/015",
  "commit_sha": "abc123...",
  "pr_number": 42,
  "pr_url": "https://github.com/..."
}
```

**On failure**:
```json
{
  "status": "error",
  "task_id": "015",
  "message": "Worktree already exists at task-system/tasks/015",
  "stage": "create_worktree"
}
```

## Script Reference

| Script | Purpose |
|--------|---------|
| `scripts/create-task.sh` | Creates complete task infrastructure (branch, worktree, file, commit, push, PR) |

The script:
- Outputs JSON for structured parsing
- Exits with code 1 on error, 0 on success
- Cleans up partial state on failure (removes branch/worktree created before error)
- Requires: git, gh CLI (authenticated)

## Error Handling

The script handles cleanup automatically on failure:
- If branch creation fails → No cleanup needed
- If worktree creation fails → Removes the branch
- If commit/push fails → Removes worktree and branch
- If PR creation fails → Branch/worktree remain (can create PR manually)
