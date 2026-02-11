---
name: execute-story
description: Start autonomous story implementation
argument-hint: "<story-id>"
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash, Read, Task, AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# Execute Story Skill

!`node $SAGA_PLUGIN_ROOT/scripts/find.js "$0" --type story`

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Resolve story | The `saga find` command ran above and output a JSON result. Handle the result based on its structure: (1) **If found=true**: Extract `data.storyId` as `storyId` and `data.worktreePath` and proceed. (2) **If found=false with matches array**: Use AskUserQuestion to disambiguate with question "Which story do you want to implement?", header "Story", multiSelect false, and options array where each item has label "<storyId>" and description "<title> (Status: <status>)" for each story in the matches array. After selection, use the selected story's `storyId` and `worktreePath`. (3) **If found=false with error**: Display the error message and suggest using `/task-list` to see available stories, then stop. | Resolving story | - | Update worktree branch |
| Update worktree branch | Before starting implementation, ensure the worktree branch has the latest changes from master. Run using Bash: `cd "<worktreePath>" && git fetch origin master && git merge origin/master -m "Merge origin/master into story branch" && cd "$SAGA_PROJECT_DIR"` where `<worktreePath>` is `data.worktreePath` from the resolved story. This ensures workers start with the latest codebase, avoiding merge conflicts later. The final `cd` returns to the project root before running the worker. | Updating worktree | Resolve story | Run worker |
| Run worker | Create a tmux session and run the worker inside it. Generate a session name: `saga-story-<storyId>-<timestamp>` where `<timestamp>` is the current Unix epoch seconds (use `date +%s`). Create an output directory at `/tmp/saga-sessions/` if it doesn't exist. Create the tmux session and run the worker: `mkdir -p /tmp/saga-sessions && tmux new-session -d -s "<sessionName>" "node $SAGA_PLUGIN_ROOT/scripts/worker.js <storyId> 2>&1 | tee /tmp/saga-sessions/<sessionName>.out"` Save `sessionName` and the output file path for the status report. | Running worker | Update worktree branch | Report status |
| Report status | Output the execution status to the user using the format shown in the Status Output Format section below. Use the `storyId`, `sessionName`, and output file path from previous tasks. | Reporting status | Run worker | - |

## Status Output Format

```
===============================================================
Starting Autonomous Story Implementation
===============================================================

Story: <storyId>
Worktree: .saga/worktrees/<storyId>/
Session: <sessionName>
Output: /tmp/saga-sessions/<sessionName>.out

The implementation is now running in a detached tmux session.
The worker orchestrates headless Claude runs using native Tasks tools.

Monitor progress:
  - tail -f /tmp/saga-sessions/<sessionName>.out
  - tmux attach -t <sessionName>

The worker will exit with one of these statuses:
  Exit 0   - All tasks completed successfully, PR marked ready
  Exit 1   - Error occurred
  Exit 2   - Max cycles or timeout reached

===============================================================
```

## Notes

- The worker script handles the full pipeline: worktree setup, draft PR creation, task hydration, headless run loop, and PR readiness marking
- The worker manages its own execution loop (max cycles, timeout, model selection) via defaults
- Headless runs use native Claude Code Tasks tools (`TaskList`, `TaskGet`, `TaskUpdate`) for task tracking
- Workers operate within the worktree context with scope enforcement via `SAGA_STORY_ID`
