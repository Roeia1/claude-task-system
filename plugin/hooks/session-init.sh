#!/bin/bash
# SessionStart hook - detects context and persists environment variables
#
# This hook runs at session start for interactive Claude Code sessions.
# It detects the working context (main repo or story worktree)
# and makes environment variables available via CLAUDE_ENV_FILE.
#
# All SAGA environment variables use the SAGA_ prefix for namespacing.
#
# For the flat worktree layout (.saga/worktrees/<storyId>/), this hook
# detects the story ID and sets SAGA_STORY_ID.

# =============================================================================
# Context Detection (worktree vs main repo)
# =============================================================================

SAGA_TASK_CONTEXT="main"
SAGA_STORY_ID=""

# Detect worktree vs main repo by checking if .git is a file or directory
# - Worktree: .git is a file pointing to the main repo
# - Main repo: .git is a directory
if [ -f .git ]; then
    # We're in a worktree - .git is a file
    WORKTREE_PATH=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$WORKTREE_PATH" ] && [[ "$WORKTREE_PATH" == *"/.saga/worktrees/"* ]]; then
        SAGA_TASK_CONTEXT="story-worktree"

        # Extract story ID from flat layout: .saga/worktrees/<storyId>/
        SAGA_STORY_ID="${WORKTREE_PATH##*/.saga/worktrees/}"
    fi
fi

# =============================================================================
# Persist to CLAUDE_ENV_FILE
# =============================================================================

if [ -n "$CLAUDE_ENV_FILE" ]; then
    # Core variables (always set)
    echo "export SAGA_PROJECT_DIR=\"$CLAUDE_PROJECT_DIR\"" >> "$CLAUDE_ENV_FILE"
    echo "export SAGA_PLUGIN_ROOT=\"$CLAUDE_PLUGIN_ROOT\"" >> "$CLAUDE_ENV_FILE"
    echo "export SAGA_TASK_CONTEXT=\"$SAGA_TASK_CONTEXT\"" >> "$CLAUDE_ENV_FILE"
    echo "export SAGA_SESSION_DIR=\"/tmp/saga-sessions\"" >> "$CLAUDE_ENV_FILE"

    # Story-specific variables (only set in new flat worktree layout)
    if [ -n "$SAGA_STORY_ID" ]; then
        echo "export SAGA_STORY_ID=\"$SAGA_STORY_ID\"" >> "$CLAUDE_ENV_FILE"
    fi
fi

# =============================================================================
# Output Context for Claude (uses env var names for consistency)
# =============================================================================

echo "# Session Context"
echo ""
echo "SAGA_PROJECT_DIR: $CLAUDE_PROJECT_DIR"
echo "SAGA_PLUGIN_ROOT: $CLAUDE_PLUGIN_ROOT"
echo "SAGA_TASK_CONTEXT: $SAGA_TASK_CONTEXT"
if [ -n "$SAGA_STORY_ID" ]; then
    echo "SAGA_STORY_ID: $SAGA_STORY_ID"
fi
echo ""
echo "These variables are available via the Bash tool: echo \$VARIABLE_NAME"

exit 0
