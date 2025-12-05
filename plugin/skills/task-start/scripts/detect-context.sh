#!/bin/bash
# Detect if running from main repo or worktree
# Uses git's --git-dir vs --git-common-dir comparison
#
# Output: "main" or "worktree"

if [ "$(git rev-parse --git-dir)" != "$(git rev-parse --git-common-dir)" ]; then
    echo "worktree"
else
    echo "main"
fi
