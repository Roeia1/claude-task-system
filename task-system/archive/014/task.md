# Task 014: Create task.json schema and templates

## Feature Context

**Feature**: [007-task-implementation-orchestration](../features/007-task-implementation-orchestration/feature.md)
**Technical Plan**: [plan.md](../features/007-task-implementation-orchestration/plan.md)
**ADRs**: None

## Overview

Define the task.json schema that serves as the core state machine for the autonomous task execution system. This task establishes the data structure that workers read and update during implementation, including the meta, overview, and objectives sections. Additionally, create a template for task.json generation and document the journal entry format that workers will use when writing directly to journal.md.

This is foundational work for the Task Implementation Orchestration feature - the task.json schema must be defined before the task builder can generate it, and the journal format must be documented before workers can write entries correctly.

## Task Type

feature - New data structure definitions and documentation

## Priority

P1 - Critical foundation that blocks other tasks (task builder, implementation script, and worker prompt all depend on this schema)

## Dependencies

None - This is the first task in Phase 1 with no prior dependencies.

## Objectives

- [ ] Create task.json JSON schema file with complete type definitions
- [ ] Create task.json template for task-builder agent to use when generating tasks
- [ ] Create example task.json files demonstrating different task types
- [ ] Document journal entry format with template and examples for worker agents

## Sub-tasks

1. [ ] Create JSON Schema file (`plugin/schemas/task.schema.json`) with complete type definitions for meta, overview, and objectives
2. [ ] Define objective status enum values (pending, in_progress, blocked, done) in the schema
3. [ ] Create task.json template (`plugin/instructions/task-builder/templates/task.json.template`) for task-builder
4. [ ] Create example task.json for a feature task type with multiple objectives
5. [ ] Create example task.json for a bugfix task type with simpler structure
6. [ ] Document journal entry format in a guidelines file (`plugin/instructions/orchestration/journal-format.md`)
7. [ ] Include entry timestamp, objective reference, status, what was done, commits, and notes sections in journal format
8. [ ] Validate schema examples against the JSON schema definition

## Technical Approach

### Files to Create/Modify

- `plugin/schemas/task.schema.json` - JSON Schema defining task.json structure with validation rules
- `plugin/instructions/task-builder/templates/task.json.template` - Template for task-builder to generate task.json
- `plugin/instructions/orchestration/examples/feature-task.json` - Example feature task
- `plugin/instructions/orchestration/examples/bugfix-task.json` - Example bugfix task
- `plugin/instructions/orchestration/journal-format.md` - Journal entry format documentation

### Implementation Steps

1. Create the JSON Schema file defining the complete task.json structure:
   - `meta` object with id, title, type, priority, created, feature (optional)
   - `overview` string for distilled context
   - `objectives` array with id, description, steps (optional), notes (optional), status

2. Define enums and validation constraints:
   - type: feature | bugfix | refactor | performance | deployment
   - priority: P1 | P2 | P3
   - status: pending | in_progress | blocked | done

3. Create the task.json template with placeholder syntax for task-builder substitution

4. Create two example task.json files:
   - Feature example with multiple objectives, steps, and notes
   - Bugfix example with simpler structure (description only)

5. Document journal entry format with:
   - Entry structure (timestamp, objective, status)
   - Required sections (What Was Done, Commits)
   - Optional sections (Notes)
   - Format examples for workers to follow

### Data Models

```
task.json:
  - meta: object
    - id: string (required, task ID like "015")
    - title: string (required, human-readable title)
    - type: enum (required: feature | bugfix | refactor | performance | deployment)
    - priority: enum (required: P1 | P2 | P3)
    - created: string (required, ISO date YYYY-MM-DD)
    - feature: string (optional, feature ID like "007")
  - overview: string (required, distilled context)
  - objectives: array (required, at least one)
    - id: string (required, unique within task like "obj-1")
    - description: string (required, what needs to be done)
    - steps: array of strings (optional, ordered implementation steps)
    - notes: array of strings (optional, hints, constraints, context)
    - status: enum (required: pending | in_progress | blocked | done)
```

### Testing Strategy

- **Schema Validation**: Use JSON Schema validator to verify schema is valid JSON Schema draft-07
- **Example Validation**: Validate all example task.json files against the schema
- **Edge Cases**: Test schema with missing optional fields, invalid enum values, empty arrays

### Edge Cases to Handle

- Objectives with only description (no steps or notes) - must be valid
- Empty steps or notes arrays - should be allowed
- Feature field omission for standalone tasks - must be valid
- Multiple objectives in different status states - must be valid

## Risks & Concerns

- Schema too restrictive: May need to loosen constraints if real usage reveals edge cases. Mitigation: Start with schema matching plan.md exactly, iterate based on usage.
- Template syntax confusion: Task-builder needs clear placeholders. Mitigation: Use consistent placeholder syntax like `{{field_name}}` and document it.
- Journal format ambiguity: Workers may interpret format inconsistently. Mitigation: Provide concrete examples for each scenario.

## Resources & Links

- [JSON Schema Draft-07 Specification](https://json-schema.org/specification-links.html#draft-7)
- [plan.md Data Models section](../features/007-task-implementation-orchestration/plan.md) - Lines 162-298
- [feature.md Task Representation](../features/007-task-implementation-orchestration/feature.md) - Lines 72-142

## Acceptance Criteria

- JSON Schema file exists at `plugin/schemas/task.schema.json` and is valid JSON Schema draft-07
- Schema defines all required fields: meta (id, title, type, priority, created), overview, objectives (id, description, status)
- Schema defines all optional fields: meta.feature, objectives.steps, objectives.notes
- Template file exists and contains placeholders for task-builder substitution
- At least two example task.json files exist and validate against the schema
- Journal entry format documentation exists with clear structure and examples
- All example files validate successfully against the schema
