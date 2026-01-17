#!/bin/bash
# create_worktree.sh - Create git worktree and draft PR for a story
#
# Usage: create_worktree.sh <epic-slug> <story-slug>
#
# Environment:
#   CLAUDE_PROJECT_DIR - Required: Path to the project root
#
# Creates:
#   - Git branch: story-<epic-slug>-<story-slug>
#   - Worktree: .claude-tasks/worktrees/<epic-slug>/<story-slug>/
#   - Draft PR with title: "Story: <epic-slug>/<story-slug>"
#
# Output (JSON):
#   {"success": true, "worktree_path": "...", "branch": "...", "pr_url": "..."}
#   {"success": false, "error": "..."}

set -e

# Arguments
EPIC_SLUG="$1"
STORY_SLUG="$2"

# Validation
if [[ -z "$EPIC_SLUG" ]]; then
    echo '{"success": false, "error": "Missing required argument: epic-slug"}'
    exit 1
fi

if [[ -z "$STORY_SLUG" ]]; then
    echo '{"success": false, "error": "Missing required argument: story-slug"}'
    exit 1
fi

if [[ -z "$CLAUDE_PROJECT_DIR" ]]; then
    echo '{"success": false, "error": "CLAUDE_PROJECT_DIR environment variable is not set"}'
    exit 1
fi

# Paths
PROJECT_DIR="$CLAUDE_PROJECT_DIR"
BRANCH_NAME="story-${EPIC_SLUG}-${STORY_SLUG}"
WORKTREE_DIR="${PROJECT_DIR}/.claude-tasks/worktrees/${EPIC_SLUG}/${STORY_SLUG}"
STORY_FILE="${PROJECT_DIR}/.claude-tasks/epics/${EPIC_SLUG}/stories/${STORY_SLUG}/story.md"

# Change to project directory
cd "$PROJECT_DIR"

# Check if story.md exists
if [[ ! -f "$STORY_FILE" ]]; then
    echo "{\"success\": false, \"error\": \"Story file not found: ${STORY_FILE}\"}"
    exit 1
fi

# Check if branch already exists
if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
    echo "{\"success\": false, \"error\": \"Branch already exists: ${BRANCH_NAME}\"}"
    exit 1
fi

# Check if worktree directory already exists
if [[ -d "$WORKTREE_DIR" ]]; then
    echo "{\"success\": false, \"error\": \"Worktree directory already exists: ${WORKTREE_DIR}\"}"
    exit 1
fi

# Get the main branch name (master or main)
MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")

# Ensure we have the latest main branch
git fetch origin "$MAIN_BRANCH" >/dev/null 2>&1 || true

# Create the branch from the latest main
git branch "$BRANCH_NAME" "origin/$MAIN_BRANCH" >/dev/null 2>&1

# Create parent directory for worktree
mkdir -p "$(dirname "$WORKTREE_DIR")"

# Create the worktree
git worktree add "$WORKTREE_DIR" "$BRANCH_NAME" >/dev/null 2>&1

# Push the branch to origin
cd "$WORKTREE_DIR"
git push -u origin "$BRANCH_NAME" >/dev/null 2>&1

# Extract story title from story.md (look for title: in front matter)
STORY_TITLE=$(grep -m1 '^title:' "$STORY_FILE" 2>/dev/null | sed 's/^title:[[:space:]]*//' || echo "$STORY_SLUG")

# Create draft PR
PR_TITLE="Story: ${EPIC_SLUG}/${STORY_SLUG}"
PR_BODY="## Story: ${STORY_TITLE}

**Epic**: ${EPIC_SLUG}
**Story**: ${STORY_SLUG}

---

This is a draft PR for tracking story progress.

To implement this story, run:
\`\`\`
/implement ${STORY_SLUG}
\`\`\`
"

# Create the draft PR and capture the URL
PR_URL=$(gh pr create --draft --title "$PR_TITLE" --body "$PR_BODY" --head "$BRANCH_NAME" 2>/dev/null || echo "")

if [[ -z "$PR_URL" ]]; then
    # PR creation failed, but worktree was created successfully
    echo "{\"success\": true, \"worktree_path\": \"${WORKTREE_DIR}\", \"branch\": \"${BRANCH_NAME}\", \"pr_url\": null, \"warning\": \"Failed to create draft PR\"}"
else
    echo "{\"success\": true, \"worktree_path\": \"${WORKTREE_DIR}\", \"branch\": \"${BRANCH_NAME}\", \"pr_url\": \"${PR_URL}\"}"
fi
