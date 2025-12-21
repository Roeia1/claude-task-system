# Task 007: Update task-cleanup Skill with Location Detection

## Feature Context

**Feature**: [002-automatic-task-cleanup](../../features/002-automatic-task-cleanup/feature.md)
**Technical Plan**: [plan.md](../../features/002-automatic-task-cleanup/plan.md)

## Overview

Make the task-cleanup skill location-aware so it can handle both worktree and main repo contexts. When invoked from a worktree, the skill should detect if running in TMUX, prompt the user for confirmation, and spawn a cleanup pane at the main repo. When invoked from the main repo, it continues with existing cleanup behavior (remove worktree directly).

This is Phase 2 from the technical plan - the core update that makes the skill context-aware, enabling automatic cleanup after task completion.

## Task Type

feature - New functionality being added to existing skill

## Priority

P1 - Critical path for the automatic cleanup feature. This task transforms the skill to be location-aware, which is essential for the seamless task lifecycle.

## Dependencies

None - This task can be developed in parallel with T006 (spawn script creation). However, full integration testing requires T006 to be complete.

## Objectives

- [ ] Skill detects if running in worktree vs main repo using `.git` file/directory check
- [ ] Worktree context: extracts task ID from `task-system/task-NNN/` folder
- [ ] Worktree context: detects TMUX environment and prompts user appropriately
- [ ] Worktree context: spawns cleanup pane when user confirms
- [ ] Main repo context: preserves existing cleanup behavior unchanged
- [ ] All error cases handled with graceful fallback to manual instructions

## Sub-tasks

1. [ ] Add location detection section at start of skill (check if `.git` is file or directory)
2. [ ] Create Step 2a: Worktree Context flow with task ID extraction
3. [ ] Implement TMUX detection using `$TMUX` environment variable
4. [ ] Add user prompt for spawn confirmation with default to yes
5. [ ] Add spawn script invocation with proper arguments (task ID, main repo path)
6. [ ] Add success/failure handling with appropriate messages
7. [ ] Add manual instructions fallback for non-TMUX and user decline cases
8. [ ] Preserve existing Step 2b: Main Repo Context flow (rename from current flow)
9. [ ] Update skill description to reflect location-aware behavior
10. [ ] Add notes section explaining the dual-context behavior

## Technical Approach

### Files to Create/Modify

- `plugin/skills/task-cleanup/SKILL.md` - Major modification to add location-aware logic

### Implementation Steps

1. **Restructure skill flow** - Add new Step 1: Location Detection before current content
2. **Add location detection logic**:
   ```bash
   if [ -f ".git" ]; then
       # In worktree -> go to Step 2a
   else
       # In main repo -> go to Step 2b (existing flow)
   fi
   ```
3. **Create Step 2a: Worktree Context**:
   - Extract task ID: `ls task-system/ | grep "^task-" | sed 's/task-//'`
   - Get main repo path: `git rev-parse --git-common-dir | xargs dirname`
   - Check TMUX: `[ -n "$TMUX" ]`
   - If not TMUX: show manual instructions immediately
   - If TMUX: prompt user for confirmation
   - On confirm: run spawn script with task ID and main repo path
   - On success: show "Cleanup pane spawned. You may close this session."
   - On failure: show error and manual instructions
4. **Rename existing flow as Step 2b: Main Repo Context** - Keep current behavior unchanged
5. **Update Step numbers** - Renumber existing steps (3, 4, 5, 6 become 3, 4, 5, 6 in Step 2b context)

### Testing Strategy

- **Unit Tests**: Not applicable (markdown skill definition)
- **Integration Tests**:
  - Worktree + TMUX: verify spawn script is invoked with correct arguments
  - Worktree + no TMUX: verify manual instructions shown
  - Main repo: verify existing cleanup flow works unchanged
- **Edge Cases**:
  - Task ID extraction when multiple task folders exist (should use current worktree's task)
  - Main repo path resolution across different OS environments
  - TMUX variable empty vs unset

### Edge Cases to Handle

- **No task-NNN folder found**: Error with message about invalid worktree state
- **spawn-cleanup.sh not found**: Error with fallback to manual instructions
- **User declines spawn prompt**: Show manual instructions gracefully
- **TMUX spawn fails (non-zero exit)**: Show error and manual fallback
- **Main repo path invalid**: Error from spawn script, show manual fallback

## Risks & Concerns

- **Path resolution complexity**: Using `git rev-parse --git-common-dir` should work reliably, but edge cases with symlinks may exist. Mitigation: test with various worktree configurations.
- **TMUX detection reliability**: The `$TMUX` variable is standard, but nested TMUX sessions may behave unexpectedly. Mitigation: accept this as out of scope for v1.
- **Script path resolution**: Need to locate spawn script relative to skill. Mitigation: use absolute path from plugin root.

## Resources & Links

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [TMUX Documentation](https://github.com/tmux/tmux/wiki)
- [Technical Plan - Phase 2](../../features/002-automatic-task-cleanup/plan.md)

## Acceptance Criteria

- [ ] When invoked from worktree in TMUX with user confirmation, spawn script is called with correct task ID and main repo path
- [ ] When invoked from worktree in TMUX but user declines, manual cleanup instructions are displayed
- [ ] When invoked from worktree outside TMUX, manual cleanup instructions are displayed without prompting
- [ ] When invoked from main repo, existing cleanup behavior works unchanged
- [ ] Task ID is correctly extracted from `task-system/task-NNN/` folder in worktree
- [ ] Main repo path is correctly resolved via git command
- [ ] All error scenarios fall back to manual instructions gracefully
- [ ] Skill description accurately reflects the location-aware behavior
