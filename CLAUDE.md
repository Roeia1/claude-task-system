# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **Claude Task System** - a structured development workflow that combines human-guided feature planning with disciplined task execution. The system provides a complete lifecycle from feature ideation through planning, task breakdown, and rigorous 8-phase execution.

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

3. **Task Execution Phase (8-Phase Discipline)**
   - Task Analysis → Solution Design → Test Creation (TDD) → Implementation → Refactor → Verification → Reflection → Completion
   - Each phase requires explicit permission to proceed
   - Tests written before implementation (non-negotiable)
   - Journaling subagent documents decisions and learnings throughout

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
├── tasks/                      # Task worktrees (each is a git worktree)
│   └── NNN/                   # Task worktree with branch task-NNN-type
│       ├── task.md            # Task definition and requirements
│       └── journal.md         # Execution log (created when task starts)
├── archive/                    # Completed task archives
│   └── NNN/                   # Archived task files
│       ├── task.md            # Original task definition
│       └── journal.md         # Execution log
└── adrs/                       # Global architecture decisions
    └── NNN-decision-title.md
```

**Note**: Each `task-system/tasks/NNN/` directory is a git worktree, not a regular directory. Task status is derived dynamically from filesystem and git state.

The plugin itself lives in:

```
plugin/                         # Plugin source code
├── .claude-plugin/
│   └── plugin.json            # Plugin manifest
├── agents/                     # Subagent definitions
│   ├── journaling.md
│   └── task-analyzer.md
├── commands/                   # Slash commands
│   ├── init.md                # Initialize task-system structure
│   ├── define-feature.md      # Create feature definition
│   ├── plan-feature.md        # Technical planning
│   ├── generate-tasks.md      # Task breakdown
│   ├── adr.md                 # Architecture decision records
│   └── ...
├── skills/                     # Skills for task execution
│   ├── task-start/
│   │   ├── SKILL.md
│   │   └── workflows/         # Type-specific execution workflows
│   ├── task-list/             # Dynamic task list generation
│   ├── task-resume/           # Resume remote tasks locally
│   └── ...
└── templates/                  # Artifact templates
    ├── execution/
    │   └── task-template.md
    └── planning/
        ├── feature-template.md
        └── ...
```

### Dynamic Task Status

Task status is derived from filesystem and git state (no persistent TASK-LIST.md):

| Status | Signal |
|--------|--------|
| PENDING | Worktree exists in `task-system/tasks/NNN/`, no `journal.md` |
| IN_PROGRESS | Worktree exists, `journal.md` present |
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
/task-system:define-feature "user authentication system"
# Creates: task-system/features/001-user-authentication/feature.md
# Output: User stories, requirements, acceptance criteria
# AI assists with clarifications for ambiguities

# 2. Create technical plan (how to build)
/task-system:plan-feature
# Reads: task-system/features/001-user-authentication/feature.md
# Creates: task-system/features/001-user-authentication/plan.md
# Output: Architecture, tech choices, data models, API contracts, testing strategy
# Requires human review and approval

# 3. Generate tasks from plan
/task-system:generate-tasks
# Reads: feature.md and plan.md
# AI proposes task breakdown
# Shows tasks for review/modification
# After approval:
#   - Creates worktree + branch + PR for each task
#   - Creates: task-system/features/001-user-authentication/tasks.md (reference)
```

### Architecture Decision Records

```bash
# Create ADR (context-aware)
/task-system:adr "choice of JWT vs session-based auth"

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

### Task Execution Workflow

Tasks are created with worktree + branch + PR upfront. The workflow:

```bash
# From MAIN REPO: Navigate to task worktree
# Say "start task 015"
# -> Shows instructions to cd into task-system/tasks/015/

# From WORKTREE: Execute 8-phase workflow
# cd task-system/tasks/015
# Start Claude session
# Say "start task 015" to begin workflow

# From WORKTREE: Complete and merge
# Say "complete task" to merge PR and finalize

# From MAIN REPO: Cleanup worktree after completion
# Say "cleanup worktree for task 015"
```

## Critical Execution Rules

### 8-Phase Workflow Discipline

Each task follows this sequence (defined in type-specific workflows in `plugin/skills/task-start/workflows/`):

1. **Phase 1: Task Analysis**
   - Read task file and linked feature documentation
   - Check dependencies (advisory - warn if not merged)
   - Invoke journaling subagent to document analysis
   - Commit initial analysis

2. **Phase 2: Solution Design**
   - Review feature plan and ADRs
   - Document technical approach
   - Consider risks and tradeoffs
   - Create ADRs for architectural decisions
   - Commit design documentation

3. **Phase 3: Test Creation (TDD)**
   - Write tests for expected behavior
   - NO implementation code during this phase
   - Verify all tests fail as expected
   - Commit test suite

4. **Phase 4: Implementation**
   - Implement to pass tests
   - NEVER modify tests without user permission
   - Create ADRs for implementation decisions
   - Commit logical milestones frequently
   - Invoke journaling subagent to document decisions and challenges

5. **Phase 5: Refactor**
   - Improve code quality
   - Ensure tests still pass
   - Commit refactoring changes

6. **Phase 6: Verification & Polish**
   - Verify acceptance criteria from feature
   - Run quality checks (per quality-gates.md)
   - Mark PR ready for review
   - Request user approval

7. **Phase 7: Reflection**
   - Update task file with learnings
   - Document key decisions
   - Summarize accomplishments

8. **Phase 8: Completion**
   - Say "complete task" from worktree to activate task-completion skill
   - Automated PR merge
   - Cleanup worktree from main repo afterward

### Non-Negotiable Rules

- **Test-Driven Development**: Tests must be written in Phase 3, before implementation
- **Phase Progression**: Each phase requires explicit user permission to proceed
- **No Test Modification**: After Phase 3, tests can only be changed with explicit user approval
- **Continuous Journaling**: Invoke journaling subagent throughout to document decisions and insights
- **Commit Discipline**: Commit and push at the end of each phase and at logical milestones
- **Sequential Execution**: Complete phases in order, no skipping
- **ADR Documentation**: Create ADRs for all significant architectural decisions

### Git Commit Format

```bash
# Phase-based commits
git commit -m "docs(task-XXX): initial task analysis and journal setup"
git commit -m "docs(task-XXX): complete solution design and architecture"
git commit -m "test(task-XXX): add comprehensive test suite for [feature]"
git commit -m "feat(task-XXX): implement core [component] functionality"
git commit -m "refactor(task-XXX): improve [specific improvement]"
git commit -m "docs(task-XXX): final verification and polish"

# Always commit and push together
git add . && git commit -m "..." && git push
```

### Task Types and Workflows

Each task type follows a specialized workflow (in `plugin/skills/task-start/workflows/`):

- **feature**: New functionality or capabilities
- **bugfix**: Error corrections and fixes
- **refactor**: Code improvements without behavior changes
- **performance**: Optimization and efficiency improvements
- **deployment**: Infrastructure and deployment tasks

## Key Patterns

### Feature to Task Traceability

Tasks link back to features for full context:

```markdown
# In task-system/tasks/015/task.md

## Feature Context
**Feature**: [001-user-authentication](../../features/001-user-authentication/feature.md)
**Technical Plan**: [plan.md](../../features/001-user-authentication/plan.md)
**ADRs**: [adr/](../../features/001-user-authentication/adr/)

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

Each task in `task-system/tasks/###/task.md` contains:

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

## Journaling with Subagent

All journaling is handled through the **journaling subagent** (`plugin/agents/journaling.md`), which validates content quality, formats entries consistently, and maintains journal structure.

**Complete journaling guidance**: See [Journaling Guidelines](plugin/skills/task-start/journaling-guidelines.md) for:
- When to invoke the journaling subagent
- What content to prepare
- How to invoke with proper parameters
- Quality standards and examples

## PR Review Protocol

When user signals review ("I made a review", "Check PR comments"):

1. Immediately pause current phase
2. Read PR comments using GitHub CLI
3. For each comment:
   - Clear instruction → Apply changes, commit with reference, resolve
   - Ambiguous → Reply with questions, leave unresolved
4. Invoke journaling subagent to document PR response
5. Use format: `fix(task-XXX): address PR feedback - [description] (resolves comment #N)`

## Important Notes

- **Separation of Concerns**: Feature definition (WHAT) → Planning (HOW) → Execution (DO) are distinct phases
- **Human-Guided Development**: Every phase requires human review and approval
- **Focus on Value**: Features describe user value, not implementation details
- **Document Decisions**: Use ADRs to capture architectural reasoning
- **Maintain Traceability**: Tasks link to features, features link to ADRs
- **Keep Complexity Minimal**: Only add what's directly needed
- **Trust the Discipline**: The 8-phase workflow prevents costly mistakes
- **Dynamic Status**: No TASK-LIST.md - status derived from filesystem and git state
- **Task Archiving**: Completed tasks are automatically archived to `task-system/archive/` during worktree cleanup
