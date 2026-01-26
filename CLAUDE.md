# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is **SAGA** (Structured Autonomous Goal Achievement) - a structured development workflow that combines human-guided epic planning with autonomous story execution. The system provides a complete lifecycle from epic ideation through story breakdown and rigorous implementation.

### Repository Structure

```
saga/
├── plugin/                     # Claude Code plugin source
├── packages/
│   └── cli/                    # @saga-ai/cli npm package
├── CLAUDE.md                   # This file
├── README.md                   # User-facing documentation
├── CHANGELOG.md                # Plugin version history
└── RELEASING.md                # Release process documentation
```

**Key packages:**
- **plugin/**: The Claude Code plugin with skills, agents, and hooks
- **packages/cli/**: Standalone CLI for story orchestration (see [`packages/cli/CLAUDE.md`](packages/cli/CLAUDE.md) for development guide)

## Core Architecture

### Epic/Story Development Lifecycle

1. **Epic Definition Phase**
   - Define WHAT needs to be built (vision, goals, requirements)
   - Capture acceptance criteria and success metrics
   - Include high-level architecture decisions
   - Use `/create-epic` to create unified epic.md

2. **Story Generation Phase**
   - Break epics into implementable stories
   - Each story is self-contained with clear tasks
   - Stories include implementation guidance and patterns
   - Use `/generate-stories` to create stories from an epic

3. **Story Execution Phase**
   - Stories executed autonomously via `/execute-story` command
   - Workers complete tasks following TDD practices
   - Progress documented in journal.md throughout execution
   - Use `/resolve-blocker` when workers get blocked

### Directory Structure

When users install this plugin and run `/init`, the following structure is created:

```
.saga/                  # Created in user's project root
├── epics/                      # Epic definitions and stories
│   └── <epic-slug>/
│       ├── epic.md            # Vision, goals, architecture
│       └── stories/
│           └── <story-slug>/
│               ├── story.md   # Self-contained story definition
│               └── journal.md # Execution log (created when story starts)
├── archive/                    # Completed story archives
│   └── <epic-slug>/
│       └── <story-slug>/
│           ├── story.md
│           └── journal.md
└── worktrees/                  # Git worktrees for story isolation (gitignored)
    └── <epic-slug>/
        └── <story-slug>/      # Full project checkout
```

**Key Points:**
- Each story worktree is a full git checkout with isolation
- Story files (story.md, journal.md) live in `epics/` and are tracked in git
- Worktrees are gitignored to prevent nesting issues
- Stories link back to their parent epic for context

### Plugin Structure

```
plugin/                         # Plugin source code
├── .claude-plugin/
│   └── plugin.json            # Plugin manifest
├── agents/                     # Claude Code agents
│   └── generate-story.md      # Story generation agent
├── scripts/                    # Utility scripts
│   └── identifier_resolver_v2.py
├── hooks/                      # Session hooks
│   └── session-init.sh        # Context detection
├── docs/                       # Documentation
│   └── ENVIRONMENT.md
└── skills/                     # Core skills
    ├── init/                  # Initialize .saga/
    ├── create-epic/           # Create epic with vision + architecture
    ├── generate-stories/      # Generate stories from epic (spawns agents)
    ├── execute-story/         # Autonomous /execute-story
    └── resolve-blocker/       # Resolve blockers with /resolve-blocker
```

### Agents

Agents are Claude Code subagents defined in `plugin/agents/`. They are registered in `plugin.json` and can be spawned via the Task tool.

| Agent | Description |
|-------|-------------|
| `generate-story` | Creates a single story with full content and git infrastructure. Spawned by `/generate-stories` for each story in parallel. |

**Plugin agent format** (limited schema - only `description` and `capabilities` supported):

```yaml
---
description: What this agent specializes in
capabilities:
  - "task1"
  - "task2"
  - "task3"
---
```

> **Note:** Plugin agents have a simpler schema than custom agents (`.claude/agents/`). Custom agents support additional fields like `name`, `tools`, `model`, and `permissionMode`, but these are not available for plugin-bundled agents.

### Plugin Path References

When referencing files within the plugin, always use `${SAGA_PLUGIN_ROOT}` instead of relative paths:

```markdown
# Correct:
`${SAGA_PLUGIN_ROOT}/skills/create-epic/templates/epic-template.md`

# Incorrect:
`templates/epic-template.md`
```

### Environment Variables

Environment variables are available in the bash execution environment. All SAGA variables use the `SAGA_` prefix:

```bash
echo $SAGA_PROJECT_DIR
```

**Available Variables:**

| Variable | Description | Context |
|----------|-------------|---------|
| `SAGA_PROJECT_DIR` | Project root directory | Always |
| `SAGA_PLUGIN_ROOT` | Plugin installation directory | Always |
| `SAGA_TASK_CONTEXT` | `"main"` or `"story-worktree"` | Always |
| `SAGA_EPIC_SLUG` | Epic identifier | Story worktree |
| `SAGA_STORY_SLUG` | Story identifier | Story worktree |
| `SAGA_STORY_DIR` | Path to story files | Story worktree |

For full documentation see: `plugin/docs/ENVIRONMENT.md`

### Story Status

Story and task status are stored in the story.md frontmatter:

```yaml
---
id: story-slug
title: Story Title
status: ready           # Story-level status
epic: epic-slug
tasks:
  - id: t1
    title: Task 1 Title
    status: pending     # Task-level status
---
```

| Status | Meaning |
|--------|---------|
| `ready` | Story is ready to be implemented |
| `in_progress` | Story is currently being worked on |
| `blocked` | Story is blocked, needs resolution |
| `completed` | Story implementation is finished |

## Development Commands

### Initial Setup (Run Once)

```bash
/init
# Creates .saga/ structure:
# - epics/, archive/, worktrees/
# - Adds gitignore pattern for worktrees
```

### Epic and Story Workflow

```bash
# 1. Create an epic
/create-epic user authentication system
# Creates: .saga/epics/user-auth/epic.md
# Output: Vision, goals, architecture, success criteria

# 2. Generate stories from epic
/generate-stories user-auth
# Creates: .saga/epics/user-auth/stories/<story-slug>/story.md
# Also creates: worktree + branch + PR for each story

# 3. Implement a story autonomously
/execute-story login-flow
# Spawns workers to implement the story
# Workers follow TDD, document in journal.md
# Exit states: FINISH, BLOCKED, TIMEOUT, MAX_CYCLES

# 4. Resolve blockers when needed
/resolve-blocker login-flow
# Analyzes blocker from journal.md
# Proposes solutions for human approval
# Documents resolution for next worker
```

## Critical Execution Rules

### Autonomous Execution

Stories are executed autonomously using the `/execute-story` command. The orchestrator spawns worker Claude instances that:

1. Read story.md for tasks and guidance
2. Complete tasks following TDD practices
3. Document progress in journal.md
4. Exit with status: FINISH (all done), BLOCKED (needs human decision), or TIMEOUT

When a worker gets BLOCKED, use `/resolve-blocker` to analyze and provide a resolution, then continue with `/execute-story`.

### Non-Negotiable Rules

- **Test-Driven Development**: Tests must be written before implementation
- **No Test Modification**: After tests are written, they can only be changed with explicit user approval
- **Continuous Journaling**: Document decisions and insights in journal.md throughout execution
- **Commit Discipline**: Commit and push at logical milestones

### Git Commit Format

```bash
# Story-based commits
git commit -m "test(story-slug): add comprehensive test suite for [feature]"
git commit -m "feat(story-slug): implement core [component] functionality"
git commit -m "fix(story-slug): resolve [issue]"

# Always commit and push together
git add . && git commit -m "..." && git push
```

## Story File Structure

### story.md

Stories use YAML frontmatter for metadata and markdown for content:

```markdown
---
id: story-slug
title: Story Title
status: ready
epic: epic-slug
tasks:
  - id: t1
    title: Task 1 Title
    status: pending
  - id: t2
    title: Task 2 Title
    status: pending
---

## Context
Self-contained description of what this story accomplishes.

## Scope Boundaries
**In scope:** / **Out of scope:**

## Interface
**Inputs:** / **Outputs:**

## Acceptance Criteria
- [ ] Verifiable conditions

## Tasks
### t1: Task 1 Title
**Guidance:** / **References:** / **Avoid:** / **Done when:**
```

### journal.md

Workers document progress in journal.md:

```markdown
## Session: [ISO timestamp]

### Completed
- Task X: [what was done]

### Decisions
- [technical decision]: [rationale]

### Next Steps
- [what remains]

---

## Blocker: [Title]

**Task**: [Which task is blocked]
**What I'm trying to do**: [Description]
**What I tried**: [Approaches attempted]
**What I need**: [Decision or information required]
**Suggested options**: [If ideas exist]

---

## Resolution: [Blocker Title]

**Decision**: [Chosen approach]
**Implementation guidance**: [Steps for next worker]
**Rationale**: [Why this approach]
**Approved**: [ISO timestamp]
```

## Important Notes

- **Epic-Driven Development**: Epics define vision, stories deliver value
- **Human-Guided Planning**: Epic creation and story generation require human approval
- **Autonomous Execution**: Stories execute independently with `/execute-story`
- **Scope Enforcement**: Workers stay within story worktree boundaries
- **Keep Complexity Minimal**: Only add what's directly needed
