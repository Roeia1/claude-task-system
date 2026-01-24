---
name: generate-stories
description: Generate stories from a resolved epic
user-invocable: false
allowed-tools: Bash(python:*), Read, AskUserQuestion, Skill(generate-story)
---

# Generate Stories Skill

The resolved epic is in the conversation context (passed from the command).

## Process

### 1. Extract Epic Information

Look for the epic slug in the conversation context. The `/generate-stories` command resolves the epic and passes the result.

If no epic slug is found, report an error:
```
Error: No epic information in context. This skill should be invoked by the /generate-stories command.
```

### 2. Read Epic Document

Read the epic file:
```
$CLAUDE_PROJECT_DIR/.claude-tasks/epics/<slug>/epic.md
```

### 3. Generate Story Breakdown (Titles + Descriptions Only)

Analyze the epic and generate a **lightweight breakdown**:

For each story, identify:
- `title`: Clear title describing the deliverable
- `description`: 1-2 sentence scope description

Focus on identifying logical story boundaries and ensuring stories don't overlap.

### 4. Present Story Breakdown for Approval

Display the proposed stories to the user:

```
## Proposed Stories for Epic: <slug>

### Story 1
**Title**: <title>
**Description**: <description>

### Story 2
**Title**: <title>
**Description**: <description>

...

---

Would you like to:
1. Approve and create all stories
2. Modify the breakdown
3. Cancel
```

Use AskUserQuestion to get approval.

### 5. Fork Each Story

For each approved story, use the **Skill tool** to invoke `generate-story`.

Pass to each generate-story invocation:
- `story_title`: This story's title

### 6. Collect Results

Collect results from each generate-story invocation.

### 7. Report Completion

```
Stories created for epic: <slug>

| Story | Slug | Branch | PR |
|-------|------|--------|-----|
| <title> | <slug> | story-<epic>-<slug> | <pr-url> |
| ... | ... | ... | ... |

Worktrees created in: .claude-tasks/worktrees/<epic-slug>/

Next steps:
- Review story.md files and refine as needed
- Run /implement <story-slug> to start implementation
```

## Story Breakdown Guidelines

### Good Story Boundaries

**Good** (clear boundaries):
- "Login form component"
- "Password reset API endpoint"
- "Session token management"

**Bad** (too vague or too large):
- "Authentication" (too broad)
- "Add button" (too small)
- "Refactor and add tests" (multiple concerns)
