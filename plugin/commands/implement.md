---
description: "Start autonomous story implementation"
argument-hint: "<story-slug>"
allowed-tools:
  - Bash
  - Skill
  - Read
  - AskUserQuestion
---

# Implement Story

This command starts autonomous implementation of a story using the V2 Task System.

## Step 1: Resolve Story Identifier

Run the identifier resolver to find the story:

!`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver_v2.py "$ARGUMENTS" --type story --project-root "$CLAUDE_PROJECT_DIR"`

Parse the JSON output from the resolver.

## Step 2: Handle Resolution Result

### If `resolved: true`

The story was uniquely identified. Extract the story metadata:
- `story.slug` - The story slug
- `story.epic_slug` - The parent epic slug
- `story.title` - The story title
- `story.status` - The story status

**Invoke the execute-story skill** using the Skill tool:
```
Skill(skill: "execute-story", args: "<epic_slug> <story_slug>")
```

### If `resolved: false` with `stories` array

Multiple stories matched. Use AskUserQuestion to let the user select:

```
Which story would you like to implement?

| Slug | Title | Epic | Status |
|------|-------|------|--------|
| ...  | ...   | ...  | ...    |
```

After selection, invoke the execute-story skill with the selected story.

### If `resolved: false` with `error`

Display the error message to the user:
```
Story not found: <error message>

To see available stories, run: /task-list
```

## Notes

- The `$ARGUMENTS` placeholder contains the story-slug argument from the user
- The `$CLAUDE_PROJECT_DIR` placeholder is the project root directory
- The execute-story skill handles validation, orchestration, and worker spawning
