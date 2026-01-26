---
name: execute-story
description: Start autonomous story implementation
argument-hint: "<story-slug>"
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Task
  - AskUserQuestion
---

# Implement Story Skill

!`python3 ${SAGA_PLUGIN_ROOT}/scripts/identifier_resolver_v2.py "$0" --type story --project-root "${SAGA_PROJECT_DIR}"`

## Process

### 1. Check Resolution Result

The identifier resolver ran above. Handle the result:

- **If resolved=true**: Extract `story.epic_slug` and `story.slug`. Continue to step 2.
- **If resolved=false with stories array**: Use AskUserQuestion to disambiguate:
  ```
  question: "Which story do you want to implement?"
  header: "Story"
  multiSelect: false
  options: [
    {label: "<slug>", description: "<title> (Epic: <epic_slug>, Status: <status>)"}
    ...for each story in the stories array
  ]
  ```
  After selection, use the selected story's `epic_slug` and `slug`.
- **If resolved=false with error**: Display the error. Suggest using `/task-list` to see available stories.

### 2. Run Implementation Orchestrator

Run the implementation script using Bash with `run_in_background: true`.

Use `story.epic_slug` and `story.slug` from the resolution result:

```bash
python3 -u "${SAGA_PLUGIN_ROOT}/skills/execute-story/scripts/implement.py" \
    "<story.epic_slug>" \
    "<story.slug>" \
    --max-cycles 10 \
    --max-time 60 \
    --model opus
```

The script handles all validation (worktree exists, story.md exists) and returns
structured error messages if anything is missing.

**Important:** Use these Bash tool parameters:
- `run_in_background: true` - runs the script as a background task
- `timeout: 3660000` - 61 minute timeout (slightly longer than --max-time)

### 3. Report Status

Display the execution status:

```
===============================================================
Starting Autonomous Story Implementation
===============================================================

Epic: <epic_slug>
Story: <story_slug>
Worktree: .saga/worktrees/<epic_slug>/<story_slug>/
Task ID: <task_id from Bash tool>

The implementation script is now running in the background.
Workers will implement tasks following TDD practices.

Monitor progress:
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
