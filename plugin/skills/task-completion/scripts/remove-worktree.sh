#!/bin/bash
# Remove git worktree without navigating to main repo
# Uses git -C to run from main repo context
# Usage: remove-worktree.sh <main_repo_path> <worktree_path>

MAIN_REPO="$1"
WORKTREE="$2"

if [ -z "$MAIN_REPO" ] || [ -z "$WORKTREE" ]; then
    echo "Error: Missing required arguments"
    echo "Usage: remove-worktree.sh <main_repo_path> <worktree_path>"
    exit 1
fi

# Verify main repo exists
if [ ! -d "$MAIN_REPO/.git" ]; then
    echo "Error: Main repository not found at: $MAIN_REPO"
    exit 1
fi

# Remove worktree using git -C to run from main repo context
git -C "$MAIN_REPO" worktree remove "$WORKTREE" --force
if [ $? -ne 0 ]; then
    echo "Error: Failed to remove worktree: $WORKTREE"
    exit 1
fi

# Prune stale worktree references
git -C "$MAIN_REPO" worktree prune

echo "Removed worktree: $WORKTREE"
