# Documentation Verification Checklist - Task 009

This checklist serves as the "test suite" for documentation updates. Each item must be verified after documentation changes are made.

## Acceptance Criteria Verification

### AC1: CLAUDE.md accurately describes the automatic cleanup flow
- [x] Task Execution Workflow section describes automatic cleanup via TMUX spawn
- [x] Flow diagram/description shows: merge in worktree -> spawn pane -> cleanup in main repo
- [x] User prompt is documented: "Spawn cleanup pane at main repo? [Y/n]"
- [x] Spawned pane behavior is explained (runs cleanup automatically)

### AC2: TMUX requirement is clearly documented with explanation
- [x] TMUX requirement is explicitly stated
- [x] Explanation of WHY TMUX is needed (agent can't delete its own directory)
- [x] ~~How TMUX is detected (`$TMUX` environment variable check) is mentioned~~ (implementation detail, omitted)
- [x] Location of this documentation is logical (near Task Execution Workflow)

### AC3: User prompt flow is documented
- [x] User confirmation prompt before spawn is documented
- [x] Default behavior (Y = spawn) is clear
- [x] What happens when user confirms (new pane spawns)
- [x] What happens when user declines (manual instructions shown)

### AC4: Fallback behavior for non-TMUX environments is documented
- [x] Clear statement that non-TMUX falls back to manual instructions
- [x] Manual cleanup instructions remain documented as fallback
- [x] No impression that automatic cleanup is mandatory

### AC5: All references to "Two-Step Completion" are updated
- [x] "Two-Step Completion" note in Important Notes is updated OR removed
- [x] Any other manual cleanup references are consistent with new flow
- [x] Old manual workflow still valid as fallback (not removed, just not primary)

### AC6: Documentation can be followed by a new user
- [x] Flow is clear end-to-end (task start -> work -> merge -> cleanup)
- [x] No assumed knowledge about TMUX details
- [x] Prerequisites (TMUX) are mentioned early
- [x] Success message and next steps are described

## Cross-Reference Verification

### Implementation Accuracy
- [x] Documentation matches `plugin/skills/task-cleanup/SKILL.md` behavior
- [x] Documentation matches `plugin/agents/task-completer.md` behavior
- [x] Prompt text in docs matches actual prompt ("Spawn cleanup pane at main repo? [Y/n]")
- [x] Error scenarios described match actual error handling

### Consistency Checks
- [x] No conflicting information between sections
- [x] Terminology is consistent (worktree, main repo, cleanup, merge)
- [x] No orphaned references to old manual-only workflow as primary path

## Sections to Update (from task.md)

1. [x] "Task Execution Workflow" section (lines 166-188)
2. [x] "Two-Step Completion" note in Important Notes (line 362)
3. [x] Workflow description to show automatic spawn behavior
4. [x] TMUX requirement documentation (new subsection or integrated)

---

**Verification Status**: ALL CHECKS PASSED

**Verification Method**: Walked through checklist manually, comparing documentation text against implemented behavior in skill and agent files. Confirmed prompt text matches exactly.
