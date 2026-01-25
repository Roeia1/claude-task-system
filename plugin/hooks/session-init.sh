#!/bin/bash
# SessionStart hook - detects context and persists environment variables
#
# This hook runs at session start for both interactive and headless modes.
# It detects the working context (main repo or story worktree)
# and makes environment variables available via CLAUDE_ENV_FILE.
#
# All SAGA environment variables use the SAGA_ prefix for namespacing.

# =============================================================================
# Story Detection (.saga/worktrees/EPIC/STORY/)
# =============================================================================

SAGA_EPIC_SLUG=""
SAGA_STORY_SLUG=""
SAGA_STORY_DIR=""

# Check if we're in a story worktree by looking for the marker
# The worktree path is: .saga/worktrees/<epic>/<story>/
# We detect by checking if .saga/epics exists and extracting from git worktree info
if [ -d ".saga/epics" ]; then
    # Get the worktree path from git
    WORKTREE_PATH=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$WORKTREE_PATH" ]; then
        # Check if path contains /worktrees/ pattern
        if [[ "$WORKTREE_PATH" == *"/.saga/worktrees/"* ]]; then
            # Extract epic and story from path: .../worktrees/EPIC/STORY
            SAGA_STORY_SLUG=$(basename "$WORKTREE_PATH")
            SAGA_EPIC_SLUG=$(basename "$(dirname "$WORKTREE_PATH")")
            SAGA_STORY_DIR=".saga/epics/${SAGA_EPIC_SLUG}/stories/${SAGA_STORY_SLUG}"
        fi
    fi
fi

# =============================================================================
# Determine Context
# =============================================================================

if [ -n "$SAGA_STORY_SLUG" ]; then
    SAGA_TASK_CONTEXT="story-worktree"
else
    SAGA_TASK_CONTEXT="main"
fi

# =============================================================================
# Persist to CLAUDE_ENV_FILE
# =============================================================================

if [ -n "$CLAUDE_ENV_FILE" ]; then
    # Core variables (always set)
    echo "export SAGA_PROJECT_DIR=\"$CLAUDE_PROJECT_DIR\"" >> "$CLAUDE_ENV_FILE"
    echo "export SAGA_PLUGIN_ROOT=\"$CLAUDE_PLUGIN_ROOT\"" >> "$CLAUDE_ENV_FILE"
    echo "export SAGA_TASK_CONTEXT=\"$SAGA_TASK_CONTEXT\"" >> "$CLAUDE_ENV_FILE"

    # Story variables (conditional)
    [ -n "$SAGA_EPIC_SLUG" ] && echo "export SAGA_EPIC_SLUG=\"$SAGA_EPIC_SLUG\"" >> "$CLAUDE_ENV_FILE"
    [ -n "$SAGA_STORY_SLUG" ] && echo "export SAGA_STORY_SLUG=\"$SAGA_STORY_SLUG\"" >> "$CLAUDE_ENV_FILE"
    [ -n "$SAGA_STORY_DIR" ] && echo "export SAGA_STORY_DIR=\"$SAGA_STORY_DIR\"" >> "$CLAUDE_ENV_FILE"
fi

# =============================================================================
# Output Context for Claude (uses env var names for consistency)
# =============================================================================

echo "# Session Context"
echo ""
echo "SAGA_PROJECT_DIR: $CLAUDE_PROJECT_DIR"
echo "SAGA_PLUGIN_ROOT: $CLAUDE_PLUGIN_ROOT"
echo "SAGA_TASK_CONTEXT: $SAGA_TASK_CONTEXT"

if [ "$SAGA_TASK_CONTEXT" = "story-worktree" ]; then
    echo "SAGA_EPIC_SLUG: $SAGA_EPIC_SLUG"
    echo "SAGA_STORY_SLUG: $SAGA_STORY_SLUG"
    echo "SAGA_STORY_DIR: $SAGA_STORY_DIR"
fi

echo ""
echo "These variables are available via the Bash tool: echo \$VARIABLE_NAME"

exit 0
