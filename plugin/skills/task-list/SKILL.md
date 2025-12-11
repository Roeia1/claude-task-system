---
name: task-list
description: "ONLY activate on DIRECT user request to list tasks. User must explicitly mention keywords: 'list tasks', 'show tasks', 'task list', 'what tasks'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to see tasks."
---

# Task List Skill

Dynamically generates a task list by scanning local worktrees and remote PRs. No persistent TASK-LIST.md file is required.

## Status Derivation

Task status is derived from filesystem and git state:

| Status | Signal |
|--------|--------|
| PENDING | Worktree exists in `task-system/tasks/NNN/`, no `journal.md` |
| IN_PROGRESS | Worktree exists, `journal.md` present |
| REMOTE | Open PR with task branch, no local worktree |
| COMPLETED | PR merged (query with `gh pr list --state merged`) |

---

## Process

### Step 1: Scan Local Worktrees

1. **List git worktrees**:
   ```bash
   git worktree list --porcelain
   ```

2. **Filter for task worktrees** (pattern: `task-system/tasks/NNN`):
   - Extract task ID from path
   - Check if `journal.md` exists in worktree to determine status

3. **For each local task**:
   - Read `task.md` to get: title, type, priority
   - Determine status: PENDING (no journal.md) or IN_PROGRESS (has journal.md)

### Step 2: Scan Remote PRs

1. **List open PRs with task branches**:
   ```bash
   gh pr list --state open --json number,title,headRefName,url
   ```

2. **Filter for task branches** (pattern: `task-NNN-*`):
   - Extract task ID from branch name
   - Exclude tasks that have local worktrees (already shown above)

3. **Mark as REMOTE** (no local worktree)

### Step 3: Generate Output

Display formatted task list:

```
# Tasks

## LOCAL - IN_PROGRESS
ID  | Pri | Type     | Title                  | Description
----|-----|----------|------------------------|------------------
015 | P1  | feature  | User authentication    | Implement login flow
018 | P2  | bugfix   | Fix session timeout    | Handle expired tokens

## LOCAL - PENDING
ID  | Pri | Type     | Title                  | Description
----|-----|----------|------------------------|------------------
016 | P1  | feature  | User registration      | Create signup form

## REMOTE (no local worktree)
ID  | Pri | Type     | Title                  | Action
----|-----|----------|------------------------|------------------
017 | P2  | refactor | Extract auth utils     | Use "resume task 017"
019 | P3  | docs     | API documentation      | Use "resume task 019"

## COMPLETED (archived)
Browse archived tasks: ls task-system/archive/
(Run `gh pr list --state merged --limit 10` to see recently merged PRs)
```

---

## Helper Script

For convenience, a helper script can be created at `plugin/skills/task-list/scripts/list-tasks.sh`:

```bash
#!/bin/bash
# List all tasks with their status

echo "# Tasks"
echo ""

# Get local worktrees
LOCAL_TASKS=()
while IFS= read -r line; do
    if [[ "$line" =~ task-system/tasks/([0-9]+) ]]; then
        TASK_ID="${BASH_REMATCH[1]}"
        LOCAL_TASKS+=("$TASK_ID")
    fi
done < <(git worktree list)

# Check each local task
IN_PROGRESS=()
PENDING=()

for TASK_ID in "${LOCAL_TASKS[@]}"; do
    TASK_DIR="task-system/tasks/$TASK_ID"
    if [ -f "$TASK_DIR/journal.md" ]; then
        IN_PROGRESS+=("$TASK_ID")
    else
        PENDING+=("$TASK_ID")
    fi
done

# Output local tasks
if [ ${#IN_PROGRESS[@]} -gt 0 ]; then
    echo "## LOCAL - IN_PROGRESS (${#IN_PROGRESS[@]})"
    for ID in "${IN_PROGRESS[@]}"; do
        echo "$ID"
    done
    echo ""
fi

if [ ${#PENDING[@]} -gt 0 ]; then
    echo "## LOCAL - PENDING (${#PENDING[@]})"
    for ID in "${PENDING[@]}"; do
        echo "$ID"
    done
    echo ""
fi

# Get remote PRs
echo "## REMOTE (no local worktree)"
gh pr list --state open --json headRefName,title,number | jq -r '.[] | select(.headRefName | test("^task-[0-9]+-")) | "\(.headRefName)\t\(.title)\t#\(.number)"' 2>/dev/null || echo "(No remote tasks or gh CLI not available)"
```

---

## Usage Examples

- "list tasks" - Show all tasks
- "show tasks" - Show all tasks
- "what tasks are there" - Show all tasks
- "task list" - Show all tasks

---

## Notes

- **No TASK-LIST.md required**: Status is derived dynamically
- **Local vs Remote**: Local tasks are in worktrees on this machine; remote tasks exist only as PRs
- **Resume remote tasks**: Use `resume task NNN` to create local worktree from remote branch
- **Completed tasks**: Archived to `task-system/archive/NNN/` after worktree cleanup
- **Archive contents**: Each archived task contains `task.md` and `journal.md`
