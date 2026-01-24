---
name: generate-stories
description: Generate stories from an epic
argument-hint: "[epic-slug]"
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(python:*), Read, AskUserQuestion, Skill(generate-story)
---

# Generate Stories Skill

!`python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver_v2.py "$0" --type epic --project-root "$CLAUDE_PROJECT_DIR"`

## Process

### 1. Check Resolution Result

The identifier resolver ran above. Handle the result:

- **If resolved=true**: Continue to step 2 with the resolved epic slug
- **If resolved=false with epics array**: Use AskUserQuestion to disambiguate:
  ```
  question: "Which epic do you want to generate stories for?"
  header: "Epic"
  multiSelect: false
  options: [
    {label: "<slug>", description: "Epic: <slug>"}
    ...for each epic in the epics array
  ]
  ```
  After selection, continue with the selected epic slug.
- **If resolved=false with error**: Display the error. Suggest using `/create-epic` first.

### 2. Read Epic Document

Read the epic file:
```
$CLAUDE_PROJECT_DIR/.claude-tasks/epics/<slug>/epic.md
```

### 3. Generate Story Breakdown (Titles + Descriptions Only)

Analyze the epic and generate a **lightweight breakdown**.

#### Story Breakdown Guidelines

Each story should represent a **logical implementation boundary** - a cohesive piece of work that can be broken down into atomic tasks. Stories are not atomic tasks themselves.

**Good story boundaries** have:
- Clear separation of concerns from other stories
- A cohesive deliverable (component, endpoint, feature)
- Enough scope to contain multiple implementation tasks

**Examples:**
- "Login form component" (UI + validation + state management)
- "Password reset API endpoint" (route + controller + email service)
- "Session token management" (generation + validation + refresh)

**Avoid:**
- Too broad: "Authentication" (should be multiple stories)
- Too small: "Add button" (this is a task, not a story)

For each story, identify:
- `title`: Clear title describing the deliverable
- `description`: 1-2 sentence scope description

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

