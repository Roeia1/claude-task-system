# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **Claude Task System** - a structured development workflow that combines human-guided feature planning with disciplined task execution. The system provides a complete lifecycle from feature ideation through planning, task breakdown, and rigorous phased execution.

## Core Architecture

### Three-Phase Development Lifecycle

1. **Feature Definition Phase**
   - Define WHAT needs to be built (business requirements, user stories)
   - Capture acceptance criteria and success metrics
   - No implementation details - focus on user value

2. **Technical Planning Phase**
   - Design HOW to build the feature (architecture, tech stack)
   - Create data models, API contracts, implementation strategy
   - Document architectural decisions (ADRs)
   - Generate task breakdown for approval

3. **Task Execution Phase**
   - Tasks executed autonomously via `/implement` command
   - Workers complete objectives incrementally
   - Tests written before implementation (non-negotiable)
   - Progress documented in journal.md throughout execution

### Directory Structure

When users install this plugin and run `/task-system:init`, the following structure is created:

```
task-system/                    # Created in user's project root
├── features/                   # Feature definitions and plans
│   └── NNN-feature-name/
│       ├── feature.md         # What to build (requirements)
│       ├── plan.md            # How to build (technical design)
│       ├── tasks.md           # Reference to generated tasks
│       └── adr/               # Feature-specific ADRs
│           └── NNN-decision.md
├── tasks/                      # Task worktrees (gitignored, each is a git worktree)
│   └── NNN/                   # Task worktree with branch task-NNN-type
│       └── [full project]     # Complete project checkout
├── archive/                    # Completed task archives (tracked in git)
│   └── NNN/                   # Archived task files
│       ├── task.md            # Original task definition
│       └── journal.md         # Execution log
└── adrs/                       # Global architecture decisions
    └── NNN-decision-title.md
```

**Inside each task worktree** (`task-system/tasks/NNN/`):
```
task-system/
├── task-NNN/              # Task-specific folder
│   ├── task.md           # Task definition and requirements
│   └── journal.md        # Execution log (created when task starts)
├── archive/              # Tracked archive folder
└── features/             # Other tracked folders
```

**Note**: Each `task-system/tasks/NNN/` directory is a git worktree containing a full project checkout. The `task-system/tasks/` folder is gitignored to prevent endless nesting. Task files live in `task-system/task-NNN/` within each worktree.

The plugin itself lives in:

```
plugin/                         # Plugin source code
├── .claude-plugin/
│   └── plugin.json            # Plugin manifest
├── agents/                     # Subagent definitions
│   └── task-builder.md
├── commands/                   # Slash commands
│   ├── init.md                # Initialize task-system structure
│   ├── adr.md                 # Architecture decision records
│   └── ...
├── scripts/                    # Utility scripts
└── skills/                     # Skills for task execution
    ├── feature-definition/
    │   ├── SKILL.md
    │   └── templates/         # Skill-specific templates
    ├── implement/                 # Autonomous task implementation
    │   └── INSTRUCTIONS.md
    ├── task-list/             # Dynamic task list generation
    ├── task-resume/           # Resume remote tasks locally
    └── ...
```

### Plugin Path References

When referencing files within the plugin (templates, scripts, workflows, step-instructions), always use `${CLAUDE_PLUGIN_ROOT}` instead of relative paths. This ensures paths resolve correctly when the plugin is installed in other projects.

**Why**: Relative paths like `templates/foo.md` or `../scripts/bar.sh` resolve relative to the user's project directory, not the plugin installation directory. Using `${CLAUDE_PLUGIN_ROOT}` ensures Claude reads from the correct location.

**Pattern**:
```markdown
# In instruction files, use:
`${CLAUDE_PLUGIN_ROOT}/instructions/skill-name/templates/template.md`
`${CLAUDE_PLUGIN_ROOT}/scripts/script-name.sh`
`${CLAUDE_PLUGIN_ROOT}/instructions/skill-name/workflows/workflow.md`

# NOT relative paths like:
`templates/template.md`
`../../scripts/script-name.sh`
`workflows/workflow.md`
```

**Exception**: Paths in templates that will be written to the user's project (e.g., `../features/NNN/feature.md` in task-template.md) should remain relative since they reference the user's project structure, not plugin files.

### Dynamic Task Status

Task status is derived from filesystem and git state (no persistent TASK-LIST.md):

| Status | Signal |
|--------|--------|
| PENDING | Worktree exists in `task-system/tasks/NNN/`, no `journal.md` in `task-system/task-NNN/` |
| IN_PROGRESS | Worktree exists, `journal.md` present in `task-system/task-NNN/` |
| REMOTE | Open PR with task branch, no local worktree |
| COMPLETED | PR merged, files archived to `task-system/archive/NNN/` |

Use `list tasks` to see current task status.

## Development Commands

### Initial Setup (Run Once)

```bash
/task-system:init
# Creates task-system/ structure:
# - features/, tasks/, adrs/, archive/
# - Adds gitignore pattern for task worktrees
```

### Feature Planning Workflow

```bash
# 1. Define the feature (what to build)
# Say: "define feature user authentication system"
# Creates: task-system/features/001-user-authentication/feature.md
# Output: User stories, requirements, acceptance criteria
# AI assists with clarifications for ambiguities

# 2. Create technical plan (how to build)
# Say: "plan feature" or "create technical plan"
# Reads: task-system/features/001-user-authentication/feature.md
# Creates: task-system/features/001-user-authentication/plan.md
# Output: Architecture, tech choices, data models, API contracts, testing strategy
# Requires human review and approval

# 3. Generate tasks from plan
# Say: "generate tasks" or "break down feature"
# Reads: feature.md and plan.md
# AI proposes task breakdown
# Shows tasks for review/modification
# After approval:
#   - Creates worktree + branch + PR for each task
#   - Creates: task-system/features/001-user-authentication/tasks.md (reference)
```

### Architecture Decision Records

```bash
# Create ADR (context-aware) - use natural language
# Say: "create ADR for JWT vs session-based auth"
# Say: "document decision for database choice"

# If in feature directory → creates task-system/features/001-auth/adr/001-jwt-choice.md
# If in repo root → creates task-system/adrs/NNN-decision.md
# Uses standard ADR template with problem/options/decision/consequences
```

### Task Management

```bash
# List all tasks (local and remote)
# Say "list tasks" or "show tasks"
# Shows: LOCAL - IN_PROGRESS, LOCAL - PENDING, REMOTE (no local worktree)

# Resume a remote task locally
# Say "resume task 017"
# Creates local worktree from existing remote branch
```

### Autonomous Task Implementation

The `/implement` command provides autonomous, multi-session task execution:

```bash
# From MAIN REPO: Start autonomous implementation
/implement 015
/implement "User Login System"    # By task name
/implement 007-user-auth          # By feature (lists tasks for selection)

# The orchestrator:
# 1. Resolves identifier to task worktree
# 2. Spawns worker Claude instances in a loop
# 3. Workers read task.json and journal.md for context
# 4. Each worker completes objectives until:
#    - FINISH: All objectives complete
#    - BLOCKED: Human decision needed
#    - TIMEOUT: Max time exceeded (default 60 min)
#    - MAX_CYCLES: Max spawns reached (default 10)
```

**When a worker gets BLOCKED:**

```bash
# 1. Worker exits with BLOCKED status
# 2. Blocker is documented in journal.md
# 3. User runs /resolve from task worktree:

cd task-system/tasks/016
/resolve

# 4. /resolve analyzes the blocker
# 5. Proposes solutions with pros/cons
# 6. Human approves a resolution
# 7. Resolution appended to journal.md
# 8. Resume with /implement to continue
```

**Identifier Resolution Priority:**

1. **Task ID** - Direct lookup (e.g., "015", "15", "0015")
2. **Task Name** - Search task.json meta.title (case-insensitive, partial match)
3. **Feature Name** - Lists associated tasks for selection (e.g., "007-user-auth")

## Critical Execution Rules

### Autonomous Execution

Tasks are executed autonomously using the `/implement` command. The orchestrator spawns worker Claude instances that:

1. Read task.json for objectives and current status
2. Complete objectives incrementally
3. Document progress in journal.md
4. Exit with status: FINISH (all done), BLOCKED (needs human decision), or TIMEOUT

When a worker gets BLOCKED, use `/resolve` to analyze and provide a resolution, then continue with `/implement`.

### Non-Negotiable Rules

- **Test-Driven Development**: Tests must be written before implementation
- **No Test Modification**: After tests are written, they can only be changed with explicit user approval
- **Continuous Journaling**: Document decisions and insights in journal.md throughout execution
- **Commit Discipline**: Commit and push at logical milestones
- **ADR Documentation**: Create ADRs for all significant architectural decisions

### Git Commit Format

```bash
# Phase-based commits (feature task example)
git commit -m "test(task-XXX): add comprehensive test suite for [feature]"
git commit -m "feat(task-XXX): implement core [component] functionality"
git commit -m "refactor(task-XXX): improve [specific improvement]"
git commit -m "docs(task-XXX): final verification and polish"

# Always commit and push together
git add . && git commit -m "..." && git push
```

## Key Patterns

### Feature to Task Traceability

Tasks link back to features for full context:

```markdown
# In task-system/task-015/task.md (inside worktree)

## Feature Context
**Feature**: [001-user-authentication](../features/001-user-authentication/feature.md)
**Technical Plan**: [plan.md](../features/001-user-authentication/plan.md)
**ADRs**: [adr/](../features/001-user-authentication/adr/)

## Overview
[Task-specific implementation details...]
```

### Task Dependencies

- Tasks list dependencies by ID in their `task.md` file
- Dependencies are advisory (documented but not strictly enforced)
- Git naturally handles conflicts if work proceeds out of order
- Check dependency status via PR state (merged = complete)

### Parallel Execution

- Use git worktrees for concurrent task development
- Each task has its own worktree in `task-system/tasks/NNN/`
- Safe operations: commit, push, test in different worktrees concurrently
- Requires coordination: merging PRs (one at a time)
- Tasks can be worked on from different machines (use `resume task`)

## Architecture Decision Records (ADRs)

### When to Create ADRs

Create an ADR whenever you need to:
- Choose between multiple technical approaches
- Make decisions that will impact future development
- Document the reasoning behind architectural choices
- Record trade-offs and their implications

### ADR Locations

- **Global ADRs** (`task-system/adrs/`): Project-wide architectural decisions
- **Feature ADRs** (`task-system/features/NNN-name/adr/`): Feature-specific technical choices

### ADR Template Structure

```markdown
# ADR NNN: [Title]

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Date:** YYYY-MM-DD
**Context:** Feature/Project wide

## Problem Statement
What decision needs to be made and why?

## Considered Options
1. Option A - [pros/cons]
2. Option B - [pros/cons]

## Decision
Chosen: [Option] because [reasoning]

## Consequences
Positive: [benefits]
Negative: [tradeoffs]
```

## Task File Structure

### task.json (New Format)

Tasks now use `task.json` for structured, machine-readable task definitions:

```json
{
  "meta": {
    "id": "015",
    "title": "User Login System",
    "created": "2026-01-08",
    "feature": "007"  // Optional: links to feature
  },
  "overview": "Context from feature definition and technical plan...",
  "objectives": [
    {
      "id": "obj-1",
      "description": "Create login endpoint with JWT authentication",
      "steps": ["Define route", "Add controller", "Connect auth service"],
      "notes": ["Use existing auth patterns"],
      "status": "pending"  // pending | in_progress | done
    }
  ]
}
```

**Benefits of task.json:**
- Machine-readable for autonomous orchestration
- Structured objectives with trackable status
- Clear separation of metadata and implementation details
- Enables `/implement` command to work autonomously

### task.md (Legacy Format)

Older tasks may still use `task.md` format with markdown structure:

- **Feature Context**: Links to feature definition and plan
- **Overview**: What needs to be accomplished and why
- **Task Type**: feature|refactor|bugfix|performance|deployment
- **Priority**: P1 (critical) → P3 (low)
- **Dependencies**: Links to prerequisite tasks (advisory)
- **Objectives**: Measurable checkboxes
- **Sub-tasks**: Specific actionable items
- **Technical Approach**: Implementation strategy
- **Risks & Concerns**: Potential issues and mitigation
- **Resources & Links**: Relevant documentation
- **Acceptance Criteria**: Testable success conditions

## Journaling

Workers document their progress in `journal.md` within each task folder. Journal entries capture:
- Objectives completed and their outcomes
- Blockers encountered and resolutions
- Technical decisions and their reasoning
- Key learnings and insights

## Important Notes

- **Separation of Concerns**: Feature definition (WHAT) → Planning (HOW) → Execution (DO) are distinct phases
- **Human-Guided Development**: Every phase requires human review and approval
- **Focus on Value**: Features describe user value, not implementation details
- **Document Decisions**: Use ADRs to capture architectural reasoning
- **Maintain Traceability**: Tasks link to features, features link to ADRs
- **Keep Complexity Minimal**: Only add what's directly needed
- **Dynamic Status**: No TASK-LIST.md - status derived from filesystem and git state
- **Task Archiving**: Completed tasks are archived to `task-system/archive/` before PR merge (as part of task-merge)
- **Autonomous Execution**: Use `/implement` for autonomous task execution, `/resolve` when blocked

## Migration Notes

### Migrating from task.md to task.json

The task system now supports autonomous implementation via `/implement`, which requires the structured `task.json` format.

**What Changed:**

| Aspect | Old (task.md) | New (task.json) |
|--------|---------------|-----------------|
| Format | Markdown with sections | JSON with structured schema |
| Objectives | Checkbox list in markdown | Array with id, description, steps, status |
| Execution | Phase-based with manual permission gates | Objective-based with autonomous progression |
| Human input | Required for each phase transition | Only required when worker is BLOCKED |
| Status tracking | Implicit via journal entries | Explicit status field per objective |

**Migrating Existing Tasks:**

1. **Tasks in progress**: Continue using manual workflow with task.md - no migration needed
2. **New tasks**: Will automatically use task.json format
3. **Optional conversion**: To use `/implement` on existing task.md tasks:

```bash
# 1. Create task.json in the task folder alongside task.md
# 2. Convert content to JSON structure:
{
  "meta": {
    "id": "[from task folder name]",
    "title": "[from task.md title]",
    "created": "[today's date]",
    "feature": "[if linked to feature]"
  },
  "overview": "[combine Feature Context + Overview sections]",
  "objectives": [
    {
      "id": "obj-1",
      "description": "[from Objectives section]",
      "steps": ["[from Sub-tasks section]"],
      "notes": ["[from Technical Approach]"],
      "status": "pending"
    }
  ]
}
# 3. Mark completed objectives as "done"
# 4. Use /implement to continue
```

**Compatibility:**

- `/implement` requires `task.json` to be present
- The `/resolve` command works with task.json (uses journal.md for context)
- Legacy `task.md` files are preserved in archives for historical reference
