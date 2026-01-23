---
name: generate-story
description: Create a single story with full content and git infrastructure
context: fork
user-invocable: false
allowed-tools: Bash(python:*), Bash(git:*), Bash(gh:*), Read, Write
---

# Generate Story Skill

Creates a single story with full content and git infrastructure.

## Context

This skill is invoked with `context: fork`, which means:
- You have the **full epic content** from the parent context
- You receive only this story's title/description + sibling titles
- You do NOT see other stories' detailed content

## Expected Parameters

| Parameter          | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `epic_slug`        | The epic this story belongs to                           |
| `story_title`      | The title for this story                                 |
| `story_description`| 1-2 sentence scope description                           |
| `sibling_titles`   | List of ALL story titles (for boundary awareness)        |

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

Using the **epic context** (available from fork) and the `story_title`/`story_description`, generate complete story.md content.

The story should be **self-contained** - understandable without reading the epic.

```yaml
---
id: <generated-slug>
title: <story_title>
status: ready
epic: <epic_slug>
tasks:
  - id: t1
    title: <task title>
    status: pending
  # ... more tasks
---

## Context
<Self-contained description>
<Draw from epic context but make it standalone>

## Scope Boundaries

**In scope:**
- <what this story covers>

**Out of scope (handled by other stories):**
- <sibling title>: <why it's not here>

## Interface

### Inputs
- <dependencies>

### Outputs
- <what this produces>

## Acceptance Criteria
- [ ] <verifiable condition>

## Tasks

### t1: <task title>
**Guidance:**
- <implementation approach>

**References:**
- <relevant files>

**Avoid:**
- <anti-patterns>

**Done when:**
- <verification>
```

### 4. Use Sibling Titles for Boundaries

The `sibling_titles` parameter tells you what OTHER stories exist. Use this to:
- Add "Out of scope" notes where boundaries might be unclear
- Reference siblings as dependencies in the Interface section
- Ensure you don't duplicate work that belongs to siblings

### 5. Create Story Directory

Create the story directory:
```
$CLAUDE_PROJECT_DIR/.claude-tasks/epics/<epic_slug>/stories/<generated-slug>/
```

### 6. Write Story File

Write the generated content to:
```
$CLAUDE_PROJECT_DIR/.claude-tasks/epics/<epic_slug>/stories/<generated-slug>/story.md
```

### 7. Create Git Infrastructure

Run the create_worktree.py script:

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/generate-stories/scripts/create_worktree.py "<epic_slug>" "<generated-slug>"
```

### 8. Return Result

Return the result:
```json
{
  "story_slug": "<generated-slug>",
  "story_title": "<story_title>",
  "branch": "story-<epic_slug>-<generated-slug>",
  "worktree_path": ".claude-tasks/worktrees/<epic_slug>/<generated-slug>/",
  "pr_url": "<pr_url or null>"
}
```

## Guidelines

### Self-Contained Stories

The story's Context section should be understandable WITHOUT reading the epic. Include:
- What problem this solves
- Key constraints and requirements
- Enough background for a developer to start working

### Task Granularity

Each task should be:
- Completable in 1-4 hours
- Have clear "done when" criteria
- Include specific guidance
- Reference relevant files

### Boundary Clarity

Use the sibling_titles to ensure this story doesn't overlap with others. If something could belong to multiple stories, explicitly note which story owns it.
