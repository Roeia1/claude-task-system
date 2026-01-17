#!/bin/bash
#
# init_structure.sh - Initialize .claude-tasks/ directory structure
#
# Usage: init_structure.sh <project_root>
#
# Creates:
#   .claude-tasks/epics/
#   .claude-tasks/archive/
#   .claude-tasks/worktrees/
#
# Updates .gitignore to ignore worktrees/
#

set -e

# Validate arguments
if [ -z "$1" ]; then
    echo "Usage: init_structure.sh <project_root>" >&2
    exit 1
fi

PROJECT_ROOT="$1"

if [ ! -d "$PROJECT_ROOT" ]; then
    echo "Error: Project root '$PROJECT_ROOT' does not exist" >&2
    exit 1
fi

CLAUDE_TASKS_DIR="$PROJECT_ROOT/.claude-tasks"
GITIGNORE="$PROJECT_ROOT/.gitignore"
WORKTREES_PATTERN=".claude-tasks/worktrees/"

# Create directory structure
mkdir -p "$CLAUDE_TASKS_DIR/epics"
mkdir -p "$CLAUDE_TASKS_DIR/archive"
mkdir -p "$CLAUDE_TASKS_DIR/worktrees"

echo "Created .claude-tasks/ directory structure"

# Update .gitignore
if [ -f "$GITIGNORE" ]; then
    # Check if pattern already exists
    if grep -qF "$WORKTREES_PATTERN" "$GITIGNORE"; then
        echo ".gitignore already contains worktrees pattern"
    else
        echo "" >> "$GITIGNORE"
        echo "# Claude Tasks - Worktrees (git worktree isolation for stories)" >> "$GITIGNORE"
        echo "$WORKTREES_PATTERN" >> "$GITIGNORE"
        echo "Updated .gitignore with worktrees pattern"
    fi
else
    # Create new .gitignore
    echo "# Claude Tasks - Worktrees (git worktree isolation for stories)" > "$GITIGNORE"
    echo "$WORKTREES_PATTERN" >> "$GITIGNORE"
    echo "Created .gitignore with worktrees pattern"
fi

echo "Initialized .claude-tasks/ at $PROJECT_ROOT"
