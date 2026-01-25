---
name: generate-story
description: Create a single story with full content and git infrastructure
context: fork
user-invocable: false
allowed-tools: Bash(python:*), Bash(git:*), Bash(gh:*), Read, Write
---

# Generate Story Skill

Creates a single story with full content and git infrastructure.

## Expected Parameters

| Parameter          | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `story_title`      | The title for this story                                 |

## Process

### 1. Generate Story Slug

Create a URL-friendly slug from the `story_title`:
- Lowercase
- Replace spaces with hyphens
- Remove special characters
- Keep it concise (3-5 words max)

Example: "Login Form Component" → `login-form-component`

### 2. Read Story Template

Read the template from: `${CLAUDE_PLUGIN_ROOT}/skills/generate-stories/templates/story-template.md`

### 3. Generate Full Story Content

Generate complete story.md content following the template structure.

The story should be **self-contained** - understandable without reading the epic.

### 4. Create Story Directory

Create the story directory:
```
${CLAUDE_PROJECT_DIR}/.saga/epics/<epic_slug>/stories/<generated-slug>/
```

### 5. Write Story File

Write the generated content to:
```
${CLAUDE_PROJECT_DIR}/.saga/epics/<epic_slug>/stories/<generated-slug>/story.md
```

### 6. Create Git Infrastructure

Run the create_worktree.py script:

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/generate-stories/scripts/create_worktree.py "<epic_slug>" "<generated-slug>"
```

### 7. Return Result

Return the result:
```json
{
  "story_slug": "<generated-slug>",
  "story_title": "<story_title>",
  "branch": "story-<epic_slug>-<generated-slug>",
  "worktree_path": ".saga/worktrees/<epic_slug>/<generated-slug>/",
  "pr_url": "<pr_url or null>"
}
```
