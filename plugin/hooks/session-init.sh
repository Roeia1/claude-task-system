#!/bin/bash
# SessionStart hook - detects context and persists environment variables
#
# This hook runs at session start for both interactive and headless modes.
# It detects the working context (main repo or story worktree)
# and makes environment variables available via CLAUDE_ENV_FILE.

# =============================================================================
# Story Detection (.claude-tasks/worktrees/EPIC/STORY/)
# =============================================================================

EPIC_SLUG=""
STORY_SLUG=""
STORY_DIR=""

# Check if we're in a story worktree by looking for the marker
# The worktree path is: .claude-tasks/worktrees/<epic>/<story>/
# We detect by checking if .claude-tasks/epics exists and extracting from git worktree info
if [ -d ".claude-tasks/epics" ]; then
    # Get the worktree path from git
    WORKTREE_PATH=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$WORKTREE_PATH" ]; then
        # Check if path contains /worktrees/ pattern
        if [[ "$WORKTREE_PATH" == *"/.claude-tasks/worktrees/"* ]]; then
            # Extract epic and story from path: .../worktrees/EPIC/STORY
            STORY_SLUG=$(basename "$WORKTREE_PATH")
            EPIC_SLUG=$(basename "$(dirname "$WORKTREE_PATH")")
            STORY_DIR=".claude-tasks/epics/${EPIC_SLUG}/stories/${STORY_SLUG}"
        fi
    fi
fi

# =============================================================================
# Determine Context
# =============================================================================

if [ -n "$STORY_SLUG" ]; then
    TASK_CONTEXT="story-worktree"
else
    TASK_CONTEXT="main"
fi

# =============================================================================
# Persist to CLAUDE_ENV_FILE
# =============================================================================

if [ -n "$CLAUDE_ENV_FILE" ]; then
    # Core variables (always set)
    echo "export CLAUDE_PROJECT_DIR=\"$CLAUDE_PROJECT_DIR\"" >> "$CLAUDE_ENV_FILE"
    echo "export CLAUDE_PLUGIN_ROOT=\"$CLAUDE_PLUGIN_ROOT\"" >> "$CLAUDE_ENV_FILE"
    echo "export TASK_CONTEXT=\"$TASK_CONTEXT\"" >> "$CLAUDE_ENV_FILE"

    # Story variables (conditional)
    [ -n "$EPIC_SLUG" ] && echo "export EPIC_SLUG=\"$EPIC_SLUG\"" >> "$CLAUDE_ENV_FILE"
    [ -n "$STORY_SLUG" ] && echo "export STORY_SLUG=\"$STORY_SLUG\"" >> "$CLAUDE_ENV_FILE"
    [ -n "$STORY_DIR" ] && echo "export STORY_DIR=\"$STORY_DIR\"" >> "$CLAUDE_ENV_FILE"
fi

# =============================================================================
# Output Context for Claude (uses env var names for consistency)
# =============================================================================

echo "# Session Context"
echo ""
echo "CLAUDE_PROJECT_DIR: $CLAUDE_PROJECT_DIR"
echo "CLAUDE_PLUGIN_ROOT: $CLAUDE_PLUGIN_ROOT"
echo "TASK_CONTEXT: $TASK_CONTEXT"

if [ "$TASK_CONTEXT" = "story-worktree" ]; then
    echo "EPIC_SLUG: $EPIC_SLUG"
    echo "STORY_SLUG: $STORY_SLUG"
    echo "STORY_DIR: $STORY_DIR"
fi

echo ""
echo "These variables are available via the Bash tool: echo \$VARIABLE_NAME"

exit 0
