---
name: task-generation
description: "ONLY activate on DIRECT user request to generate tasks. User must explicitly mention keywords: 'generate tasks', 'break down feature', 'create tasks'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to generate tasks."
---

# Task Generation Skill

When activated, generate executable tasks from feature planning artifacts.

## File Locations

- **Task Breakdown Template**: Read from plugin's `templates/planning/task-breakdown-template.md`
- **Task Template**: Read from plugin's `templates/execution/task-template.md`
- **Input**: `task-system/features/NNN-slug/feature.md` and `plan.md`
- **Output (Reference)**: `task-system/features/NNN-slug/tasks.md`
- **Output (Actual Tasks)**: `task-system/tasks/NNN/task.md`
- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Full Workflow**: Plugin's `commands/generate-tasks.md`

## Prerequisites

1. Feature directory must exist with both `feature.md` and `plan.md`
2. Tasks not already generated (or user confirms regeneration)

## Process

1. **Detect and validate feature** (current directory or prompt for selection)
2. **Read planning artifacts**:
   - `feature.md` for user stories, acceptance criteria, requirements
   - `plan.md` for implementation phases, technology choices, data models, APIs
3. **Read templates** from plugin:
   - `templates/planning/task-breakdown-template.md` for structure
   - `templates/execution/task-template.md` for individual tasks
4. **AI-generated task breakdown**:
   - Identify distinct work units from plan
   - Determine dependencies between units
   - Assess which tasks can be parallelized
   - Map tasks to file changes
   - Organize into phases (Setup -> Core -> Integration -> Polish)
5. **Show proposed tasks** with:
   - Task ID, title, type, priority
   - Dependencies
   - Files affected
   - Parallelizable markers
6. **Interactive editing** (merge/split/reorder as needed)
7. **After approval**:
   - Determine next task IDs from `task-system/tasks/TASK-LIST.md`
   - Create task directories: `task-system/tasks/NNN/`
   - Generate `task.md` files with full context (links to feature, plan, ADRs)
   - Add tasks to `task-system/tasks/TASK-LIST.md` (PENDING section)
   - Create reference `tasks.md` in feature directory

## Task Generation Principles

- **One task per logical unit** of work (1-2 days max)
- **Clear dependencies** with proper sequencing
- **Parallelization analysis** (mark tasks that can run concurrently)
- **Full traceability** (every task links back to feature/plan/ADRs)
- **Specific acceptance criteria** for each task

## Task Structure

Each generated task includes:
- Feature Context (links to feature.md, plan.md, ADRs)
- Overview and motivation
- Task Type (feature/refactor/bugfix/performance/deployment)
- Priority (P1/P2/P3)
- Dependencies
- Objectives (measurable checkboxes)
- Sub-tasks (actionable items)
- Technical Approach
- Risks & Concerns
- Acceptance Criteria

## Next Steps

After task generation, suggest using the **task-start** skill to begin execution.

## References

- Complete workflow details: Plugin's `commands/generate-tasks.md`
- Task template: Plugin's `templates/execution/task-template.md`
- Task breakdown template: Plugin's `templates/planning/task-breakdown-template.md`
- Task list format: `task-system/tasks/TASK-LIST.md`
