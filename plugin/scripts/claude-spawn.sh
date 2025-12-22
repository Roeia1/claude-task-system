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
#   0 - Success: New Claude session spawned, current process will be killed
#   1 - Not running inside TMUX (cannot spawn)
#   2 - Invalid arguments (missing or empty path/prompt)
#   3 - Target path does not exist or is not a directory
#
# Description:
#   This script enables seamless handoff to a new Claude session in a different
#   directory using tmux. It schedules the new Claude session using `tmux run-shell -d`
#   (which survives parent process death), then kills the current Claude process.
#
#   The 1-second delay ensures the new session is fully scheduled before the
#   current process terminates.
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

# Build the tmux command
# Use run-shell -d to run the command detached (survives parent death)
# Sleep 1 second to ensure this script completes scheduling before we kill the parent
# Use exec to replace the shell with claude (cleaner process tree)
# Quote the path and prompt properly to handle spaces and special characters

# Escape single quotes for safe embedding in single-quoted shell command
ESCAPED_PATH="${TARGET_PATH//\'/\'\\\'\'}"
ESCAPED_PROMPT="${PROMPT//\'/\'\\\'\'}"

# Build the command that will run in the new session
SPAWN_CMD="sleep 1 && cd '$ESCAPED_PATH' && exec claude --dangerously-skip-permissions '$ESCAPED_PROMPT'"

# Schedule the new Claude session using tmux run-shell
# The -d flag makes it run detached/asynchronously
tmux run-shell -d "$SPAWN_CMD"

# Kill the parent process (Claude) after scheduling the new session
# $PPID is the parent process ID of this script (should be Claude)
kill $PPID

# This line should never be reached since we kill the parent
exit 0
