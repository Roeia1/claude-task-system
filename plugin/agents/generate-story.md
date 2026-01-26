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

### 1. Generate Story Slug

Create a URL-friendly slug from the story title:
- Lowercase
- Replace spaces with hyphens
- Remove special characters
- Keep it concise (3-5 words max)

Example: "Login Form Component" → `login-form-component`

### 2. Create Git Infrastructure

Run the saga worktree command to create the branch and worktree:

```bash
npx @saga-ai/cli worktree "<epic_slug>" "<generated-slug>" --path "${SAGA_PROJECT_DIR}"
```

This creates:
- Branch: `story-<generated-slug>-epic-<epic_slug>`
- Worktree: `.saga/worktrees/<epic_slug>/<generated-slug>/`

Capture the JSON output to get the `worktree_path` and `branch` values.

### 3. Read Epic Context

Read the epic file to understand the full context:
```
${SAGA_PROJECT_DIR}/.saga/epics/<epic_slug>/epic.md
```

### 4. Read Story Template

Read the template from: `${SAGA_PLUGIN_ROOT}/skills/generate-stories/templates/story-template.md`

### 5. Generate Full Story Content

Generate complete story.md content following the template structure.

**Critical**: The story must be **self-contained** - understandable without reading the epic. Use the epic context to inform the story but write it so it stands alone.

**Scope discipline**:
- Use `other_stories` from the prompt to ensure this story doesn't overlap with sibling stories
- Respect any "Out of scope" or "Non-goals" sections from the epic.md
- Explicitly list other stories and epic exclusions in the story's "Out of scope" section

Include:
- Clear context explaining what and why
- Specific scope boundaries (use out_of_scope to define boundaries)
- Well-defined interfaces (inputs/outputs)
- Verifiable acceptance criteria
- Detailed tasks with guidance, references, pitfalls to avoid, and done-when criteria

### 6. Write Story File to Worktree

Create the story directory in the worktree and write story.md:

```bash
mkdir -p <worktree_path>/.saga/epics/<epic_slug>/stories/<generated-slug>/
```

Write the generated content to:
```
<worktree_path>/.saga/epics/<epic_slug>/stories/<generated-slug>/story.md
```

### 7. Commit, Push, and Create PR

From within the worktree directory, commit and push the story.md:

```bash
cd <worktree_path>
git add .saga/epics/<epic_slug>/stories/<generated-slug>/story.md
git commit -m "docs(<generated-slug>): add story definition

Epic: <epic_slug>
Story: <generated-slug>"
git push -u origin <branch>
```

Then create a draft PR:

```bash
gh pr create --draft \
  --title "Story: <epic_slug>/<generated-slug>" \
  --body "## Story: <story_title>

**Epic**: <epic_slug>
**Story**: <generated-slug>

---

This is a draft PR for tracking story progress.

To implement this story, run:
\`\`\`
/implement <generated-slug>
\`\`\`"
```

Capture the PR URL from the output.

### 8. Return Result

After completing all steps, output the result in this exact JSON format:

```json
{
  "story_slug": "<generated-slug>",
  "story_title": "<story_title>",
  "branch": "story-<generated-slug>-epic-<epic_slug>",
  "worktree_path": ".saga/worktrees/<epic_slug>/<generated-slug>/",
  "pr_url": "<pr_url or null>"
}
```
