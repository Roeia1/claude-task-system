---
name: generate-story
description: Create a single story with git infrastructure
context: fork
user-invocable: false
allowed-tools: Bash(python:*), Bash(git:*), Bash(gh:*), Read, Write
---

# Generate Story Skill

Creates a single story file and its git infrastructure.

## Expected Context

This skill is invoked by the `story-builder` agent with isolated context:

| Parameter          | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `epic_slug`        | The epic this story belongs to                           |
| `epic_overview`    | Distilled epic context (goals, scope, constraints)       |
| `story_slug`       | The slug for this story                                  |
| `story_outline`    | Title, description, acceptance criteria                  |
| `sibling_stories`  | Map of other story slugs to one-line descriptions        |

## Process

### 1. Read Story Template

Read the template from: `${CLAUDE_PLUGIN_ROOT}/skills/generate-stories/templates/story-template.md`

### 2. Generate Full Story Content

Using the `epic_overview` and `story_outline`, generate complete story.md content:

```yaml
---
id: <story_slug>
title: <from story_outline>
status: ready
epic: <epic_slug>
tasks:
  - id: t1
    title: <task title>
    status: pending
  # ... more tasks
---

## Context
<Self-contained description from epic_overview + story_outline>
<Should be understandable WITHOUT reading the epic>

## Scope Boundaries

**In scope:**
- <what this story covers>

**Out of scope (handled by other stories):**
- <sibling_slug>: <why it's not here>

## Interface

### Inputs
- <dependencies from other stories or systems>

### Outputs
- <what this story produces>

## Acceptance Criteria
- [ ] <from story_outline>

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

### 3. Use Sibling Stories for Boundaries

The `sibling_stories` parameter tells you what OTHER stories handle. Use this to:
- Add "Out of scope" notes where boundaries might be unclear
- Reference siblings as dependencies in the Interface section
- Ensure you don't duplicate work that belongs to siblings

### 4. Create Story Directory

Create the story directory:
```
$CLAUDE_PROJECT_DIR/.claude-tasks/epics/<epic_slug>/stories/<story_slug>/
```

### 5. Write Story File

Write the generated content to:
```
$CLAUDE_PROJECT_DIR/.claude-tasks/epics/<epic_slug>/stories/<story_slug>/story.md
```

### 6. Create Git Infrastructure

Run the create_worktree.py script:

```bash
python ${CLAUDE_PLUGIN_ROOT}/skills/generate-stories/scripts/create_worktree.py "<epic_slug>" "<story_slug>"
```

### 7. Return Result

Return JSON with the result:
```json
{
  "story_slug": "<story_slug>",
  "branch": "story-<epic_slug>-<story_slug>",
  "worktree_path": ".claude-tasks/worktrees/<epic_slug>/<story_slug>/",
  "pr_url": "<pr_url or null>"
}
```
