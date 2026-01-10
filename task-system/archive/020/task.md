# Task 020: Integration testing and documentation update

## Feature Context

**Feature**: [007-task-implementation-orchestration](../features/007-task-implementation-orchestration/feature.md)
**Technical Plan**: [plan.md](../features/007-task-implementation-orchestration/plan.md)

## Overview

This task covers the final polish phase of the task implementation orchestration feature. It involves comprehensive end-to-end testing of both the happy path (FINISH) and blocker flow (BLOCKED to /resolve to resume), updating CLAUDE.md with the new commands and workflow documentation, and adding migration notes for teams with existing tasks using the previous task.md format.

This task validates that all components work together seamlessly and ensures users have clear documentation to adopt the new orchestration system.

## Task Type

feature - Determines which workflow to follow during execution

## Priority

P2 - Essential for feature completion but non-blocking for core functionality

## Dependencies

- [016](../016/task.md) (Create /implement command): The implement command must exist to test the happy path
- [017](../017/task.md) (Create /resolve command): The resolve command must exist to test the blocker flow
- [018](../018/task.md) (Create identifier resolution utilities): Identifier resolution must work for testing
- [019](../019/task.md) (Modify task-builder to generate task.json): task.json generation must work for testing

## Objectives

- [ ] Happy path end-to-end test passes (ONGOING to FINISH)
- [ ] Blocker flow end-to-end test passes (BLOCKED to /resolve to resume)
- [ ] CLAUDE.md updated with new commands and workflow
- [ ] Migration notes documented for existing task.md users

## Sub-tasks

1. [ ] Create test task.json for happy path testing (simple objectives, no blockers expected)
2. [ ] Run /implement on test task and verify ONGOING to FINISH flow
3. [ ] Create test task.json for blocker flow testing (objective designed to trigger blocker)
4. [ ] Run /implement, verify BLOCKED exit and blocker.md creation
5. [ ] Navigate to worktree, run /resolve, verify resolution workflow
6. [ ] Resume with /implement, verify worker reads resolution.md and completes
7. [ ] Update CLAUDE.md "Development Commands" section with /implement and /resolve
8. [ ] Update CLAUDE.md "Task Execution Workflow" section for new orchestration model
9. [ ] Add migration notes section explaining task.md to task.json transition
10. [ ] Review documentation for completeness and accuracy

## Technical Approach

### Files to Create/Modify

- `CLAUDE.md` - Update with new commands, workflow, and migration notes
- `plugin/README.md` - Update if exists with command reference
- `test-task-happy/task.json` - Temporary test task for happy path (delete after testing)
- `test-task-blocker/task.json` - Temporary test task for blocker flow (delete after testing)

### Implementation Steps

1. **Happy Path Testing**
   - Create a minimal task.json with 2-3 simple objectives
   - Run `/implement` from main repo
   - Monitor worker spawns and status output
   - Verify ONGOING cycles followed by FINISH status
   - Verify journal.md entries created correctly
   - Verify all objectives marked as done

2. **Blocker Flow Testing**
   - Create task.json with an objective that requires human decision
   - Run `/implement` from main repo
   - Verify worker exits with BLOCKED status
   - Verify blocker.md created with proper structure
   - Navigate to worktree, run `/resolve`
   - Verify resolution workflow proposes solutions
   - Approve resolution, verify resolution.md created
   - Run `/implement` again from main repo
   - Verify worker reads resolution, completes objective
   - Verify blocker.md and resolution.md cleaned up

3. **Documentation Updates**
   - Add `/implement <identifier>` to Development Commands
   - Add `/resolve` to Development Commands
   - Update Task Execution Workflow section
   - Document identifier resolution formats
   - Add Migration section explaining:
     - task.md replaced by task.json
     - Phase-based execution replaced by objective-based
     - Manual permission gates replaced by autonomous progression
     - How to convert existing tasks if needed

### Testing Strategy

- **Integration Tests**: Full end-to-end flows exercised manually
- **Happy Path**: Verify /implement runs to FINISH without intervention
- **Blocker Path**: Verify /implement BLOCKED, /resolve, and resume cycle
- **Edge Cases**:
  - Invalid identifier provided to /implement
  - /resolve run outside worktree
  - /resolve run when no blocker.md exists
  - /implement run when task is already blocked

### Edge Cases to Handle

- Documentation must be clear for users unfamiliar with the new system
- Migration notes must address users with in-progress tasks using old format
- Testing must verify Windows and Unix path handling works correctly
- Error messages from commands should guide users to correct usage

## Risks & Concerns

- **Test tasks may leave artifacts**: Mitigation - document cleanup steps, remove test worktrees after testing
- **Documentation may become stale**: Mitigation - link to source files where possible, keep examples minimal
- **Migration may confuse users**: Mitigation - clear before/after examples, gradual adoption path

## Resources & Links

- [feature.md](../features/007-task-implementation-orchestration/feature.md) - Feature definition with acceptance criteria
- [plan.md](../features/007-task-implementation-orchestration/plan.md) - Technical plan with component details
- [Current CLAUDE.md](../../CLAUDE.md) - Existing documentation to update

## Acceptance Criteria

- Running `/implement` on a task with completable objectives results in FINISH status
- Running `/implement` on a task that triggers blocker results in BLOCKED status with blocker.md
- Running `/resolve` in worktree with blocker produces resolution.md after human approval
- Resuming `/implement` after resolution completes the blocked objective
- CLAUDE.md contains accurate documentation for /implement command
- CLAUDE.md contains accurate documentation for /resolve command
- CLAUDE.md contains migration notes explaining task.md to task.json transition
- Documentation examples are correct and runnable
