---
description: "Resolve a blocker for a blocked story"
argument-hint: "[story-slug]"
allowed-tools:
  - Bash
  - Skill
  - Read
  - AskUserQuestion
---

# Resolve Story Blocker

This command analyzes and resolves blockers for stories that returned BLOCKED status during implementation.

## Step 1: Determine Story Context

### If argument provided

Run the identifier resolver with the provided story slug:

!`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver_v2.py "$ARGUMENTS" --type story --project-root "$CLAUDE_PROJECT_DIR"`

### If no argument provided

Check if we're in a story worktree context by looking for story structure:

!`ls -d "$CLAUDE_PROJECT_DIR/.claude-tasks/epics/"*"/stories/"* 2>/dev/null | head -1 || echo "NO_STORY_CONTEXT"`

If in a worktree, extract epic and story from the path structure. Otherwise, prompt the user:

```
No story specified and not in a story worktree context.

Usage: /resolve <story-slug>

To see blocked stories, run: /task-list
```

## Step 2: Handle Resolution Result

### If `resolved: true`

The story was uniquely identified. Extract:
- `story.slug` - The story slug
- `story.epic_slug` - The parent epic slug
- `story.title` - The story title

**Invoke the resolve-blocker skill** using the Skill tool:
```
Skill(skill: "resolve-blocker", args: "<epic_slug> <story_slug>")
```

### If `resolved: false` with `stories` array

Multiple stories matched. Use AskUserQuestion to let the user select:

```
Multiple stories match your query. Which story's blocker do you want to resolve?

| Slug | Title | Epic | Status |
|------|-------|------|--------|
| ...  | ...   | ...  | ...    |
```

After selection, invoke the resolve-blocker skill.

### If `resolved: false` with `error`

Display the error:
```
Story not found: <error message>

To see available stories and their status, run: /task-list
```

## Notes

- The resolve-blocker skill will read journal.md to find the blocker
- Human approval is required before documenting a resolution
- After resolution, use `/implement <story>` to resume execution
