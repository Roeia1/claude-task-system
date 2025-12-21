#!/usr/bin/env bash
#
# spawn-cleanup.sh - Spawn a TMUX pane for task cleanup
#
# Spawns a new TMUX pane at the main repository root with a Claude Code
# session configured to run the cleanup command for the specified task.
#
# Usage: spawn-cleanup.sh <task_id> <main_repo_path>
#
# Arguments:
#   task_id        - The task ID number (e.g., "015", "007")
#   main_repo_path - Absolute path to the main repository root
#
# Exit Codes:
#   0 - Success: TMUX pane spawned successfully
#   1 - Invalid arguments: Missing or empty task_id or main_repo_path
#   2 - Path not found: main_repo_path does not exist or is not a directory
#   3 - TMUX failed: tmux split-window command failed
#

set -euo pipefail

# Get arguments
task_id="${1:-}"
main_repo_path="${2:-}"

# Validate arguments - exit 1 if missing or empty
if [[ -z "$task_id" ]] || [[ -z "$main_repo_path" ]]; then
    echo "Error: Missing required arguments" >&2
    echo "Usage: spawn-cleanup.sh <task_id> <main_repo_path>" >&2
    exit 1
fi

# Validate path exists and is a directory - exit 2 if not
if [[ ! -d "$main_repo_path" ]]; then
    echo "Error: Path does not exist or is not a directory: $main_repo_path" >&2
    exit 2
fi

# Spawn TMUX pane with Claude cleanup session - exit 3 if fails
if ! tmux split-window -h -c "$main_repo_path" "claude --dangerously-skip-permissions 'cleanup task $task_id'"; then
    echo "Error: Failed to spawn TMUX pane" >&2
    echo "Make sure you are running inside a TMUX session" >&2
    exit 3
fi
