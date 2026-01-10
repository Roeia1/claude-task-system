# Step 3: Finalize

Commit the task.json, push to remote, and create a draft PR.

## Input Context

You need these values:
- `task_id`, `task_type`, `task_title`, `priority`
- `feature_id` (optional - for PR body context)

## Commands to Execute

### 1. Stage Changes

```bash
git -C task-system/tasks/{task_id} add .
```

### 2. Commit

```bash
git -C task-system/tasks/{task_id} commit -m "docs(task-{task_id}): create task definition

Task: {task_title}
Type: {task_type}
Priority: {priority}
Feature: {feature_id}"
```

Note: Omit the "Feature:" line if `feature_id` is not provided.

### 3. Push to Remote

```bash
git -C task-system/tasks/{task_id} push -u origin task-{task_id}-{task_type}
```

### 4. Create Draft PR

```bash
gh pr create \
  --title "Task {task_id}: {task_title}" \
  --body "## Task Definition

See: task-system/task-{task_id}/task.json

## Feature Context

Feature: {feature_id}

---
Status: Not started (pending execution)" \
  --head task-{task_id}-{task_type} \
  --draft
```

Note: Adjust PR body if `feature_id` is not provided (omit Feature Context section).

## Variable Substitution

Replace these placeholders:
- `{task_id}` - The task ID (e.g., "015")
- `{task_type}` - The task type
- `{task_title}` - The task title
- `{priority}` - P1/P2/P3
- `{feature_id}` - Feature ID (optional)

## Success Output

After successful PR creation, extract and report:
- PR number (from gh output)
- PR URL (from gh output)

Format your success message:
```
Task {task_id} created successfully.

Branch: task-{task_id}-{task_type}
Worktree: task-system/tasks/{task_id}
PR: #{pr_number} - {pr_url}
```

## Error Handling

If any step fails:

1. **Stage/Commit fails:**
   - Report error with stage: `finalize`
   - Keep worktree (content is there, can be manually committed)

2. **Push fails:**
   - Report error with stage: `finalize`
   - Keep worktree and local commit (can be manually pushed)

3. **PR creation fails:**
   - Report error with stage: `finalize`
   - Keep everything (branch exists on remote, PR can be manually created)

**Important:** In the finalize stage, do NOT clean up worktree/branch on failure. The work is mostly done and can be manually recovered.

## Completion

Task is fully created. Return the success message to the task-builder agent.
