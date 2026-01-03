# Technical Plan: Plugin Instructions Refactor

**Feature**: [005-plugin-instructions-refactor](./feature.md)
**Created**: 2026-01-03
**Status**: Draft

## Executive Summary

Refactor the plugin structure to separate content from metadata by creating a centralized `plugin/instructions/` folder. Skills and commands become thin wrappers (frontmatter + Content: reference) pointing to shared instruction files, enabling content reuse and dual invocation (skill + command).

## Technical Approach

- **Architectural Pattern**: Content extraction with reference-based inclusion
- **Integration Points**: Skills, commands, plugin.json registration
- **Development Strategy**: Single atomic refactor task

## System Architecture

### Components

1. **Instructions Directory** (`plugin/instructions/`)
   - **Purpose**: Centralized storage for all instruction content
   - **Responsibilities**: Houses INSTRUCTIONS.md and supporting artifacts per skill
   - **Interfaces**: Referenced via `Content:` directive

2. **Thin Skill Wrappers** (`plugin/skills/*/SKILL.md`)
   - **Purpose**: Skill registration with metadata
   - **Responsibilities**: Frontmatter (name, description) + content reference
   - **Interfaces**: Claude Code skill system

3. **Command Wrappers** (`plugin/commands/*.md`)
   - **Purpose**: Slash command registration
   - **Responsibilities**: Frontmatter (description, argument-hint) + content reference
   - **Interfaces**: Claude Code command system

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            plugin/                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐                            │
│  │    commands/    │    │     skills/      │                            │
│  │  (9 commands)   │    │  (12 skills)     │                            │
│  │                 │    │                  │                            │
│  │  init.md ────────────────────────────────── inline content (special) │
│  │                 │    │                  │                            │
│  │  task-list.md ──┼────┼── task-list/ ────┼───┐                        │
│  │  task-start.md ─┼────┼── task-start/ ───┼───┤                        │
│  │  ...            │    │  ...             │   │                        │
│  │                 │    │                  │   │                        │
│  │                 │    │  task-builder/ ──┼───┤  (internal - no cmd)   │
│  │                 │    │  journal-write/ ─┼───┤  (internal - no cmd)   │
│  └─────────────────┘    └──────────────────┘   │                        │
│                                                 │                        │
│                              ┌──────────────────┴───────────────────┐   │
│                              │           instructions/              │   │
│                              │                                      │   │
│                              │   task-list/INSTRUCTIONS.md          │   │
│                              │   task-start/INSTRUCTIONS.md         │   │
│                              │               workflows/             │   │
│                              │   feature-definition/INSTRUCTIONS.md │   │
│                              │                      templates/      │   │
│                              │   task-builder/INSTRUCTIONS.md       │   │
│                              │              instructions/ (sub)     │   │
│                              │   ...                                │   │
│                              └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Choices

### Command Frontmatter Fields

| Field | Purpose | Required |
|-------|---------|----------|
| `description` | Brief description shown in `/help` | No |
| `argument-hint` | Expected arguments shown during auto-completion | No |
| `allowed-tools` | Restrict tools the command can use | No |
| `model` | Specific model to use | No |

### Command Specifications

| Command | description | argument-hint |
|---------|-------------|---------------|
| `task-list.md` | List all tasks with status | *(none)* |
| `task-start.md` | Start working on a task | `[task-id]` |
| `task-cleanup.md` | Cleanup completed task worktree | `[task-id]` |
| `task-resume.md` | Resume a remote task locally | `[task-id]` |
| `feature-definition.md` | Define a new feature | `[feature-description]` |
| `feature-planning.md` | Create technical plan for feature | `[feature-id]` |
| `architecture-decisions.md` | Create an architecture decision record | `[decision-description]` |
| `task-generation.md` | Generate tasks from feature plan | `[feature-id]` |

### File Format Conventions

**SKILL.md (thin wrapper):**
```yaml
---
name: task-start
description: "ONLY activate on DIRECT user request..."
---

Content: ../../instructions/task-start/INSTRUCTIONS.md
```

**command.md (thin wrapper):**
```yaml
---
description: "Start working on a task"
argument-hint: "[task-id]"
---

Content: ../instructions/task-start/INSTRUCTIONS.md
```

### Path Reference Patterns

| Source | Target | Relative Path |
|--------|--------|---------------|
| `plugin/skills/{name}/SKILL.md` | `plugin/instructions/{name}/INSTRUCTIONS.md` | `../../instructions/{name}/INSTRUCTIONS.md` |
| `plugin/commands/{name}.md` | `plugin/instructions/{name}/INSTRUCTIONS.md` | `../instructions/{name}/INSTRUCTIONS.md` |

## File Structure

### Current Structure (Before)

```
plugin/skills/
├── task-list/
│   └── SKILL.md
├── task-start/
│   ├── SKILL.md
│   ├── journaling-guidelines.md
│   ├── worktree-flow.md
│   ├── scripts/detect-context.sh
│   └── workflows/ (9 files)
├── task-cleanup/
│   └── SKILL.md
├── task-resume/
│   └── SKILL.md
├── feature-definition/
│   ├── SKILL.md
│   └── templates/feature-template.md
├── feature-planning/
│   ├── SKILL.md
│   └── templates/plan-template.md
├── architecture-decisions/
│   ├── SKILL.md
│   └── templates/adr-template.md
├── task-generation/
│   ├── SKILL.md
│   ├── templates/task-breakdown-template.md
│   └── scripts/allocate-task-ids.sh
├── task-builder/
│   ├── SKILL.md
│   ├── templates/task-template.md
│   └── instructions/ (3 files)
├── task-merge/
│   └── SKILL.md
├── journal-create/
│   ├── SKILL.md
│   └── journal-template.md
└── journal-write/
    └── SKILL.md

plugin/commands/
└── init.md
```

### Target Structure (After)

```
plugin/instructions/                    # NEW - centralized instructions
├── task-list/INSTRUCTIONS.md
├── task-start/
│   ├── INSTRUCTIONS.md
│   ├── journaling-guidelines.md
│   ├── worktree-flow.md
│   ├── scripts/detect-context.sh
│   └── workflows/ (9 files)
├── task-cleanup/INSTRUCTIONS.md
├── task-resume/INSTRUCTIONS.md
├── feature-definition/
│   ├── INSTRUCTIONS.md
│   └── templates/feature-template.md
├── feature-planning/
│   ├── INSTRUCTIONS.md
│   └── templates/plan-template.md
├── architecture-decisions/
│   ├── INSTRUCTIONS.md
│   └── templates/adr-template.md
├── task-generation/
│   ├── INSTRUCTIONS.md
│   ├── templates/task-breakdown-template.md
│   └── scripts/allocate-task-ids.sh
├── task-builder/
│   ├── INSTRUCTIONS.md
│   ├── templates/task-template.md
│   └── instructions/ (3 files)
├── task-merge/INSTRUCTIONS.md
├── journal-create/
│   ├── INSTRUCTIONS.md
│   └── journal-template.md
└── journal-write/INSTRUCTIONS.md

plugin/skills/                          # MODIFIED - thin wrappers only
├── */SKILL.md                          # 12 thin wrappers

plugin/commands/                        # EXPANDED
├── init.md                             # Unchanged (inline content)
├── task-list.md                        # NEW
├── task-start.md                       # NEW
├── task-cleanup.md                     # NEW
├── task-resume.md                      # NEW
├── feature-definition.md               # NEW
├── feature-planning.md                 # NEW
├── architecture-decisions.md           # NEW
└── task-generation.md                  # NEW
```

### File Transformation Summary

| Current Location | Action | New Location |
|------------------|--------|--------------|
| `skills/{name}/SKILL.md` (content) | Extract → | `instructions/{name}/INSTRUCTIONS.md` |
| `skills/{name}/SKILL.md` (frontmatter) | Keep + add Content ref → | `skills/{name}/SKILL.md` (thin) |
| `skills/{name}/templates/*` | Move → | `instructions/{name}/templates/*` |
| `skills/{name}/workflows/*` | Move → | `instructions/{name}/workflows/*` |
| `skills/{name}/scripts/*` | Move → | `instructions/{name}/scripts/*` |
| `skills/{name}/*.md` (non-SKILL) | Move → | `instructions/{name}/*.md` |
| *(new)* | Create → | `commands/{name}.md` (8 non-internal) |

## Implementation Strategy

### Single Task

| Task | Type | Title | Priority |
|------|------|-------|----------|
| 1 | refactor | Plugin instructions refactor | P2 |

### Implementation Steps

**Step 1: Foundation**
- Create `plugin/instructions/` with all 12 subdirectories

**Step 2: Migrate All 12 Skills**

Process in order (simple → complex):

1. **No artifacts**: task-list, task-cleanup, task-resume, journal-write, task-merge
2. **With templates**: architecture-decisions, feature-definition, feature-planning, journal-create
3. **Complex**: task-generation (templates + scripts), task-builder (templates + instructions)
4. **Most complex**: task-start (workflows + scripts + loose .md files)

Per skill:
- Extract content → `instructions/{name}/INSTRUCTIONS.md`
- Move artifacts → `instructions/{name}/`
- Create thin SKILL.md wrapper
- Create command file (non-internal only)

**Step 3: Finalize**
- Update plugin.json with 8 new commands
- Verify all path references
- Test plugin loads correctly

### Success Criteria

- [ ] 12 `instructions/{name}/INSTRUCTIONS.md` files created
- [ ] 12 thin `SKILL.md` wrappers (frontmatter + Content: ref only)
- [ ] 8 `commands/{name}.md` files created (non-internal skills)
- [ ] All artifacts moved to `instructions/` subdirectories
- [ ] `plugin.json` updated with 9 commands
- [ ] No orphaned files in old skill directories
- [ ] Plugin loads and functions correctly

## Skill Classification

### Non-Internal Skills (8) - Get Command Wrappers

| Skill | Description Pattern | Artifacts |
|-------|---------------------|-----------|
| task-list | "ONLY activate on DIRECT user request..." | None |
| task-start | "ONLY activate on DIRECT user request..." | workflows/, scripts/, *.md |
| task-cleanup | "ONLY activate on DIRECT user request..." | None |
| task-resume | "ONLY activate on DIRECT user request..." | None |
| feature-definition | "ONLY activate on DIRECT user request..." | templates/ |
| feature-planning | "ONLY activate on DIRECT user request..." | templates/ |
| architecture-decisions | "ONLY activate on DIRECT user request..." | templates/ |
| task-generation | "ONLY activate on DIRECT user request..." | templates/, scripts/ |

### Internal Skills (4) - No Command Wrappers

| Skill | Description Pattern | Artifacts |
|-------|---------------------|-----------|
| task-builder | "Internal skill - invoked by task-builder agent only" | templates/, instructions/ |
| task-merge | "Internal skill - ONLY activated by task-completer..." | None |
| journal-create | "ONLY called by journaling subagent. NOT user-facing" | journal-template.md |
| journal-write | "ONLY called by journaling subagent. NOT user-facing" | None |

## plugin.json Updates

```json
{
  "commands": [
    "./commands/init.md",
    "./commands/task-list.md",
    "./commands/task-start.md",
    "./commands/task-cleanup.md",
    "./commands/task-resume.md",
    "./commands/feature-definition.md",
    "./commands/feature-planning.md",
    "./commands/architecture-decisions.md",
    "./commands/task-generation.md"
  ]
}
```

---

**Note**: This document describes HOW to build the feature. It should be reviewed and approved before generating tasks.
