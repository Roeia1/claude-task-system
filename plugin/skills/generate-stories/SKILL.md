---
name: generate-stories
description: Generate stories from an epic
argument-hint: "[epic-slug]"
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(npx:*), Bash(git:*), Bash(gh:*), Read, Write, AskUserQuestion, Task
---

# Generate Stories Skill

!`npx @saga-ai/cli --path "${SAGA_PROJECT_DIR}" find "$0" --type epic`

## Process

### 1. Check Resolution Result

The `saga find` command ran above. Handle the result:

- **If found=true**: Continue to step 2 with `data.slug` as the epic slug
- **If found=false with matches array**: Use AskUserQuestion to disambiguate:
  ```
  question: "Which epic do you want to generate stories for?"
  header: "Epic"
  multiSelect: false
  options: [
    {label: "<slug>", description: "Epic: <slug>"}
    ...for each epic in the matches array
  ]
  ```
  After selection, continue with the selected epic slug.
- **If found=false with error**: Display the error. Suggest using `/create-epic` first.

### 2. Read Epic Document

Read the epic file:
```
${SAGA_PROJECT_DIR}/.saga/epics/<slug>/epic.md
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

### 5. Spawn Story Generation Agents

For each approved story, spawn a `generate-story` agent to create the story files and git infrastructure.

#### 5.1 Spawn Agents in Parallel

Use the **Task tool** to spawn agents for all stories in parallel. For each story, pass:
- `epic_slug`: The epic identifier
- `story_title`: This story's title
- `story_description`: This story's description
- `other_stories`: Titles and descriptions of all OTHER approved stories (so this story knows its boundaries)

```
Task(
  subagent_type: "generate-story",
  description: "Generate story: <story_title>",
  prompt: |
    epic_slug: <epic_slug>
    story_title: <story_title>
    story_description: <story_description>

    other_stories:
      - <other story 1 title>: <description>
      - <other story 2 title>: <description>
)
```

**Important**: Spawn all story agents in a single message with multiple Task tool calls to maximize parallelism. The agent will read the epic.md and template files itself, including any epic-level exclusions.

### 6. Collect Results

Wait for all Task agents to complete and collect their JSON results.

### 7. Report Completion

```
Stories created for epic: <slug>

| Story | Slug | Branch | PR |
|-------|------|--------|-----|
| <title> | <slug> | story-<epic>-<slug> | <pr-url> |
| ... | ... | ... | ... |

Worktrees created in: .saga/worktrees/<epic-slug>/

Next steps:
- Review story.md files and refine as needed
- Run /implement <story-slug> to start implementation
```

