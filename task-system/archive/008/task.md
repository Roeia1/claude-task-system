# Task 008: Simplify task-completer Agent

## Feature Context

**Feature**: [002-automatic-task-cleanup](../../../features/002-automatic-task-cleanup/feature.md)
**Technical Plan**: [plan.md](../../../features/002-automatic-task-cleanup/plan.md)

## Overview

Simplify the task-completer agent to become a straightforward orchestrator that invokes task-merge and then task-cleanup sequentially. The agent no longer needs to handle manual cleanup instructions or worktree removal concerns because the task-cleanup skill now handles context detection internally (determining whether it's running in a worktree or main repo).

This is Phase 2 of the automatic task cleanup feature: with the spawn script (T006) and location-aware task-cleanup skill (T007) in place, the agent becomes much simpler - it just orchestrates the two skills and lets the skills handle the complexity.

## Task Type

refactor

## Priority

P1 - Critical path for automatic task cleanup feature; agent simplification completes the component integration

## Dependencies

None - This task can be developed in parallel with T006 (spawn script) and T007 (task-cleanup skill update). The agent will invoke task-cleanup which will have its own location-aware logic.

## Objectives

- [ ] Remove manual cleanup instructions from task-completer agent
- [ ] Update agent to invoke task-merge then task-cleanup sequentially
- [ ] Simplify agent description to reflect new responsibility
- [ ] Preserve permission prompt before merge (handled before merge begins)

## Sub-tasks

1. [ ] Read current task-completer.md agent file to understand existing structure
2. [ ] Update agent description (frontmatter) to reflect simplified responsibility
3. [ ] Update skills list to include task-cleanup in addition to task-merge
4. [ ] Simplify the Process section to show two-step orchestration
5. [ ] Remove "Display cleanup instructions" step entirely
6. [ ] Update Error Handling to reflect that task-cleanup handles its own errors
7. [ ] Verify agent markdown structure is valid and consistent with other agents
8. [ ] Test agent invocation to ensure skills are called correctly

## Technical Approach

### Files to Create/Modify

- `plugin/agents/task-completer.md` - Simplify agent to orchestrate task-merge and task-cleanup

### Implementation Steps

1. **Update frontmatter description**: Change from "Handles task archive and PR merge. Worktree cleanup is done separately." to something like "Orchestrates task completion: archives, merges PR, and triggers cleanup."

2. **Update skills list**: Add task-cleanup to the skills frontmatter so the agent can invoke it:
   ```yaml
   skills: task-merge, task-cleanup
   ```

3. **Simplify Process section**: Replace the current two-step process with:
   - Step 1: Execute task-merge skill (archives task files, merges PR)
   - Step 2: Execute task-cleanup skill (handles cleanup based on context)

   Remove all references to "display cleanup instructions" or "tell user to run cleanup from main repo".

4. **Update Error Handling**: Keep the general error handling pattern but note that task-cleanup skill handles its own context detection and error cases (TMUX vs non-TMUX, etc.).

5. **Keep Pre-Completion Validation unchanged**: The validation steps (all sub-tasks complete, tests passing, PR checks green, no merge conflicts) remain important and unchanged.

### Testing Strategy

- **Unit Tests**: Verify agent markdown is syntactically valid
- **Integration Tests**:
  - Invoke task-completer and verify it calls task-merge skill
  - Invoke task-completer and verify it calls task-cleanup skill after task-merge
- **Edge Cases**:
  - Task-merge fails -> task-cleanup should not be invoked
  - Task-merge succeeds but task-cleanup fails -> error reported gracefully

### Edge Cases to Handle

- If task-merge fails (PR check failures, merge conflicts), task-cleanup should NOT be invoked
- If task-cleanup skill reports errors, those are handled by the skill itself (fallback to manual instructions)
- Agent should not duplicate error handling that the skills already handle

## Risks & Concerns

- **Sequential dependency**: task-cleanup must only run after task-merge succeeds
  - Mitigation: Agent should check task-merge result before proceeding

- **Skill availability**: task-cleanup skill must be available in the skills list
  - Mitigation: Explicitly add to frontmatter skills

- **Backward compatibility**: Users may expect to see manual cleanup instructions
  - Mitigation: The task-cleanup skill will show appropriate instructions based on context (TMUX vs non-TMUX)

## Resources & Links

- [Feature Definition](../../../features/002-automatic-task-cleanup/feature.md)
- [Technical Plan](../../../features/002-automatic-task-cleanup/plan.md)
- [Current task-completer agent](../../../../plugin/agents/task-completer.md)
- [task-merge skill](../../../../plugin/skills/task-merge/SKILL.md)
- [task-cleanup skill](../../../../plugin/skills/task-cleanup/SKILL.md)

## Acceptance Criteria

- task-completer agent invokes task-merge skill first
- task-completer agent invokes task-cleanup skill second (after successful merge)
- No manual cleanup instructions displayed by the agent (skill handles this)
- Agent description clearly indicates its orchestration role
- Pre-completion validation remains in place
- Agent markdown follows same structure as other agents in plugin/agents/
