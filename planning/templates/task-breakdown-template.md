# Task Breakdown: [Feature Name]

**Feature**: [Link to feature.md]
**Technical Plan**: [Link to plan.md]
**Generated**: [YYYY-MM-DD]

## Task Summary

- **Total Tasks**: [X]
- **Estimated Effort**: [Y] days/weeks
- **Parallelizable Tasks**: [Z]

## Tasks Overview

### Setup & Foundation (Phase 1)

#### T001: [Task Title]
**Type**: feature | refactor | bugfix | deployment
**Priority**: P1 | P2 | P3
**Dependencies**: None
**Estimated Effort**: [hours/days]
**Files Affected**:
- `path/to/file.ext`
- `path/to/another/file.ext`

**Description**:
Brief description of what needs to be done and why.

**Implementation Notes**:
- Key point 1
- Key point 2

---

#### T002: [Task Title]
**Type**: feature
**Priority**: P1
**Dependencies**: T001
**Estimated Effort**: [hours/days]
**Files Affected**:
- `path/to/file.ext`

**Description**:
[What needs to be done]

---

### Core Implementation (Phase 2)

#### T003: [Task Title] [P]
**Type**: feature
**Priority**: P1
**Dependencies**: T001, T002
**Estimated Effort**: [hours/days]
**Parallelizable**: Yes (different files than T004)
**Files Affected**:
- `path/to/unique/file.ext`

**Description**:
[What needs to be done]

**Note**: Can be developed in parallel with T004

---

#### T004: [Task Title] [P]
**Type**: feature
**Priority**: P1
**Dependencies**: T001, T002
**Estimated Effort**: [hours/days]
**Parallelizable**: Yes (different files than T003)
**Files Affected**:
- `path/to/different/file.ext`

**Description**:
[What needs to be done]

**Note**: Can be developed in parallel with T003

---

### Integration & Testing (Phase 3)

#### T005: [Task Title]
**Type**: feature
**Priority**: P1
**Dependencies**: T003, T004
**Estimated Effort**: [hours/days]
**Files Affected**:
- `path/to/integration/file.ext`

**Description**:
[What needs to be done]

---

### Polish & Documentation (Phase 4)

#### T006: [Task Title] [P]
**Type**: feature
**Priority**: P2
**Dependencies**: T005
**Estimated Effort**: [hours/days]
**Parallelizable**: Yes
**Files Affected**:
- `docs/README.md`

**Description**:
[What needs to be done]

---

## Execution Order

### Recommended Sequence

1. **Phase 1**: T001 → T002 (sequential, foundation work)
2. **Phase 2**: T003 + T004 (can be parallel - different files)
3. **Phase 3**: T005 (integration work, requires Phase 2 complete)
4. **Phase 4**: T006 (polish and docs)

### Parallel Execution Strategy

If team capacity allows, these tasks can run concurrently:

**Group 1** (after Phase 1 complete):
- T003 + T004 (different file sets, independent implementation)

**Note**: Tasks in the same group can be worked on simultaneously using git worktrees.

## Task Creation Checklist

Before creating tasks in project-tasks/TASK-LIST.md:

- [ ] All tasks have clear, specific descriptions
- [ ] Dependencies are accurately identified
- [ ] File paths are specified for each task
- [ ] Parallelizable tasks are marked with [P]
- [ ] Priority levels are assigned (P1/P2/P3)
- [ ] Tasks trace back to feature requirements
- [ ] Each task is independently testable

## Notes for Implementation

### Testing Approach
- Unit tests created in Phase 3 (TDD) for each task
- Integration tests after Phase 3 completion
- End-to-end tests in Phase 4

### Code Review Strategy
- Each task creates a separate PR
- PRs reviewed before merging
- Feature branch integration at end

### Documentation Requirements
- Inline code documentation as you implement
- API documentation for public interfaces
- README updates in final polish phase

---

**Next Step**: Review this breakdown, modify as needed, then use `/project:generate-tasks` to create actual task files.