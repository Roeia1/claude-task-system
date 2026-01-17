# Task 023 Journal: Phase 2 - Epic and Story Creation Commands

## Session: 2026-01-17

### Session Start
Reading task.json and understanding the objective. This task involves creating:
1. `/create-epic` command → invokes `create-epic` skill
2. `create-epic` skill with SKILL.md and epic-template.md
3. `/generate-stories` command → resolves epic via identifier_resolver.py, invokes `generate-stories` skill
4. `generate-stories` skill with SKILL.md, story-template.md, and create_worktree.sh
5. `create_worktree.sh` script for git worktree and PR creation

The architecture uses a two-layer pattern: Commands accept arguments and invoke Skills via the Skill tool.

### Objective 1: /create-epic command (DONE)
Created `plugin/commands/create-epic.md` with:
- `argument-hint: <description>` for user input
- `allowed-tools: Skill(create-epic), AskUserQuestion`
- Instructions to invoke the create-epic skill via Skill tool

### Objective 2: create-epic skill (DONE)
Created `plugin/skills/create-epic/` with:
- `SKILL.md` - skill definition with `user-invocable: false`
  - Process for slug generation (kebab-case, max 50 chars)
  - AI-assisted dialog flow for vision and architecture sections
  - Clarification guidelines for ambiguous requirements
- `templates/epic-template.md` - unified structure with:
  - Vision section: Overview, Goals, Success Metrics, Scope, NFRs
  - Architecture section (below ---): Technical Approach, Key Decisions, Data Models, Interface Contracts, Tech Stack

### Objective 3: /generate-stories command (DONE)
Created `plugin/commands/generate-stories.md` with:
- `argument-hint: [epic-slug]` for optional epic identifier
- `allowed-tools: Bash(python:*), Skill(generate-stories), AskUserQuestion`
- Instructions to run identifier_resolver.py with `--type epic` flag
- Logic for handling resolved, multiple matches, and error cases

### Objective 4: generate-stories skill (DONE)
Created `plugin/skills/generate-stories/` with:
- `SKILL.md` - skill definition with:
  - Story breakdown generation logic
  - AI-assisted story boundary identification
  - Approval flow before creating stories
  - Instructions for running create_worktree.sh
- `templates/story-template.md` - YAML front matter schema with:
  - id, title, status, epic, tasks array
  - Body sections: Context, Interface, Acceptance Criteria, Tasks

### Objective 5: create_worktree.sh script (DONE)
Created `plugin/skills/generate-stories/scripts/create_worktree.sh` with:
- Argument validation (epic-slug, story-slug)
- CLAUDE_PROJECT_DIR environment check
- Git branch creation: `story-<epic-slug>-<story-slug>`
- Worktree creation in `.claude-tasks/worktrees/<epic>/<story>/`
- Draft PR creation with appropriate title and body
- JSON output with success/failure status

### Also completed
- Updated `identifier_resolver.py` with:
  - `--type` flag supporting `task`, `epic`, `story`
  - `resolve_epic()` function for slug-based epic resolution
  - `resolve_story()` function for story resolution with YAML front matter parsing
  - Empty identifier handling (lists all epics when no argument provided)
- Updated `plugin.json` with new commands

### Testing
- Python syntax verified: `identifier_resolver.py` compiles without errors
- Bash syntax verified: `create_worktree.sh` passes `bash -n` syntax check
- Epic resolution tested: returns appropriate "no epics found" error

### Objective 6: Testing (DONE)
Verified implementation through:
- Python syntax check: `python3 -m py_compile` passes
- Bash syntax check: `bash -n` passes
- Epic resolution test: returns correct error when no epics exist
- File structure verified: all files created in correct locations
- Command patterns match existing commands in the codebase

All objectives completed. The implementation follows the specification from feature 009's plan.md:
- Two-layer architecture: Commands accept arguments, invoke Skills via Skill tool
- Epic unified structure: Vision above `---`, Architecture below
- Story YAML front matter: id, title, status, epic, tasks array
- create_worktree.sh: Creates branch, worktree, and draft PR with JSON output

### Session Complete
All 6 objectives completed and committed.
