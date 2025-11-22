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
   - Continuous journaling documents decisions and learnings

### Directory Structure

```
docs/                           # Project-wide documentation
├── coding-standards.md        # Coding conventions and style
├── architecture-principles.md # System design rules
├── quality-gates.md           # Testing and review requirements
├── tech-stack.md              # Approved technologies
└── adr/                       # Global architecture decisions
    ├── 000-adr-process.md     # ADR guidelines
    └── NNN-decision-title.md  # Individual ADRs

planning/                       # 📋 PLANNING PHASE
├── templates/                  # Planning artifact templates
│   ├── feature-template.md
│   ├── plan-template.md
│   ├── task-breakdown-template.md
│   └── adr-template.md
└── features/                   # Feature directories
    ├── 001-feature-name/
    │   ├── feature.md         # What to build (requirements)
    │   ├── plan.md            # How to build (technical design)
    │   ├── tasks.md           # AI-generated task breakdown
    │   └── adr/               # Feature-specific ADRs
    │       └── NNN-decision.md
    └── 002-another-feature/
        └── ...

execution/                      # ⚡ EXECUTION PHASE
├── templates/                  # Execution artifact templates
│   ├── TASK-TEMPLATE.md
│   └── task-types/             # Type-specific workflows
│       ├── feature.md
│       ├── bugfix.md
│       ├── refactor.md
│       ├── performance.md
│       └── deployment.md
├── TASK-LIST.md               # Single source of truth for all tasks
├── TASK-WORKFLOW.md           # 8-phase execution discipline
├── PARALLEL-WORKFLOW-GUIDE.md # Concurrent task execution guide
└── tasks/###/                 # Individual task directories
    ├── task.md                # Task definition and requirements
    └── journal.md             # Execution log and decisions

.claude/commands/               # Slash commands
├── init-docs.md               # Initialize documentation structure
├── define-feature.md          # Create feature definition
├── plan-feature.md            # Technical planning
├── generate-tasks.md          # Task breakdown
├── adr.md                     # Architecture decision records
├── start-task.md              # Begin task execution
├── complete-task.md           # Finalize and merge task
├── parallel-start-task.md     # Start concurrent task
├── parallel-finalize-task.md  # Complete parallel task
├── parallel-cleanup-worktree.md # Cleanup parallel task
└── worktree-maintenance.md    # Worktree management
```

## Development Commands

### Initial Setup (Run Once)

```bash
/project:init-docs
# Creates docs/ structure with template files:
# - coding-standards.md, architecture-principles.md, quality-gates.md, tech-stack.md
# - adr/000-adr-process.md
# Interactive questionnaire populates initial content
```

### Feature Planning Workflow

```bash
# 1. Define the feature (what to build)
/project:define-feature "user authentication system"
# Creates: planning/features/001-user-authentication/feature.md
# Output: User stories, requirements, acceptance criteria
# AI assists with clarifications for ambiguities

# 2. Create technical plan (how to build)
/project:plan-feature
# Reads: planning/features/001-user-authentication/feature.md
# Creates: planning/features/001-user-authentication/plan.md
# Output: Architecture, tech choices, data models, API contracts, testing strategy
# Requires human review and approval

# 3. Generate tasks from plan
/project:generate-tasks
# Reads: feature.md and plan.md
# AI proposes task breakdown
# Shows tasks for review/modification
# After approval:
#   - Creates: planning/features/001-user-authentication/tasks.md (reference)
#   - Creates: execution/tasks/015/ through execution/tasks/022/
#   - Updates: execution/TASK-LIST.md (PENDING section)
```

### Architecture Decision Records

```bash
# Create ADR (context-aware)
/project:adr "choice of JWT vs session-based auth"

# If in feature directory → creates planning/features/001-auth/adr/001-jwt-choice.md
# If in repo root → creates docs/adr/NNN-decision.md
# Uses standard ADR template with problem/options/decision/consequences
```

### Task Execution Workflow

```bash
# Regular execution (main repository)
/project:start-task [ID]        # Begin task with ID or choose from menu
/project:complete-task          # Merge PR and finalize

# Parallel execution (git worktrees)
/project:parallel-start-task [ID]
# Work in: worktrees/task-###-type/
/project:parallel-finalize-task [ID]        # From worktree: merge PR
/project:parallel-cleanup-worktree [ID]     # From main repo: cleanup

# Worktree maintenance
/project:worktree-maintenance   # Clean up stale worktrees
```

## Critical Execution Rules

### 8-Phase Workflow Discipline

Each task follows this sequence (defined in `execution/TASK-WORKFLOW.md`):

1. **Phase 1: Task Analysis**
   - Read task file and linked feature documentation
   - Verify dependencies are COMPLETED
   - Document understanding in journal
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
   - Update journal with decisions

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
   - Run `/project:complete-task` or parallel completion commands
   - Automated PR merge and cleanup

### Non-Negotiable Rules

- **Test-Driven Development**: Tests must be written in Phase 3, before implementation
- **Phase Progression**: Each phase requires explicit user permission to proceed
- **No Test Modification**: After Phase 3, tests can only be changed with explicit user approval
- **Continuous Journaling**: Update `journal.md` throughout with decisions and insights
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

Each task type follows a specialized workflow (in `execution/templates/task-types/`):

- **feature**: New functionality or capabilities
- **bugfix**: Error corrections and fixes
- **refactor**: Code improvements without behavior changes
- **performance**: Optimization and efficiency improvements
- **deployment**: Infrastructure and deployment tasks

## Key Patterns

### Feature to Task Traceability

Tasks link back to features for full context:

```markdown
# In execution/tasks/015/task.md

## Feature Context
**Feature**: [001-user-authentication](../../../planning/features/001-user-authentication/feature.md)
**Technical Plan**: [plan.md](../../../planning/features/001-user-authentication/plan.md)
**ADRs**: [adr/](../../../planning/features/001-user-authentication/adr/)

## Overview
[Task-specific implementation details...]
```

### Task List Format

`execution/TASK-LIST.md` structure:

```markdown
## IN_PROGRESS
021 | P1 | deployment | Task Title | Description [worktree: path]

## PENDING
001 | P1 | feature | Task Title | Description

## COMPLETED
- ✅ Task description [type]
```

### Task Dependencies

- Tasks list dependencies by ID in their `task.md` file
- Dependencies must be in COMPLETED status before starting
- The system validates dependencies at task start

### Parallel Execution

- Use git worktrees for concurrent task development
- Each worktree has independent working directory
- TASK-LIST.md tracks worktree locations with `[worktree: path]` marker
- Safe operations: commit, push, test in different worktrees concurrently
- Requires coordination: merging PRs (one at a time)

## Architecture Decision Records (ADRs)

### When to Create ADRs

Create an ADR whenever you need to:
- Choose between multiple technical approaches
- Make decisions that will impact future development
- Document the reasoning behind architectural choices
- Record trade-offs and their implications

### ADR Locations

- **Global ADRs** (`docs/adr/`): Project-wide architectural decisions
- **Feature ADRs** (`planning/features/NNN-name/adr/`): Feature-specific technical choices

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

Each task in `execution/tasks/###/task.md` contains:

- **Feature Context**: Links to feature definition and plan
- **Overview**: What needs to be accomplished and why
- **Task Type**: feature|refactor|bugfix|performance|deployment
- **Priority**: P1 (critical) → P3 (low)
- **Dependencies**: Links to prerequisite tasks
- **Objectives**: Measurable checkboxes
- **Sub-tasks**: Specific actionable items
- **Technical Approach**: Implementation strategy
- **Risks & Concerns**: Potential issues and mitigation
- **Resources & Links**: Relevant documentation
- **Acceptance Criteria**: Testable success conditions

## Journal Guidelines

Update `execution/tasks/###/journal.md` with:

- Phase transitions and status updates
- Design decisions and rationale (link to ADRs)
- Implementation challenges and solutions
- Test strategy and coverage
- Refactoring improvements
- Key insights and learnings

Entry format:
```markdown
### [Timestamp] - [Phase/Activity]

[Content describing decisions, insights]
**Next:** [What you plan to do next]
```

## PR Review Protocol

When user signals review ("I made a review", "Check PR comments"):

1. Immediately pause current phase
2. Read PR comments using GitHub CLI
3. For each comment:
   - Clear instruction → Apply changes, commit with reference, resolve
   - Ambiguous → Reply with questions, leave unresolved
4. Document changes in journal
5. Use format: `fix(task-XXX): address PR feedback - [description] (resolves comment #N)`

## Documentation Files

### docs/coding-standards.md
Project-wide coding conventions, naming patterns, file organization, and code style rules.

### docs/architecture-principles.md
System design rules like API-first, microservices patterns, event-driven architecture, etc.

### docs/quality-gates.md
Testing requirements, coverage thresholds, review processes, and quality standards.

### docs/tech-stack.md
Approved technologies, framework versions, library choices, and technology constraints.

## Important Notes

- **Separation of Concerns**: Feature definition (WHAT) → Planning (HOW) → Execution (DO) are distinct phases
- **Human-Guided Development**: Every phase requires human review and approval
- **Focus on Value**: Features describe user value, not implementation details
- **Document Decisions**: Use ADRs to capture architectural reasoning
- **Maintain Traceability**: Tasks link to features, features link to ADRs
- **Keep Complexity Minimal**: Only add what's directly needed
- **Trust the Discipline**: The 8-phase workflow prevents costly mistakes