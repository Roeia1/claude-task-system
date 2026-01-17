---
name: generate-stories
description: Generate stories from a resolved epic
user-invocable: false
allowed-tools: Bash(git:*), Bash(gh:*), Bash(bash:*), Read, Write, AskUserQuestion
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

The epic contains:
- **Vision section** (above `---`): Overview, Goals, Success Metrics, Scope, NFRs
- **Architecture section** (below `---`): Technical Approach, Key Decisions, Data Models, Interface Contracts, Tech Stack

### 3. Read Story Template

Read the template from: `${CLAUDE_PLUGIN_ROOT}/skills/generate-stories/templates/story-template.md`

### 4. AI-Assisted Story Breakdown

Analyze the epic and generate a story breakdown:

1. **Identify logical story boundaries**:
   - Each story should be independently deployable
   - Stories should have clear inputs and outputs
   - Stories should be completable in 1-3 days of work

2. **Generate story structure**:
   - Meaningful, unique slug for each story
   - Clear title describing the deliverable
   - Self-contained context (no external dependencies to understand)
   - Specific acceptance criteria
   - Task breakdown with guidance

3. **Define story dependencies** (if any):
   - Which stories must complete before others
   - What interfaces stories expect from each other

### 5. Present Story Breakdown for Approval

Display the proposed stories to the user:

```
## Proposed Stories for Epic: <slug>

### Story 1: <story-slug>
**Title**: <title>
**Context**: <brief description>
**Tasks**: <number> tasks
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

### 6. Create Story Files

For each approved story:

1. Create the story directory:
   ```
   $CLAUDE_PROJECT_DIR/.claude-tasks/epics/<epic-slug>/stories/<story-slug>/
   ```

2. Generate story.md with YAML front matter:
   ```yaml
   ---
   id: <story-slug>
   title: <story title>
   status: ready
   epic: <epic-slug>
   tasks:
     - id: t1
       title: <task title>
       status: pending
     - id: t2
       title: <task title>
       status: pending
   ---

   ## Context
   <self-contained description>

   ## Interface
   ### Inputs
   - <dependencies>

   ### Outputs
   - <what this produces>

   ## Acceptance Criteria
   - [ ] <verifiable condition>
   - [ ] <another condition>

   ## Tasks

   ### t1: <task title>
   **Guidance:**
   - <implementation detail>

   **References:**
   - <file path>

   **Avoid:**
   - <anti-pattern>

   **Done when:**
   - <verification>
   ```

### 7. Create Git Infrastructure

For each story, run the create_worktree.sh script:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/generate-stories/scripts/create_worktree.sh "<epic-slug>" "<story-slug>"
```

The script will:
- Create a git branch: `story-<epic-slug>-<story-slug>`
- Create a worktree in `.claude-tasks/worktrees/<epic-slug>/<story-slug>/`
- Create a draft PR with appropriate title

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

## Story Generation Guidelines

### Good Story Boundaries

**Good** (clear boundaries):
- "Create login form component"
- "Add password reset API endpoint"
- "Implement session management"

**Bad** (too vague or too large):
- "Authentication" (too broad)
- "Add button" (too small, unless that's genuinely the scope)
- "Refactor and add tests" (multiple unrelated concerns)

### Task Granularity

Each task should be:
- Completable in 1-4 hours
- Have clear "done when" criteria
- Include specific guidance for implementation
- Reference relevant files

### Front Matter Status Values

Story status:
- `ready`: Created, ready for implementation
- `in-progress`: Implementation started
- `review`: Implementation complete, awaiting review
- `done`: Merged and complete

Task status:
- `pending`: Not started
- `in-progress`: Currently being worked on
- `done`: Complete

## Notes

- Stories are self-contained - they should be understandable without reading the epic
- Each story gets its own git worktree for isolated development
- The draft PR allows tracking progress and enables code review
- Story status is tracked in the YAML front matter
