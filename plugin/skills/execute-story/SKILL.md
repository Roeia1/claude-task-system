---
name: execute-story
description: Start autonomous story implementation
argument-hint: "<story-slug>"
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Task, AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# Execute Story Skill

!`node $SAGA_PLUGIN_ROOT/scripts/find.js "$0" --type story --status ready`

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Resolve story | The `saga find` command ran above and output a JSON result. Handle the result based on its structure: (1) **If found=true**: Extract `data.epicSlug`, `data.slug`, and `data.worktreePath` and proceed. (2) **If found=false with matches array**: Use AskUserQuestion to disambiguate with question "Which story do you want to implement?", header "Story", multiSelect false, and options array where each item has label "<slug>" and description "<title> (Epic: <epicSlug>, Status: <status>)" for each story in the matches array. After selection, use the selected story's `epicSlug`, `slug`, and `worktreePath`. (3) **If found=false with error**: Display the error message and suggest using `/task-list` to see available stories, then stop. | Resolving story | - | Update worktree branch |
| Update worktree branch | Before starting implementation, ensure the worktree branch has the latest changes from master. Run using Bash: `cd "<worktreePath>" && git fetch origin master && git merge origin/master -m "Merge origin/master into story branch" && cd "$SAGA_PROJECT_DIR"` where `<worktreePath>` is `data.worktreePath` from the resolved story. This ensures workers start with the latest codebase, avoiding merge conflicts later. The final `cd` returns to the project root before running the orchestrator. | Updating worktree | Resolve story | Run implementation orchestrator |
| Run implementation orchestrator | Run the command using Bash: `node $SAGA_PLUGIN_ROOT/scripts/implement.js "<slug>" --max-cycles 10 --max-time 60 --model opus` where `<slug>` is `data.slug` from the resolved story. The script creates a detached tmux session and returns immediately with JSON output containing: `mode` ("detached"), `sessionName` (tmux session name), `outputFile` (path to .out file for monitoring), `epicSlug`, `storySlug`, `worktreePath`. The script handles all validation (worktree exists, story.md exists) and returns structured error messages if anything is missing. Parse the JSON output and save `sessionName` and `outputFile` for the status report. | Running orchestrator | Update worktree branch | Report status |
| Report status | Output the execution status to the user using the format shown in the Status Output Format section below. Use the `epicSlug`, `storySlug`, `sessionName`, and `outputFile` from previous tasks. | Reporting status | Run implementation orchestrator | - |

## Status Output Format

```
===============================================================
Starting Autonomous Story Implementation
===============================================================

Epic: <epicSlug>
Story: <storySlug>
Worktree: .saga/worktrees/<epicSlug>/<storySlug>/
Session: <sessionName>
Output: <outputFile>

The implementation is now running in a detached tmux session.
Workers will implement tasks following TDD practices.

Monitor progress:
  - tail -f <outputFile>
  - tmux attach -t <sessionName>

The script will exit with one of these statuses:
  FINISH     - All tasks completed successfully
  BLOCKED    - Human input needed (run /resolve-blocker)
  TIMEOUT    - Max time exceeded
  MAX_CYCLES - Max worker spawns reached

===============================================================
```

## Notes

- The orchestrator script handles worker spawning and output parsing
- Workers operate within the worktree context with scope enforcement
- If workers get blocked, use `/resolve-blocker <story-slug>` to provide guidance
- The orchestrator enforces max 10 cycles and 60 minutes by default
