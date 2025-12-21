# Task 009: Documentation Updates

## Feature Context

**Feature**: [002-automatic-task-cleanup](../../features/002-automatic-task-cleanup/feature.md)
**Technical Plan**: [plan.md](../../features/002-automatic-task-cleanup/plan.md)
**Feature Tasks**: [tasks.md](../../features/002-automatic-task-cleanup/tasks.md)

## Overview

Update documentation to reflect the new automatic cleanup flow introduced in Feature 002. This task covers Phase 5 from the technical plan - documenting the TMUX requirement, automatic spawn behavior, and fallback to manual instructions. Clear documentation ensures users understand the new workflow and prerequisites.

## Task Type

feature - Adding new documentation content for a new feature.

## Priority

P2 - Documentation is important but depends on implementation tasks being complete first.

## Dependencies

- [006](../../archive/006/task.md) (Create spawn-cleanup.sh script): Core spawn script must be implemented
- [007](../../archive/007/task.md) (Update task-cleanup skill): Location-aware cleanup behavior must be working
- [008](../../archive/008/task.md) (Simplify task-completer agent): Agent orchestration must be finalized

## Objectives

- [ ] Update CLAUDE.md to document the automatic cleanup flow
- [ ] Document TMUX requirement for automatic cleanup
- [ ] Explain the user prompts and expected behavior in worktree context
- [ ] Ensure fallback to manual instructions is clearly documented

## Sub-tasks

1. [ ] Review current "Two-Step Completion" section in CLAUDE.md (line 362)
2. [ ] Update the Task Execution Workflow section to reflect automatic cleanup
3. [ ] Add new subsection explaining TMUX requirement and behavior
4. [ ] Document the user prompt flow when completing a task
5. [ ] Document fallback behavior when not in TMUX
6. [ ] Update the Important Notes section with TMUX-related notes
7. [ ] Review and update task-cleanup skill documentation if needed
8. [ ] Review and update task-completer agent documentation if needed
9. [ ] Ensure consistency across all documentation references

## Technical Approach

### Files to Create/Modify

- `CLAUDE.md` - Main documentation file requiring updates:
  - Update "Task Execution Workflow" section (lines 166-188) to reflect automatic cleanup
  - Revise "Two-Step Completion" note (line 362) to explain new automatic flow
  - Add TMUX requirement documentation in appropriate location
  - Update workflow description to show the automatic spawn behavior

### Implementation Steps

1. Update the "Task Execution Workflow" section:
   - Change the manual cleanup step to describe automatic cleanup
   - Add note about TMUX requirement
   - Show the user prompt: "Ready to merge and cleanup? A new terminal will spawn and this session will terminate."

2. Revise the "Two-Step Completion" note in Important Notes:
   - Explain that cleanup is now automatic when in TMUX
   - Document the fallback to manual when not in TMUX
   - Clarify that the technical reason (agent running in worktree) still applies but is now handled automatically

3. Add TMUX requirement documentation:
   - Explain that automatic cleanup requires running inside a TMUX session
   - Document that `$TMUX` environment variable is checked
   - Clarify fallback behavior provides manual instructions

4. Document the complete flow:
   - User completes task phases in worktree
   - User grants permission at prompt
   - Task-completer invokes task-merge (archive, merge PR)
   - Task-completer invokes task-cleanup (detects worktree, spawns pane)
   - New pane runs cleanup, removes worktree
   - Original session can terminate

### Testing Strategy

- **Manual Review**: Verify documentation accurately reflects implemented behavior
- **Consistency Check**: Ensure all references to cleanup workflow are updated
- **User Flow Validation**: Walk through documentation as a new user would

### Edge Cases to Handle

- Documentation should cover non-TMUX fallback clearly
- Ensure existing manual cleanup instructions remain valid as fallback
- Document what happens if spawn fails (error + manual fallback)

## Risks & Concerns

- Documentation may become outdated if implementation changes: Mitigate by reviewing against actual implemented code
- Over-documentation could confuse users: Keep explanations concise and focused
- Missing edge cases: Review feature.md acceptance criteria to ensure all scenarios are documented

## Resources & Links

- [Feature Definition](../../features/002-automatic-task-cleanup/feature.md)
- [Technical Plan](../../features/002-automatic-task-cleanup/plan.md)
- [Current CLAUDE.md](../../../../CLAUDE.md)
- [task-cleanup skill](../../../../plugin/skills/task-cleanup/SKILL.md)
- [task-completer agent](../../../../plugin/agents/task-completer.md)

## Acceptance Criteria

- CLAUDE.md accurately describes the automatic cleanup flow
- TMUX requirement is clearly documented with explanation of why it's needed
- User prompt flow is documented ("Ready to merge and cleanup?")
- Fallback behavior for non-TMUX environments is documented
- All references to "Two-Step Completion" or manual cleanup are updated for consistency
- Documentation can be followed by a new user to understand the complete task lifecycle
