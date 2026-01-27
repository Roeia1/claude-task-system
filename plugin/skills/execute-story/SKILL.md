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

!`npx @saga-ai/cli --path "${SAGA_PROJECT_DIR}" find "$0" --type story`

## Process

### 1. Check Resolution Result

The `saga find` command ran above. Handle the result:

- **If found=true**: Extract `data.epicSlug` and `data.slug`. Continue to step 2.
- **If found=false with matches array**: Use AskUserQuestion to disambiguate:
  ```
  question: "Which story do you want to implement?"
  header: "Story"
  multiSelect: false
  options: [
    {label: "<slug>", description: "<title> (Epic: <epicSlug>, Status: <status>)"}
    ...for each story in the matches array
  ]
  ```
  After selection, use the selected story's `epicSlug` and `slug`.
- **If found=false with error**: Display the error. Suggest using `/task-list` to see available stories.

### 2. Update Worktree Branch

Before starting implementation, ensure the worktree branch has the latest changes from master.

Run from within the worktree directory (`data.worktreePath`):

```bash
cd "<data.worktreePath>" && git fetch origin master && git merge origin/master -m "Merge origin/master into story branch"
```

This ensures workers start with the latest codebase, avoiding merge conflicts later.

### 3. Run Implementation Orchestrator

Run the CLI command using Bash with `run_in_background: true`.

Use `data.slug` from the resolution result:

```bash
npx @saga-ai/cli@latest implement "<story.slug>" \
    --path "$SAGA_PROJECT_DIR" \
    --max-cycles 10 \
    --max-time 60 \
    --model opus \
    --stream
```

The CLI handles all validation (worktree exists, story.md exists) and returns
structured error messages if anything is missing.

**Important:** Use these Bash tool parameters:
- `run_in_background: true` - runs the script as a background task
- `timeout: 3660000` - 61 minute timeout (slightly longer than --max-time)

The `--stream` flag enables real-time output from the worker, so you can monitor
progress by reading the background task output file.

### 4. Report Status

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
  - Worker output streams in real-time to the task output file
  - Check status: Use TaskOutput tool with task_id
  - Or read the output file directly with Read tool

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
