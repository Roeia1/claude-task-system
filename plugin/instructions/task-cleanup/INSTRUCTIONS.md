# Task Cleanup Skill

When activated, handles cleanup for a completed task. This skill is **location-aware**:

- **From worktree**: Detects TMUX, prompts user, spawns cleanup pane at main repo
- **From main repo**: Removes worktree directly (existing behavior)

## Prerequisites

- Task PR must be merged (or about to be merged via task-completer)

## Environment Variables

The session-init hook sets these variables at session start:

| Variable | Description | Example |
|----------|-------------|---------|
| `$TASK_CONTEXT` | "worktree" or "main" | `worktree` |
| `$CURRENT_TASK_ID` | Task number (worktree only) | `007` |

These are used for location detection and task ID extraction with fallback detection if not set.

## Process

### Step 1: Location Detection

Use the `$TASK_CONTEXT` environment variable set by the session-init hook:

```bash
if [ "$TASK_CONTEXT" = "worktree" ]; then
    # In worktree, go to Step 2a
else
    # In main repo (or $TASK_CONTEXT unset), go to Step 2b
fi
```

**Fallback** (if `$TASK_CONTEXT` not set):
```bash
if [ -f ".git" ]; then
    # .git is a FILE -> In worktree
else
    # .git is a DIRECTORY -> In main repo
fi
```

---

### Step 2a: Worktree Context

When running from inside a worktree, spawn a cleanup session at the main repo.

#### 2a.1: Get Task ID

Use the `$CURRENT_TASK_ID` environment variable set by the session-init hook:

```bash
TASK_ID="$CURRENT_TASK_ID"
```

**Fallback** (if `$CURRENT_TASK_ID` not set):
```bash
TASK_ID=$(ls task-system/ | grep "^task-" | sed 's/task-//')
```

**If task ID not found**: Error with message:
```
ERROR: No task-system/task-NNN folder found in this worktree.
Cannot determine task ID for cleanup.
```

#### 2a.2: Get Main Repo Path

1. **Extract main repo path from git**:
   ```bash
   MAIN_REPO=$(git rev-parse --git-common-dir | xargs dirname)
   ```
2. **Validate path exists**:
   ```bash
   if [ ! -d "$MAIN_REPO" ]; then
       # Error: Could not resolve main repo path
   fi
   ```

#### 2a.3: Check TMUX Environment

1. **Check if running inside TMUX**:
   ```bash
   if [ -z "$TMUX" ]; then
       # Not in TMUX -> Show manual instructions immediately
   fi
   ```
2. **If NOT in TMUX**: Display manual instructions and exit:
   ```
   ===============================================================
   Manual Cleanup Required
   ===============================================================

   Automatic cleanup requires TMUX (not detected).

   To complete cleanup manually:
   1. Navigate to main repo: cd $MAIN_REPO
   2. Start a new Claude session
   3. Say: "cleanup task $TASK_ID"
   ===============================================================
   ```

#### 2a.4: Prompt User for Spawn Confirmation

1. **Ask user for confirmation** (default yes):
   ```
   Spawn cleanup pane at main repo? [Y/n]
   ```
2. **If user declines** (enters 'n' or 'N'): Display manual instructions and exit:
   ```
   ===============================================================
   Manual Cleanup Required
   ===============================================================

   To complete cleanup manually:
   1. Navigate to main repo: cd $MAIN_REPO
   2. Start a new Claude session
   3. Say: "cleanup task $TASK_ID"
   ===============================================================
   ```

#### 2a.5: Spawn Cleanup Session

1. **Display success message FIRST** (script kills parent process on success):
   ```
   ===============================================================
   Spawning Cleanup at Main Repository
   ===============================================================

   Navigating to: $MAIN_REPO
   This session will terminate and cleanup will run automatically.

   ===============================================================
   ```

2. **Run spawn script**:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/claude-spawn.sh "$MAIN_REPO" "cleanup task $TASK_ID"
   ```

3. **Handle exit codes** (only reached if spawn fails):
   - Exit 0: Success (never reached - parent process killed)
   - Exit 1: Not running inside TMUX
   - Exit 2: Invalid/missing arguments
   - Exit 3: Target path does not exist

4. **On failure** (exit non-zero): Display error and manual fallback:
   ```
   ===============================================================
   Spawn Failed
   ===============================================================

   Could not spawn cleanup session (error code: $EXIT_CODE).

   To complete cleanup manually:
   1. Navigate to main repo: cd $MAIN_REPO
   2. Start a new Claude session
   3. Say: "cleanup task $TASK_ID"
   ===============================================================
   ```

---

### Step 2b: Main Repo Context

When running from the main repository, perform cleanup directly.

#### 2b.1: Extract Task ID

1. **Get task ID from user prompt** (e.g., "cleanup task 015" -> TASK_ID=015)
2. **Normalize task ID** to match folder naming (preserve leading zeros if present)
3. **If no task ID provided**: Ask user to specify the task ID

#### 2b.2: Verify Worktree Exists

1. **Check worktree directory exists**:
   ```bash
   WORKTREE_PATH="task-system/tasks/$TASK_ID"
   if [ ! -d "$WORKTREE_PATH" ]; then
       # No worktree found
   fi
   ```
2. **If no worktree found**:
   - Check if task is archived (completed without cleanup)
   - Display: "No worktree found for task $TASK_ID. It may have already been cleaned up."

#### 2b.3: Verify PR is Merged

1. **Check PR status**:
   ```bash
   # Check for merged PR with task branch
   gh pr list --state merged --head "task-$TASK_ID-" --json number,title,mergedAt
   ```
2. **If PR not merged**:
   ```
   ERROR: Task $TASK_ID PR has not been merged yet.

   Complete the task first:
   1. Navigate to worktree: cd task-system/tasks/$TASK_ID
   2. Complete the workflow and merge the PR
   3. Then return here to cleanup
   ```

#### 2b.4: Remove Worktree

1. **Remove the worktree**:
   ```bash
   git worktree remove "task-system/tasks/$TASK_ID" --force
   ```
2. **Prune stale references**:
   ```bash
   git worktree prune
   ```
3. **Handle removal failure**: If removal fails, display manual instructions:
   ```
   Automatic removal failed. Try manual cleanup:

   git worktree remove task-system/tasks/$TASK_ID --force

   If that fails:
   rm -rf task-system/tasks/$TASK_ID
   git worktree prune
   ```

#### 2b.5: Display Success

```
===============================================================
Task $TASK_ID Cleanup Complete
===============================================================

- Worktree removed: task-system/tasks/$TASK_ID
- Task files preserved in archive: task-system/archive/$TASK_ID/

Task $TASK_ID is now fully completed.
===============================================================
```

---

## Error Handling

| Error | Context | Message |
|-------|---------|---------|
| No task ID in prompt | Main repo | "Please specify the task ID. Example: cleanup task 015" |
| No task folder found | Worktree | "No task-system/task-NNN folder found. Cannot determine task ID." |
| Main repo path invalid | Worktree | "Could not resolve main repo path. Use manual cleanup." |
| Not in TMUX | Worktree | Manual instructions displayed (no spawn available) |
| User declines spawn | Worktree | Manual instructions displayed |
| Spawn script fails | Worktree | Error code + manual fallback instructions |
| No worktree found | Main repo | "No worktree found for task $TASK_ID. May already be cleaned up." |
| PR not merged | Main repo | "Task $TASK_ID PR has not been merged. Complete the merge first." |
| Removal failed | Main repo | Manual cleanup instructions |

## Notes

- This skill is **location-aware** - it detects whether it's running from a worktree or main repo
- **Worktree context**: Uses TMUX spawn to cleanly hand off cleanup to a new session at main repo
- **Main repo context**: Performs cleanup directly (original behavior preserved)
- The spawn script (`${CLAUDE_PLUGIN_ROOT}/scripts/claude-spawn.sh`) handles session transition - it creates a new pane and kills the original
- Safe to run multiple times (idempotent - reports already cleaned if no worktree)
- Does not touch archived files - only removes the worktree
- Gracefully degrades to manual instructions if TMUX unavailable or spawn fails
