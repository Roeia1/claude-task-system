---
description: Creates a single story with full content and git infrastructure from an epic. Use when generating individual stories during story breakdown.
capabilities:
  - "Generate URL-friendly story slugs from titles"
  - "Create self-contained story.md files with tasks and acceptance criteria"
  - "Set up git worktrees and branches for story isolation"
  - "Create draft pull requests via GitHub CLI"
---

# Generate Story Agent

You are generating a single story for an epic. Create a complete, self-contained story.md file with git infrastructure.

## Expected Input

You will receive:
- **epic_slug**: The epic identifier
- **story_title**: Title for this story
- **story_description**: Brief description of what this story covers
- **other_stories**: Titles and descriptions of other stories being generated (to avoid overlap)

## Process

### 1. Create Task List

Use `TaskCreate` to create all tasks below, then use `TaskUpdate` to set up the dependencies (via `addBlockedBy`), then execute them.

| Subject | Description | Active Form | Blocked By |
|---------|-------------|-------------|------------|
| Generate story slug | Create URL-friendly slug from story title: lowercase, replace spaces with hyphens, remove special characters, keep concise (3-5 words max). Example: "Login Form Component" → `login-form-component` | Generating story slug | - |
| Create git infrastructure | Run `npx @saga-ai/cli worktree "<epic_slug>" "<generated-slug>" --path "${SAGA_PROJECT_DIR}"`. Capture JSON output to get `worktree_path` and `branch` values. Creates branch `story-<generated-slug>-epic-<epic_slug>` and worktree `.saga/worktrees/<epic_slug>/<generated-slug>/` | Creating git infrastructure | Generate story slug |
| Install dependencies | Run package manager install in worktree. Determine package manager from project's package.json (e.g., `packageManager` field, scripts, or lock files): `cd <worktree_path> && <package-manager> install` | Installing dependencies | Create git infrastructure |
| Read epic context | Read `${SAGA_PROJECT_DIR}/.saga/epics/<epic_slug>/epic.md` to understand full context | Reading epic context | - |
| Read story template | Read template from `${SAGA_PLUGIN_ROOT}/skills/generate-stories/templates/story-template.md` | Reading story template | - |
| Generate story content | Generate complete story.md following template. Story must be self-contained (understandable without reading epic). Use `other_stories` to avoid overlap, respect epic's "Out of scope" sections. Include: clear context, specific scope boundaries, well-defined interfaces, verifiable acceptance criteria, detailed tasks with guidance/references/pitfalls/done-when criteria | Generating story content | Read epic context, Read story template |
| Write story file | Create directory `mkdir -p <worktree_path>/.saga/epics/<epic_slug>/stories/<generated-slug>/` and write story.md to `<worktree_path>/.saga/epics/<epic_slug>/stories/<generated-slug>/story.md` | Writing story file | Generate story content, Install dependencies |
| Commit and create PR | In worktree: `git add` the story.md, `git commit -m "docs(<generated-slug>): add story definition"` with epic/story in body, `git push -u origin <branch>`. Then `gh pr create --draft --title "Story: <epic_slug>/<generated-slug>"` with body containing story title, epic, story slug, and `/implement` instructions. Capture PR URL | Committing and creating PR | Write story file |

### 2. Return Result

After all tasks are completed, output the result in this exact JSON format:

```json
{
  "story_slug": "<generated-slug>",
  "story_title": "<story_title>",
  "branch": "story-<generated-slug>-epic-<epic_slug>",
  "worktree_path": ".saga/worktrees/<epic_slug>/<generated-slug>/",
  "pr_url": "<pr_url or null>"
}
```
