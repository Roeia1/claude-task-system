#!/usr/bin/env bash
#
# claude-spawn.sh - Spawn a new Claude session in a different directory
#
# Usage: claude-spawn.sh <path> <prompt>
#
# Arguments:
#   path   - Target directory to spawn Claude in (must exist and be a directory)
#   prompt - Initial prompt to pass to Claude (e.g., "start task 010")
#
# Exit Codes:
#   0 - Success: New pane created, user should exit current session
#   1 - Not running inside TMUX (cannot spawn)
#   2 - Invalid arguments (missing or empty path/prompt)
#   3 - Target path does not exist or is not a directory
#
# Description:
#   This script creates a new tmux pane with Claude running in the target directory.
#   The user should then exit the current Claude session (Ctrl+C or /exit).
#   The new pane will already have Claude running with the specified prompt.
#
# Example:
#   claude-spawn.sh /path/to/task-system/tasks/010 "start task 010"
#

set -euo pipefail

# Arguments
TARGET_PATH="${1:-}"
PROMPT="${2:-}"

# Validate arguments - exit code 2 for missing/empty args
if [[ -z "$TARGET_PATH" ]]; then
    echo "Error: Missing target path argument" >&2
    echo "Usage: claude-spawn.sh <path> <prompt>" >&2
    exit 2
fi

if [[ -z "$PROMPT" ]]; then
    echo "Error: Missing prompt argument" >&2
    echo "Usage: claude-spawn.sh <path> <prompt>" >&2
    exit 2
fi

# Validate target path - exit code 3 for invalid path
if [[ ! -e "$TARGET_PATH" ]]; then
    echo "Error: Target path does not exist: $TARGET_PATH" >&2
    exit 3
fi

if [[ ! -d "$TARGET_PATH" ]]; then
    echo "Error: Target path is not a directory: $TARGET_PATH" >&2
    exit 3
fi

# Check TMUX environment - exit code 1 if not in TMUX
if [[ -z "${TMUX:-}" ]]; then
    echo "Error: Not running inside TMUX" >&2
    echo "Cannot spawn new Claude session without TMUX" >&2
    echo "" >&2
    echo "Manual navigation required:" >&2
    echo "  1. cd $TARGET_PATH" >&2
    echo "  2. Start a new Claude session" >&2
    echo "  3. Say: $PROMPT" >&2
    exit 1
fi

# Get the current pane ID so we can close it after creating the new one
CURRENT_PANE="$TMUX_PANE"

# Create a new pane in the target directory and run Claude
# -c sets the working directory for the new pane
# The new pane runs Claude with the prompt
# We use -d to create it without switching focus initially
tmux split-window -h -c "$TARGET_PATH" "claude --dangerously-skip-permissions '$PROMPT'"

# Now switch to the new pane (it's the one we just created)
# The new pane is to the right, so we select it
tmux select-pane -R

# Kill the original pane (the one running this script's parent Claude)
tmux kill-pane -t "$CURRENT_PANE"

exit 0
