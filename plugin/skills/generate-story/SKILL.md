---
name: generate-story
description: Create a single story with git infrastructure
context: fork
user-invocable: false
allowed-tools: Bash(python:*), Bash(git:*), Bash(gh:*), Write
---

# Generate Story Skill

Creates a single story file and its git infrastructure.

## Expected Context

This skill expects the following data in the conversation context:
- `epic_slug`: The epic this story belongs to
- `story_slug`: The slug for this story
- `story_content`: The complete story.md content to write

## Process

### 1. Create Story Directory

Create the story directory:
```
$CLAUDE_PROJECT_DIR/.claude-tasks/epics/<epic_slug>/stories/<story_slug>/
```

### 2. Write Story File

Write the story content to:
```
$CLAUDE_PROJECT_DIR/.claude-tasks/epics/<epic_slug>/stories/<story_slug>/story.md
```

### 3. Create Git Infrastructure

Run the create_worktree.py script:

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/generate-stories/scripts/create_worktree.py "<epic_slug>" "<story_slug>"
```

### 4. Return Result

Return JSON with the result:
```json
{
  "story_slug": "<story_slug>",
  "branch": "story-<epic_slug>-<story_slug>",
  "worktree_path": ".claude-tasks/worktrees/<epic_slug>/<story_slug>/",
  "pr_url": "<pr_url or null>"
}
```
