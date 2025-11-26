# Plan: Convert Claude Task System to Claude Code Plugin (Simplified)

## Overview

Transform the Claude Task System into a Claude Code plugin with clear separation:
- **User artifacts** (`task-system/` at project root) - trackable in SCM
- **Plugin artifacts** (`plugin/`) - the plugin itself, installed separately

No configuration file needed - paths are fixed and simple.

---

## 1. Artifact Separation

### User's Repository (SCM-trackable)
```
project-root/
└── task-system/                    # All user artifacts here (flat structure)
    ├── features/
    │   └── NNN-feature-name/
    │       ├── feature.md
    │       ├── plan.md
    │       ├── tasks.md
    │       └── adr/                # Feature-specific ADRs
    ├── tasks/
    │   ├── TASK-LIST.md
    │   └── NNN/
    │       ├── task.md
    │       └── journal.md
    ├── adrs/                       # Project-wide ADRs
    └── worktrees/                  # Parallel task execution
```

### Plugin (Installed Separately)
```
plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/                       # 10 slash commands
├── skills/                         # 12 skills (no config-loader)
├── agents/                         # 2 agents
├── templates/                      # Read-only templates
└── workflows/                      # Workflows + protocols (reorganized)
```

---

## 2. Plugin Directory Structure

```
plugin/
├── .claude-plugin/
│   └── plugin.json
│
├── commands/
│   ├── init.md                        # NEW: initialize-task-system
│   ├── define-feature.md
│   ├── plan-feature.md
│   ├── generate-tasks.md
│   ├── adr.md
│   ├── new-task.md
│   ├── start-task.md
│   ├── complete-task.md
│   ├── parallel-start-task.md
│   ├── parallel-finalize-task.md
│   └── worktree-maintenance.md
│
├── skills/
│   ├── feature-definition/SKILL.md
│   ├── feature-planning/SKILL.md
│   ├── task-generation/SKILL.md
│   ├── task-creation/SKILL.md
│   ├── task-start/SKILL.md
│   ├── task-completion/SKILL.md
│   ├── architecture-decisions/SKILL.md
│   ├── parallel-task-start/SKILL.md
│   ├── parallel-task-finalization/SKILL.md
│   ├── worktree-cleanup/SKILL.md
│   ├── worktree-maintenance/SKILL.md
│   └── journal-entry/
│       ├── SKILL.md
│       ├── journal-creation.md
│       └── journal-guidelines.md      # Moved here (used by this skill)
│
├── agents/
│   ├── journaling.md
│   └── task-analyzer.md
│
├── templates/
│   ├── planning/
│   │   ├── feature-template.md
│   │   ├── plan-template.md
│   │   ├── task-breakdown-template.md
│   │   └── adr-template.md
│   └── execution/
│       ├── task-template.md
│       └── journal-template.md
│
└── workflows/
    ├── README.md
    ├── feature-workflow.md
    ├── bugfix-workflow.md
    ├── refactor-workflow.md
    ├── performance-workflow.md
    ├── deployment-workflow.md
    ├── pr-review-protocol.md          # Moved here (used by workflows)
    ├── test-modification-protocol.md  # Moved here (used by workflows)
    ├── completion-protocol.md         # Moved here (used by workflows)
    ├── verification-checklist.md      # Moved here (used by workflows)
    └── phase-transition-rules.md      # Moved here (used by workflows)
```

---

## 3. Shared File Reorganization

Based on usage analysis:

| File | Current Location | New Location | Reason |
|------|-----------------|--------------|--------|
| `journal-guidelines.md` | `execution/shared/` | `skills/journal-entry/` | Referenced by journal-entry skill |
| `pr-review-protocol.md` | `execution/shared/` | `workflows/` | Referenced only by workflows |
| `test-modification-protocol.md` | `execution/shared/` | `workflows/` | Referenced only by workflows |
| `completion-protocol.md` | `execution/shared/` | `workflows/` | Referenced only by workflows |
| `verification-checklist.md` | `execution/shared/` | `workflows/` | Referenced only by workflows |
| `phase-transition-rules.md` | `execution/shared/` | `workflows/` | Referenced only by workflows |

---

## 4. Path Convention

All commands, skills, and agents use a fixed flat path convention:

```
task-system/features/       # Feature definitions (with nested adr/ per feature)
task-system/tasks/          # Task files, journals, and TASK-LIST.md
task-system/adrs/           # Project-wide ADRs
task-system/worktrees/      # Parallel execution
```

**No configuration file** - these paths are hardcoded in the plugin. Users who want artifacts tracked in SCM simply ensure `task-system/` is not in `.gitignore`.

---

## 5. Template Path Updates

Templates use the fixed flat `task-system/` structure:

**Example in task-template.md:**
```markdown
## Feature Context

**Feature**: [NNN-feature-name](../features/NNN-feature-name/feature.md)
**Technical Plan**: [plan.md](../features/NNN-feature-name/plan.md)
```

Relative paths are simpler with the flat structure (tasks and features are siblings).

---

## 6. Complete Path Mapping

When migrating files, replace ALL occurrences of these paths:

| Old Path | New Path |
|----------|----------|
| `planning/features/` | `task-system/features/` |
| `planning/templates/` | (read from plugin's `templates/planning/`) |
| `execution/tasks/` | `task-system/tasks/` |
| `execution/TASK-LIST.md` | `task-system/tasks/TASK-LIST.md` |
| `execution/templates/` | (read from plugin's `templates/execution/`) |
| `execution/workflows/` | (read from plugin's `workflows/`) |
| `execution/shared/` | (read from plugin's `workflows/` or `skills/journal-entry/`) |
| `docs/adr/` | `task-system/adrs/` |
| `worktrees/` | `task-system/worktrees/` |

**Relative path updates in templates:**
| Old Relative Path | New Relative Path |
|-------------------|-------------------|
| `../../planning/features/NNN/` | `../features/NNN/` |
| `../../features/NNN/` | `../features/NNN/` |
| `../shared/` | (now in same `workflows/` folder or reference plugin path) |

---

## 7. Source Files Inventory

### Commands to Migrate (10 files)
```
.claude/commands/define-feature.md      → plugin/commands/define-feature.md
.claude/commands/plan-feature.md        → plugin/commands/plan-feature.md
.claude/commands/generate-tasks.md      → plugin/commands/generate-tasks.md
.claude/commands/adr.md                 → plugin/commands/adr.md
.claude/commands/new-task.md            → plugin/commands/new-task.md
.claude/commands/start-task.md          → plugin/commands/start-task.md (rename from complete-task.md)
.claude/commands/complete-task.md       → plugin/commands/complete-task.md
.claude/commands/parallel-start-task.md → plugin/commands/parallel-start-task.md
.claude/commands/parallel-finalize-task.md → plugin/commands/parallel-finalize-task.md
.claude/commands/worktree-maintenance.md → plugin/commands/worktree-maintenance.md
(NEW)                                   → plugin/commands/init.md
```

### Skills to Migrate (12 directories)
```
.claude/skills/feature-definition/      → plugin/skills/feature-definition/
.claude/skills/feature-planning/        → plugin/skills/feature-planning/
.claude/skills/task-generation/         → plugin/skills/task-generation/
.claude/skills/task-creation/           → plugin/skills/task-creation/
.claude/skills/task-start/              → plugin/skills/task-start/
.claude/skills/task-completion/         → plugin/skills/task-completion/
.claude/skills/architecture-decisions/  → plugin/skills/architecture-decisions/
.claude/skills/parallel-task-start/     → plugin/skills/parallel-task-start/
.claude/skills/parallel-task-finalization/ → plugin/skills/parallel-task-finalization/
.claude/skills/worktree-cleanup/        → plugin/skills/worktree-cleanup/
.claude/skills/worktree-maintenance/    → plugin/skills/worktree-maintenance/
.claude/skills/journal-entry/           → plugin/skills/journal-entry/
```

### Agents to Migrate (2 files)
```
.claude/agents/journaling.md            → plugin/agents/journaling.md
.claude/agents/task-analyzer.md         → plugin/agents/task-analyzer.md
```
Note: Exclude `hi-detector.md` and `hi-counter.md` (demo agents)

### Templates to Migrate (6 files)
```
planning/templates/feature-template.md       → plugin/templates/planning/feature-template.md
planning/templates/plan-template.md          → plugin/templates/planning/plan-template.md
planning/templates/task-breakdown-template.md → plugin/templates/planning/task-breakdown-template.md
planning/templates/adr-template.md           → plugin/templates/planning/adr-template.md
execution/templates/TASK-TEMPLATE.md         → plugin/templates/execution/task-template.md
execution/templates/journal-template.md      → plugin/templates/execution/journal-template.md
```

### Workflows to Migrate (6 files)
```
execution/workflows/README.md            → plugin/workflows/README.md
execution/workflows/feature-workflow.md  → plugin/workflows/feature-workflow.md
execution/workflows/bugfix-workflow.md   → plugin/workflows/bugfix-workflow.md
execution/workflows/refactor-workflow.md → plugin/workflows/refactor-workflow.md
execution/workflows/performance-workflow.md → plugin/workflows/performance-workflow.md
execution/workflows/deployment-workflow.md → plugin/workflows/deployment-workflow.md
```

### Protocols to Move (6 files)
```
execution/shared/journal-guidelines.md       → plugin/skills/journal-entry/journal-guidelines.md
execution/shared/pr-review-protocol.md       → plugin/workflows/pr-review-protocol.md
execution/shared/test-modification-protocol.md → plugin/workflows/test-modification-protocol.md
execution/shared/completion-protocol.md     → plugin/workflows/completion-protocol.md
execution/shared/verification-checklist.md  → plugin/workflows/verification-checklist.md
execution/shared/phase-transition-rules.md  → plugin/workflows/phase-transition-rules.md
```

---

## 8. Migration Steps

### Phase 1: Create Plugin Structure
```bash
mkdir -p plugin/.claude-plugin
mkdir -p plugin/commands
mkdir -p plugin/skills
mkdir -p plugin/agents
mkdir -p plugin/templates/planning
mkdir -p plugin/templates/execution
mkdir -p plugin/workflows
```

### Phase 2: Create Plugin Manifest
Create `plugin/.claude-plugin/plugin.json`:
```json
{
  "name": "claude-task-system",
  "description": "Structured development workflow with feature planning and 8-phase task execution",
  "version": "1.0.0",
  "commands": "./commands",
  "agents": "./agents",
  "skills": "./skills"
}
```

### Phase 3: Create Init Command
Create `plugin/commands/init.md`:
```markdown
---
description: Initialize the task-system directory structure in a project
---

# Initialize Task System

Creates the `task-system/` directory structure for tracking features, tasks, and ADRs.

## Process

1. Create directories:
   - `task-system/features/`
   - `task-system/tasks/`
   - `task-system/adrs/`
   - `task-system/worktrees/`

2. Create `task-system/tasks/TASK-LIST.md` with initial content:
   ```markdown
   # Task List

   ## IN_PROGRESS

   ## PENDING

   ## COMPLETED
   ```

3. Confirm to user: "Task system initialized. You can now use /task-system:define-feature to start."
```

### Phase 4: Migrate Commands
For each command file in `.claude/commands/`:
1. Copy to `plugin/commands/`
2. Search and replace all paths per the mapping table in Section 6
3. Update any references to templates to read from plugin's `templates/` folder
4. Update any references to workflows to read from plugin's `workflows/` folder

### Phase 5: Migrate Skills
For each skill directory in `.claude/skills/`:
1. Copy entire directory to `plugin/skills/`
2. Update all path references in SKILL.md and supporting files
3. For `journal-entry/`: add `journal-guidelines.md` from `execution/shared/`

### Phase 6: Migrate Agents
1. Copy `journaling.md` and `task-analyzer.md` to `plugin/agents/`
2. Update path references to use `task-system/` prefix
3. Do NOT copy demo agents (hi-detector, hi-counter)

### Phase 7: Migrate Templates
1. Copy planning templates to `plugin/templates/planning/`
2. Copy execution templates to `plugin/templates/execution/`
3. Update relative path examples in templates (e.g., `../features/` instead of `../../planning/features/`)

### Phase 8: Migrate Workflows + Protocols
1. Copy all workflow files to `plugin/workflows/`
2. Copy protocol files from `execution/shared/` to `plugin/workflows/`
3. Update internal references (protocols are now siblings, not in `../shared/`)
4. Exception: `journal-guidelines.md` goes to `plugin/skills/journal-entry/`

---

## 9. High-Impact Files

Files with the most path references to update:

| File | Approx. Path Refs | Priority |
|------|-------------------|----------|
| `.claude/skills/task-start/SKILL.md` | ~15 | High |
| `.claude/commands/generate-tasks.md` | ~12 | High |
| `.claude/skills/parallel-task-start/SKILL.md` | ~10 | High |
| All workflow files | ~8 each | Medium |
| All other commands/skills | 3-8 each | Medium |
| `execution/templates/TASK-TEMPLATE.md` | ~5 | Medium |

---

## 10. Summary

**Simplifications:**
- No configuration file - fixed paths
- Flat structure under `task-system/` (features, tasks, adrs, worktrees)
- Explicit `/task-system:init` command instead of auto-initialization
- Shared protocols consolidated into `workflows/` folder
- `journal-guidelines.md` moved into `journal-entry` skill

**Key benefits:**
- Simple, predictable flat paths
- Clear separation: plugin code vs user artifacts
- User can track `task-system/` in SCM
- No configuration complexity
- Simpler relative paths between tasks and features
