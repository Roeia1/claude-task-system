# Task [ID]: [Title]

## Feature Context

**Feature**: [NNN-feature-name](../features/NNN-feature-name/feature.md) *(if task is part of a feature)*
**Technical Plan**: [plan.md](../features/NNN-feature-name/plan.md) *(if applicable)*
**Feature Tasks**: [tasks.md](../features/NNN-feature-name/tasks.md) *(if applicable)*
**ADRs**: *(if any architectural decisions are relevant)*
- [001-decision-title.md](../features/NNN-feature-name/adr/001-decision-title.md)
- [NNN-another-decision.md](../adrs/NNN-another-decision.md) *(for project-wide ADRs)*

*Note: Remove this section entirely if task is not part of a feature (ad-hoc tasks, refactors, etc.)*

## Overview

Brief description of what needs to be accomplished and why it matters to the project. Include context from the feature plan that helps understand this task's role.

## Task Type

[feature|refactor|bugfix|performance|deployment] - Determines which workflow to follow during execution

## Priority

P[1-3] - [Priority justification]

## Dependencies

- [ID](../ID/task.md) (Title): Explanation of why this dependency is needed

## Objectives

- [ ] Clear, measurable objective 1
- [ ] Clear, measurable objective 2
- [ ] Clear, measurable objective 3

## Sub-tasks

1. [ ] Specific, actionable sub-task (1-4 hours)
2. [ ] Another specific sub-task
3. [ ] Continue as needed (aim for 5-10 sub-tasks)

## Technical Approach

### Files to Create/Modify

- `path/to/file.ts` - Description of what changes and why
- `path/to/another.ts` - Description of changes
- `path/to/new-file.ts` - New file to create

### Implementation Steps

1. Detailed step with specifics (not vague like "implement feature")
2. Another step with concrete actions
3. Continue with logical sequence

### API Contract (if applicable)

*Include this section if the task creates or modifies APIs*

- `POST /api/resource` - Create new resource
  - Request: `{ field1: string, field2: number }`
  - Response: `{ id: string, field1: string, field2: number }`
  - Errors: 400 (validation), 401 (unauthorized)

### Data Models (if applicable)

*Include this section if the task creates or modifies data models*

```
ModelName:
  - id: UUID (primary key)
  - field1: string (description, constraints)
  - field2: integer (description)
  - createdAt: timestamp
```

### Testing Strategy

- **Unit Tests**: What to test at unit level, which functions/methods
- **Integration Tests**: What to test end-to-end, which flows
- **Edge Cases**: Specific scenarios that must be covered

### Edge Cases to Handle

- Specific edge case for this task and how to handle it
- Another edge case
- Continue as needed

## Risks & Concerns

- Potential risk or concern: Mitigation strategy
- Another risk or concern: How to address
- Technical uncertainty: Approach to resolve

## Resources & Links

- [Resource Name](URL)
- [Another Resource](URL)
- [Documentation](URL)

## Acceptance Criteria

- Specific, testable criterion (can write a test for this)
- Another criterion that can be verified
- Continue as needed - ensure each is concrete and verifiable
