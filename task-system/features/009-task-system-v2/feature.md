# Feature: Task System V2 - Epic/Story Architecture

**Created:** 2026-01-10
**Status:** Draft
**Feature ID:** 009

## Overview

Restructure the task management system into a 4-level hierarchy (Epic → Spec → Stories → Tasks) optimized for Claude Code agent workflows. The new system provides clearer separation of concerns: epics capture vision, specs document architecture, and self-contained stories enable autonomous agent execution.

## Motivation

The current task system conflates planning and execution concerns. Features and plans contain context that agents don't need, while task.json objectives lack sufficient implementation detail. The new hierarchy:

- **Separates concerns**: Vision (epic) → Architecture (spec) → Execution (story/tasks)
- **Enables autonomy**: Stories are self-contained - agents never see epic.md or spec.md
- **Improves task quality**: Tasks include guidance, references, anti-patterns, and verification
- **Aligns terminology**: Industry-standard epic/story terms vs. custom "feature/task" vocabulary

## Directory Structure

```
.claude-tasks/
├── epics/                           # Tracked in git
│   └── <epic-slug>/
│       ├── epic.md                  # Vision, goals, success metrics
│       ├── spec.md                  # Architecture decisions, interfaces
│       └── stories/
│           └── <story-slug>/
│               ├── story.md         # Self-contained story + tasks (front matter + markdown)
│               └── journal.md       # Execution log (canonical location)
├── archive/                         # Completed stories
│   └── <epic-slug>/
│       └── <story-slug>/
│           ├── story.md
│           └── journal.md
└── worktrees/                       # Git worktrees (gitignored)
    └── <epic-slug>/
        └── <story-slug>/            # Full code checkout only
            └── src/...              # No task files here
```

**Key design decisions:**
- **Canonical task files**: story.md and journal.md live in `epics/` (tracked), not in worktrees
- **Worktrees for code only**: Worktrees contain code branches, no task file duplication
- **Claude hooks for scope**: Hooks enforce agent stays within assigned story's files

## Commands and Skills

The system uses a **two-layer architecture**:
- **Commands** (user-facing): Accept arguments via `$ARGUMENTS`, run scripts with `!` prefix, then invoke internal skills via the `Skill` tool
- **Skills** (internal): Receive context from commands, do the actual work, marked `user-invocable: false`

This separation is necessary because **Skills don't support argument placeholders** (`$ARGUMENTS`, `$1`, `$2`) - only Commands do.

### Commands (User-Facing)

| Command | Arguments | Description |
|---------|-----------|-------------|
| `/init` | - | Initialize `.claude-tasks/` structure |
| `/create-epic` | `<description>` | Create new epic |
| `/create-spec` | `<epic-slug>` | Create spec for epic |
| `/generate-stories` | `[epic-slug]` | Generate stories from spec |
| `/show-story` | `<story-slug>` | Show story details and status |
| `/list` | `[epics\|stories\|all]` | List epics, stories, or both |
| `/implement` | `<story-slug>` | Execute story autonomously |
| `/resolve` | `[story-slug]` | Resolve blocked story |

**Argument conventions:**
- `<required>` - Must be provided
- `[optional]` - Can be omitted (auto-detected or defaults applied)
- `[a|b|c]` - Choose one option

### Skills (Internal)

| Skill | Invoked By | Purpose |
|-------|------------|---------|
| `create-epic` | `/create-epic` command | Generate epic.md from context |
| `create-spec` | `/create-spec` command | Generate spec.md from resolved epic |
| `generate-stories` | `/generate-stories` command | Create story.md files from spec |
| `show-story` | `/show-story` command | Display story details |
| `list-status` | `/list` command | Format and display status |
| `execute-story` | `/implement` command | Orchestrate story implementation |
| `resolve-blocker` | `/resolve` command | Analyze and resolve blockers |

All skills are marked `user-invocable: false` (hidden from slash menu) since they receive context from their associated commands.

### How Commands Invoke Skills

```markdown
# Example: /create-spec command

---
allowed-tools: Bash(python:*), Skill(create-spec)
argument-hint: <epic-slug>
description: Create a technical specification for an epic
---

## Epic Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "$ARGUMENTS" --type epic --project-root "$(pwd)"`

## Instructions

The resolution result above is now in context. Use the Skill tool to invoke `create-spec` which will use this context to create the specification.
```

## Hierarchy Mapping (Current → New)

| Current System | New System |
|---------------|------------|
| `task-system/features/NNN/` | `.claude-tasks/epics/<slug>/` |
| `feature.md` | `epic.md` |
| `plan.md` | `spec.md` |
| `task.json` (objectives) | `story.md` (tasks in front matter) |
| Objectives | Tasks (with richer fields) |

## User Stories

### Story 1: Epic Creation

**As a** developer planning a large feature
**I want** to create an epic document capturing vision and goals
**So that** I can establish clear success criteria before diving into implementation

**Acceptance Criteria:**
- [ ] Can create an epic with `/create-epic <description>` command
- [ ] Command runs scripts, then invokes `create-epic` skill via Skill tool
- [ ] Epic.md contains: Overview, Goals, Success Metrics, Scope (in/out), NFRs
- [ ] Stored in `.claude-tasks/epics/<slug>/epic.md`
- [ ] No implementation details in epic (enforced by template guidance)

### Story 2: Technical Spec Creation

**As a** developer ready to plan implementation
**I want** to create a technical spec for my epic
**So that** I document architecture decisions before breaking down into stories

**Acceptance Criteria:**
- [ ] Can create spec with `/create-spec <epic-slug>` command
- [ ] Command uses identifier_resolver.py for epic resolution (slug-based matching)
- [ ] Command invokes `create-spec` skill with resolution context
- [ ] Spec.md contains: Architecture Overview, Key Decisions (ADR-style), Data Models, Interface Contracts, Tech Stack, Open Questions
- [ ] Key decisions include Choice/Rationale/Alternatives format
- [ ] Interface contracts define APIs between stories

### Story 3: Story Generation from Spec

**As a** developer with a completed spec
**I want** to break down the spec into executable stories
**So that** work can proceed in parallel with clear boundaries

**Acceptance Criteria:**
- [ ] Can generate stories with `/generate-stories` command (auto-detects epic)
- [ ] Can specify epic explicitly: `/generate-stories <epic-slug>`
- [ ] Command invokes `generate-stories` skill with resolution context
- [ ] Each story is a self-contained markdown file with YAML front matter
- [ ] Front matter includes: id, title, status, epic, tasks (id, title, status)
- [ ] Markdown body includes: context, interface (inputs/outputs), acceptance_criteria, task details
- [ ] Stories reference no parent documents (epic/spec)
- [ ] Dependencies between stories are explicit (blocked_by/blocks)

### Story 4: Task Structure Within Stories

**As a** Claude agent executing a story
**I want** tasks with clear implementation guidance
**So that** I can complete work autonomously without ambiguity

**Acceptance Criteria:**
- [ ] Tasks include: guidance (how to implement), references (files to check), avoid (anti-patterns), done_when (verification)
- [ ] Task dependencies within story are trackable
- [ ] Status progression: pending → in-progress → done
- [ ] Agent can determine next task from story.md alone

### Story 5: Story Execution Workflow

**As a** developer
**I want** to execute stories using the `/implement` command
**So that** agents can work autonomously within story boundaries

**Acceptance Criteria:**
- [ ] `/implement <story-slug>` command resolves story, then invokes `execute-story` skill
- [ ] Agent works in worktree but reads/writes task files from canonical location
- [ ] Agent tracks progress by updating task status in story.md front matter
- [ ] Journal.md captures execution log in canonical location
- [ ] BLOCKED status triggers `/resolve` command flow
- [ ] Story completion updates story status to "done"

### Story 6: Scope Enforcement via Hooks

**As a** developer
**I want** Claude agents to be constrained to their assigned story
**So that** parallel work on different stories doesn't cause conflicts

**Acceptance Criteria:**
- [ ] Claude hook blocks writes to other stories' task files
- [ ] Hook provides clear error message identifying scope violation
- [ ] Hook allows full codebase access (only task files restricted)
- [ ] Scope enforcement passed via `--settings` flag when spawning workers

## Functional Requirements

1. The system shall store all artifacts under `.claude-tasks/` directory
2. The system shall use slug-based naming for epics and stories (no numeric prefixes)
3. Stories shall be fully self-contained markdown files with YAML front matter (`story.md` in each story directory)
4. Stories shall never reference epic.md or spec.md content
5. Stories shall use descriptive slugs for IDs (e.g., `user-login`, `auth-api`)
6. The system shall support story-level dependencies (blocked_by/blocks)
7. The system shall support task-level dependencies within stories
8. The system shall validate story.md front matter schema on creation
9. The system shall use git worktrees for code branch isolation
10. Task files (story.md, journal.md) shall live in canonical location (`epics/`), not in worktrees
11. The system shall use skill-scoped Claude hooks to enforce story scope during execution
12. The system shall use a two-layer architecture: Commands (user-facing, accept arguments) invoke Skills (internal, no arguments) via the Skill tool
13. Commands shall run scripts with `!` prefix to gather context before invoking skills
14. The system shall migrate `/implement` command to work with story.md format
15. The system shall archive completed stories to `.claude-tasks/archive/`

## Non-Functional Requirements

### Performance
- Story listing should complete in <1 second for 100+ stories
- Story validation should be instant (<100ms)

### Maintainability
- Front matter schema should be versioned for future evolution
- Clear separation between plugin code and user artifacts

### Usability
- Commands use consistent plugin namespace: `/claude-task-system:<command>` or just `/<command>` when unambiguous
- Commands are invocable via `/command-name` with arguments
- Skills are internal and invoked by commands via the Skill tool
- Error messages should guide users to correct usage
- Story.md should be human-readable and editable (markdown with YAML front matter)

## Out of Scope

- Migration of existing task-system/ features (start fresh)
- Automated epic-to-spec generation (human-driven)
- Cross-epic dependencies (each epic is independent)
- Story templates (all stories follow single schema)
- Time tracking or estimation features
- Integration with external project management tools

## Success Metrics

- **Clarity**: Developers can understand epic→story flow in <5 minutes
- **Autonomy**: Agents complete stories without epic/spec context 95%+ of time
- **Quality**: Task "done_when" criteria are verifiable in all cases
- **Adoption**: New work uses epic/story structure within 2 weeks

## Dependencies

- **Plugin commands infrastructure**: Command .md format, `$ARGUMENTS` placeholders, `!` bash execution, `argument-hint` frontmatter
- **Plugin skills infrastructure**: SKILL.md format, skill frontmatter, `user-invocable` visibility control
- **Skill tool**: For commands to invoke internal skills programmatically
- **Git worktrees**: For code branch isolation
- **Skill-scoped Claude hooks**: For scope enforcement during execution (defined in SKILL.md frontmatter)
- **GitHub CLI**: PR creation for stories

## Open Questions

- [ ] How to handle stories that span multiple epics (if at all)?

## References

- Current task.json schema: `plugin/instructions/task-generation/templates/task-template.json`
- Current implement workflow: `plugin/instructions/implement/`
- User-provided architecture brief: Inline in feature request
- Claude Code Skills documentation: https://code.claude.com/docs/en/skills.md
- Claude Code Slash Commands documentation: https://code.claude.com/docs/en/slash-commands.md

---

**Note**: This document describes WHAT to build, not HOW. Technical implementation details belong in plan.md (now spec.md).
