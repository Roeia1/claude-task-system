---
name: generate-stories
description: Generate stories from a resolved epic
user-invocable: false
allowed-tools: Bash(python:*), Read, Write, AskUserQuestion, Task
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

### 3. Create Epic Overview

Distill the epic into a concise overview containing:
- Goals and objectives
- Key constraints and requirements
- Technical context (if any)

This overview will be passed to each story-builder agent.

### 4. Generate Story OUTLINES Only

Analyze the epic and generate **outlines only** (not full content):

For each story, create an outline with:
- `slug`: Meaningful, unique identifier
- `title`: Clear title describing the deliverable
- `description`: One-line scope description
- `acceptance_criteria`: Summary of what "done" looks like
- `depends_on`: List of sibling story slugs (if any)

**Do NOT generate full story content here.** That happens in Phase 2.

### 5. Present Story Breakdown for Approval

Display the proposed stories to the user:

```
## Proposed Stories for Epic: <slug>

### Story 1: <story-slug>
**Title**: <title>
**Description**: <one-line description>
**Acceptance**: <summary>
**Depends on**: <dependencies or "none">

### Story 2: <story-slug>
...

---

Would you like to:
1. Approve and create all stories
2. Modify the breakdown
3. Cancel
```

Use AskUserQuestion to get approval.

### 6. Spawn Story Builder Agents

For each approved story, use the **Task tool** to spawn a `story-builder` agent.

**Critical**: Use the Task tool (not Skill tool) to ensure isolated context.

For each story, spawn with this prompt:

```
Create story for epic "<epic_slug>".

## Parameters

epic_slug: <epic_slug>
story_slug: <story_slug>

epic_overview: |
  <distilled epic overview from step 3>

story_outline: |
  title: <title>
  description: <description>
  acceptance_criteria:
    - <criterion 1>
    - <criterion 2>
  depends_on: [<dependencies>]

sibling_stories:
  <other-slug-1>: <one-line description>
  <other-slug-2>: <one-line description>

Invoke the generate-story skill with these parameters.
```

**Spawn agents in parallel** for independent stories. For stories with dependencies, you may spawn sequentially or note the dependency.

### 7. Collect Results

Wait for all story-builder agents to complete. Collect their results.

### 8. Report Completion

```
Stories created for epic: <slug>

| Story | Branch | PR |
|-------|--------|-----|
| <story-slug> | story-<epic>-<story> | <pr-url> |
| ... | ... | ... |

Worktrees created in: .claude-tasks/worktrees/<epic-slug>/

Next steps:
- Review story.md files and refine as needed
- Run /implement <story-slug> to start implementation
```

## Story Outline Guidelines

### Good Story Boundaries

**Good** (clear boundaries):
- "Create login form component"
- "Add password reset API endpoint"
- "Implement session management"

**Bad** (too vague or too large):
- "Authentication" (too broad)
- "Add button" (too small, unless that's genuinely the scope)
- "Refactor and add tests" (multiple unrelated concerns)

### Outline Granularity

Each story outline should:
- Be completable in a reasonable scope
- Have clear acceptance criteria
- Not overlap with sibling stories

### Why Two Phases?

Phase 1 (outlines) happens in this skill's context - you have full visibility to ensure stories don't overlap.

Phase 2 (full content) happens in isolated agent contexts - each agent only sees its own story outline plus sibling titles. This:
- Prevents context bloat
- Ensures clear boundaries
- Allows parallel generation
