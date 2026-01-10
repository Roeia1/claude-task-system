# Implement Command

Starts autonomous task implementation by resolving an identifier to a task worktree and spawning the implementation script.

## Prerequisites

- Must be run from the main repository (not from within a task worktree)
- The task must have a worktree created (via `task-generation` skill)
- The task must have a valid `task.json` file

## Step 0: Verify Context

**Check the `$TASK_CONTEXT` environment variable set by the session-init hook:**

```bash
if [ "$TASK_CONTEXT" = "worktree" ]; then
    echo "ERROR: /implement must be run from the main repository, not from within a task worktree."
    echo "Current task: $CURRENT_TASK_ID"
    echo ""
    echo "Please navigate to the main repository and run /implement again."
    exit 1
fi
```

**If `$TASK_CONTEXT` is "worktree":**
- Display the error message above
- **STOP** - do not continue

**If `$TASK_CONTEXT` is "main" or unset:** Continue to Step 1.

## Step 1: Parse Arguments

**Extract the identifier from the user's command.**

Examples:
- `/implement 016` → identifier = "016" (task ID)
- `/implement user-auth` → identifier = "user-auth" (task name)
- `/implement 007-task-orchestration` → identifier = "007-task-orchestration" (feature)

**If no identifier provided:**
- Ask user: "Which task would you like to implement? Provide a task ID, task name, or feature name."
- Wait for response
- Store as `$IDENTIFIER`

**Store the identifier as `$IDENTIFIER`.**

## Step 2: Resolve Identifier

Use the identifier resolver to find the task worktree.

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "$IDENTIFIER" --project-root "$(pwd)"
```

**Parse the JSON output:**

### Case A: Resolved as Task ID or Task Name

If `resolution_type` is "task_id" or "task_name":
- Store `task_id` as `$TASK_ID`
- Store `worktree_path` as `$WORKTREE_PATH`
- Continue to Step 3

### Case B: Resolved as Feature (Multiple Tasks)

If `resolution_type` is "feature":
- Display the list of tasks in the feature:
  ```
  Feature $FEATURE_ID has the following tasks:

  | ID  | Title |
  |-----|-------|
  | ... | ...   |

  Which task would you like to implement?
  ```
- Wait for user to select a task
- Store selected task ID as `$TASK_ID`
- Resolve the task ID to get `$WORKTREE_PATH`
- Continue to Step 3

### Case C: Multiple Matches

If `multiple_matches` is true:
- Display the matching tasks:
  ```
  Multiple tasks match '$IDENTIFIER':

  | ID  | Title |
  |-----|-------|
  | ... | ...   |

  Which task did you mean?
  ```
- Wait for user to select
- Store selected task ID as `$TASK_ID`
- Resolve to get `$WORKTREE_PATH`
- Continue to Step 3

### Case D: Not Found

If `resolved` is false:
- Display error message from the resolver
- List available tasks:
  ```bash
  python3 ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py --list-tasks --project-root "$(pwd)"
  ```
- **STOP** - do not continue

## Step 3: Validate Worktree

Verify the worktree directory exists:

```bash
if [ ! -d "$WORKTREE_PATH" ]; then
    ERROR="Task $TASK_ID worktree not found at $WORKTREE_PATH. Run 'resume task $TASK_ID' first."
fi
```

**If worktree doesn't exist:**
- Display error and suggest using `resume task $TASK_ID`
- **STOP** - do not continue

## Step 4: Validate task.json

Check that task.json exists and is valid:

```bash
TASK_JSON="$WORKTREE_PATH/task-system/task-$TASK_ID/task.json"
if [ ! -f "$TASK_JSON" ]; then
    ERROR="task.json not found in task $TASK_ID"
fi

# Validate JSON syntax
python3 -c "import json; json.load(open('$TASK_JSON'))" 2>&1
```

**If task.json is missing or invalid:**
- Display clear error message with file path
- **STOP** - do not continue

## Step 5: Spawn Implementation Script

All validation passed. Spawn the implementation script in the background:

```bash
# Build command
IMPLEMENT_SCRIPT="${CLAUDE_PLUGIN_ROOT}/scripts/implement.py"

# Spawn in background with nohup
nohup python3 "$IMPLEMENT_SCRIPT" "$WORKTREE_PATH" \
    --max-cycles 10 \
    --max-time 60 \
    --model opus \
    > /tmp/implement-$TASK_ID.log 2>&1 &

SCRIPT_PID=$!
echo "Implementation script started with PID: $SCRIPT_PID"
```

**Display starting message:**
```
===============================================================
Starting Autonomous Implementation
===============================================================

Task: $TASK_ID
Worktree: $WORKTREE_PATH
Script PID: $SCRIPT_PID

The implementation script is now running in the background.
Workers will implement objectives following TDD practices.

Monitor progress:
  tail -f /tmp/implement-$TASK_ID.log

The script will exit with one of these statuses:
  FINISH     - All objectives completed successfully
  BLOCKED    - Human input needed (run /resolve in worktree)
  TIMEOUT    - Max time exceeded
  MAX_CYCLES - Max worker spawns reached

===============================================================
```

## Step 6: Wait for Completion (Optional)

If the user wants to wait for completion:

```bash
# Wait for script and capture output
wait $SCRIPT_PID
RESULT=$(cat /tmp/implement-$TASK_ID.log | tail -50)
```

**Parse final status from output and report to user.**

---

## Error Handling

| Error | Message |
|-------|---------|
| No identifier | "Please provide a task identifier: /implement <id\|name\|feature>" |
| Not found | "No task found for '$IDENTIFIER'. Available tasks: ..." |
| Worktree missing | "Task $TASK_ID worktree not found. Run 'resume task $TASK_ID' first." |
| task.json missing | "task.json not found in task $TASK_ID" |
| Invalid JSON | "task.json contains invalid JSON: $ERROR_DETAILS" |
| Script spawn failed | "Failed to spawn implementation script: $ERROR" |

---

## Usage Examples

- `/implement 016` - Start implementation for task 016 by ID
- `/implement user-auth` - Start implementation by searching task name
- `/implement 007-task-orchestration` - List tasks in feature 007 for selection

---

## Notes

- The implementation script runs autonomously, spawning worker Claude instances
- Workers read task.json and implement objectives following TDD
- If blocked, workers write a blocker entry to journal.md
- Use `/resolve` from within the task worktree to address blockers
- The script enforces limits: max 10 cycles, max 60 minutes by default
