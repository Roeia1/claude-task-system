# Task 019: Modify task-builder to generate task.json

## Feature Context

**Feature**: [007-task-implementation-orchestration](../features/007-task-implementation-orchestration/feature.md)
**Technical Plan**: [plan.md](../features/007-task-implementation-orchestration/plan.md)
**Feature Tasks**: [tasks.md](../features/007-task-implementation-orchestration/tasks.md)

## Overview

Update the task-builder agent to generate `task.json` instead of `task.md` for the new autonomous task execution system. The task builder must distill all context from feature.md, plan.md, and relevant ADRs into a self-contained task.json file so that worker agents can execute tasks without needing to read the source feature files.

This is a critical enabler for the orchestration system - workers receive compact, machine-readable task definitions with all necessary context pre-distilled, enabling autonomous execution.

## Task Type

feature

## Priority

P1 - This is a foundational requirement for the new orchestration system. Without task.json generation, the `/implement` command and worker spawning cannot function.

## Dependencies

- [014](../014/task.md) (Create task.json schema and templates): Provides the task.json schema and template that this task will use for generation

## Objectives

- [ ] Update task-builder agent to generate task.json instead of task.md
- [ ] Create context distillation logic that extracts and condenses feature/plan/ADR content into overview
- [ ] Generate properly structured objectives from plan.md technical approach sections
- [ ] Ensure generated task.json is self-contained (worker never reads source feature files)
- [ ] Update all files that reference task.md to use task.json where appropriate

## Sub-tasks

1. [ ] Read and understand the task.json schema from task 014's output (1-2 hours)
2. [ ] Modify `plugin/agents/task-builder.md` to output task.json instead of task.md (2-3 hours)
3. [ ] Update `plugin/skills/task-builder/SKILL.md` to reflect the new task.json generation process (1-2 hours)
4. [ ] Create content generation logic that distills feature.md requirements into the `overview` field (2-3 hours)
5. [ ] Create objective extraction logic that converts plan.md technical steps into structured objectives (2-3 hours)
6. [ ] Update `plugin/instructions/task-builder/templates/` to include task.json template (1 hour)
7. [ ] Update `plugin/instructions/task-builder/step-instructions/02-content-gen.md` for task.json generation (1-2 hours)
8. [ ] Search for and update all references to task.md in the codebase that should point to task.json (1-2 hours)
9. [ ] Test task.json generation with a sample feature/plan combination (1 hour)

## Technical Approach

### Files to Create/Modify

- `plugin/agents/task-builder.md` - Update agent instructions to generate task.json
- `plugin/skills/task-builder/SKILL.md` - Update skill description for task.json output
- `plugin/instructions/task-builder/step-instructions/02-content-gen.md` - Modify content generation step
- `plugin/instructions/task-builder/templates/task-template.md` - Replace with task-template.json or update for JSON
- `CLAUDE.md` - Update any references to task.md format

### Implementation Steps

1. **Understand task.json schema structure**
   - Review the schema created in task 014
   - Understand meta, overview, and objectives fields
   - Note the flexible objective structure (description required, steps/notes optional)

2. **Modify task-builder agent**
   - Change output format from markdown to JSON
   - Update the content generation process to produce structured data
   - Implement distillation logic that condenses feature/plan content

3. **Create distillation logic**
   - Extract key requirements from feature.md (user stories, acceptance criteria)
   - Extract technical approach from plan.md (relevant sections based on task_scope)
   - Combine into a coherent overview that gives workers full context
   - Ensure no references to source files (self-contained)

4. **Create objective generation logic**
   - Parse plan.md technical approach sections
   - Convert implementation steps into discrete objectives
   - Add appropriate steps/notes based on objective complexity
   - Set initial status to "pending" for all objectives

5. **Update related files**
   - Change template references from task.md to task.json
   - Update step instructions for JSON generation
   - Search codebase for task.md references and update where appropriate

### Data Models

**task.json structure (from feature.md):**
```json
{
  "meta": {
    "id": "string (task ID, e.g., '019')",
    "title": "string (human-readable task title)",
    "type": "enum: feature | bugfix | refactor | performance | deployment",
    "priority": "enum: P1 | P2 | P3",
    "created": "string (ISO date: YYYY-MM-DD)",
    "feature": "string (optional: feature ID, e.g., '007')"
  },
  "overview": "string (distilled context from feature/plan/ADRs)",
  "objectives": [
    {
      "id": "string (unique within task, e.g., 'obj-1')",
      "description": "string (required: what needs to be done)",
      "steps": ["string (optional: ordered implementation steps)"],
      "notes": ["string (optional: hints, constraints, context)"],
      "status": "enum: pending | in_progress | blocked | done"
    }
  ]
}
```

### Testing Strategy

- **Unit Tests**: Validate JSON schema compliance of generated task.json files
- **Integration Tests**: Generate task.json from real feature/plan files and verify completeness
- **Edge Cases**:
  - Features with no ADRs
  - Features with multiple ADRs
  - Tasks with many dependencies
  - Tasks with different types (feature, bugfix, refactor, etc.)

### Edge Cases to Handle

- **Empty ADR paths**: Handle gracefully when no ADRs are provided
- **Large plan sections**: Condense without losing critical information
- **Multiple task_scope sections**: Combine context from multiple plan sections
- **Special characters in content**: Properly escape for JSON output
- **Long descriptions**: Ensure overview remains digestible while complete

## Risks & Concerns

- **Context loss in distillation**: Risk of losing important nuances when condensing feature/plan content. Mitigation: Review generated task.json during task generation for accuracy.
- **Breaking existing workflows**: Changing from task.md to task.json may break existing task-start workflows. Mitigation: Update all dependent files and test end-to-end.
- **Objective granularity**: Risk of objectives being too coarse or too fine. Mitigation: Follow plan.md structure closely and validate during generation.

## Resources & Links

- [Feature 007 Definition](../features/007-task-implementation-orchestration/feature.md)
- [Feature 007 Technical Plan](../features/007-task-implementation-orchestration/plan.md)
- [Task 014 - task.json schema](../014/task.md) (dependency)

## Acceptance Criteria

- Task builder generates valid task.json files that conform to the schema
- Generated task.json contains a comprehensive overview distilled from feature/plan/ADRs
- Objectives are properly structured with description, optional steps/notes, and status
- Workers can execute tasks using only task.json without referencing source feature files
- All codebase references to task.md are updated to task.json where appropriate
- Existing task-builder functionality (git setup, PR creation) remains intact
