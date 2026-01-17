---
name: execute-story
description: Orchestrate autonomous story implementation
user-invocable: false
allowed-tools:
  - Bash
  - Read
  - Task
---

# Execute Story Skill

This skill orchestrates the autonomous implementation of a story by spawning worker Claude instances.

## Arguments

The skill receives two arguments from the `/implement` command:
- `$EPIC_SLUG` - The parent epic's slug (e.g., "auth-system")
- `$STORY_SLUG` - The story's slug (e.g., "user-login")

Parse these from `$ARGUMENTS`:
```
EPIC_SLUG=$(echo "$ARGUMENTS" | cut -d' ' -f1)
STORY_SLUG=$(echo "$ARGUMENTS" | cut -d' ' -f2)
```

## Step 1: Compute Paths

The worktree path follows the V2 structure:
```
WORKTREE_PATH="$CLAUDE_PROJECT_DIR/.claude-tasks/worktrees/$EPIC_SLUG/$STORY_SLUG"
```

Story files are located at:
- `$WORKTREE_PATH/.claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/story.md` - Story definition
- `$WORKTREE_PATH/.claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/journal.md` - Execution journal

## Step 2: Validate Worktree Exists

Check that the worktree directory exists:

!`test -d "$CLAUDE_PROJECT_DIR/.claude-tasks/worktrees/$(echo "$ARGUMENTS" | cut -d' ' -f1)/$(echo "$ARGUMENTS" | cut -d' ' -f2)" && echo "WORKTREE_EXISTS" || echo "WORKTREE_MISSING"`

**If WORKTREE_MISSING:**
```
Worktree not found at .claude-tasks/worktrees/<epic>/<story>/

The story worktree has not been created yet. This can happen if:
1. The story was generated but the worktree wasn't set up
2. The worktree was deleted or moved

To create the worktree, use: /task-resume <story-slug>
```
**STOP** - do not continue

## Step 3: Validate story.md Exists

Check that story.md exists in the worktree:

!`WORKTREE="$CLAUDE_PROJECT_DIR/.claude-tasks/worktrees/$(echo "$ARGUMENTS" | cut -d' ' -f1)/$(echo "$ARGUMENTS" | cut -d' ' -f2)"; EPIC=$(echo "$ARGUMENTS" | cut -d' ' -f1); STORY=$(echo "$ARGUMENTS" | cut -d' ' -f2); test -f "$WORKTREE/.claude-tasks/epics/$EPIC/stories/$STORY/story.md" && echo "STORY_EXISTS" || echo "STORY_MISSING"`

**If STORY_MISSING:**
```
story.md not found in worktree.

Expected location: .claude-tasks/epics/<epic>/stories/<story>/story.md

The worktree exists but the story definition file is missing.
This may indicate an incomplete story setup.
```
**STOP** - do not continue

## Step 4: Run Implementation Orchestrator

All validation passed. Run the implementation script using Bash with `run_in_background: true`:

```bash
python3 -u "${CLAUDE_PLUGIN_ROOT}/skills/execute-story/scripts/implement.py" \
    "$(echo "$ARGUMENTS" | cut -d' ' -f1)" \
    "$(echo "$ARGUMENTS" | cut -d' ' -f2)" \
    --max-cycles 10 \
    --max-time 60 \
    --model opus
```

**Important:** Use these Bash tool parameters:
- `run_in_background: true` - runs the script as a background task
- `timeout: 3660000` - 61 minute timeout (slightly longer than --max-time)

## Step 5: Report Status

Display the execution status:

```
===============================================================
Starting Autonomous Story Implementation
===============================================================

Epic: $EPIC_SLUG
Story: $STORY_SLUG
Worktree: .claude-tasks/worktrees/$EPIC_SLUG/$STORY_SLUG/
Task ID: <task_id from Bash tool>

The implementation script is now running in the background.
Workers will implement tasks following TDD practices.

Monitor progress:
  - Check journal: Read .claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/journal.md
  - Check status: Use TaskOutput tool with task_id

The script will exit with one of these statuses:
  FINISH     - All tasks completed successfully
  BLOCKED    - Human input needed (run /resolve)
  TIMEOUT    - Max time exceeded
  MAX_CYCLES - Max worker spawns reached

===============================================================
```

## Notes

- The orchestrator script handles worker spawning and output parsing
- Workers operate within the worktree context with scope enforcement
- If workers get blocked, use `/resolve <story-slug>` to provide guidance
- The orchestrator enforces max 10 cycles and 60 minutes by default
