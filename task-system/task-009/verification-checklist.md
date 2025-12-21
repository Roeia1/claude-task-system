# Documentation Verification Checklist - Task 009

This checklist serves as the "test suite" for documentation updates. Each item must be verified after documentation changes are made.

## Acceptance Criteria Verification

### AC1: CLAUDE.md accurately describes the automatic cleanup flow
- [ ] Task Execution Workflow section describes automatic cleanup via TMUX spawn
- [ ] Flow diagram/description shows: merge in worktree -> spawn pane -> cleanup in main repo
- [ ] User prompt is documented: "Spawn cleanup pane at main repo? [Y/n]"
- [ ] Spawned pane behavior is explained (runs cleanup automatically)

### AC2: TMUX requirement is clearly documented with explanation
- [ ] TMUX requirement is explicitly stated
- [ ] Explanation of WHY TMUX is needed (agent can't delete its own directory)
- [ ] How TMUX is detected (`$TMUX` environment variable check) is mentioned
- [ ] Location of this documentation is logical (near Task Execution Workflow)

### AC3: User prompt flow is documented
- [ ] User confirmation prompt before spawn is documented
- [ ] Default behavior (Y = spawn) is clear
- [ ] What happens when user confirms (new pane spawns)
- [ ] What happens when user declines (manual instructions shown)

### AC4: Fallback behavior for non-TMUX environments is documented
- [ ] Clear statement that non-TMUX falls back to manual instructions
- [ ] Manual cleanup instructions remain documented as fallback
- [ ] No impression that automatic cleanup is mandatory

### AC5: All references to "Two-Step Completion" are updated
- [ ] "Two-Step Completion" note in Important Notes is updated OR removed
- [ ] Any other manual cleanup references are consistent with new flow
- [ ] Old manual workflow still valid as fallback (not removed, just not primary)

### AC6: Documentation can be followed by a new user
- [ ] Flow is clear end-to-end (task start -> work -> merge -> cleanup)
- [ ] No assumed knowledge about TMUX details
- [ ] Prerequisites (TMUX) are mentioned early
- [ ] Success message and next steps are described

## Cross-Reference Verification

### Implementation Accuracy
- [ ] Documentation matches `plugin/skills/task-cleanup/SKILL.md` behavior
- [ ] Documentation matches `plugin/agents/task-completer.md` behavior
- [ ] Prompt text in docs matches actual prompt ("Spawn cleanup pane at main repo? [Y/n]")
- [ ] Error scenarios described match actual error handling

### Consistency Checks
- [ ] No conflicting information between sections
- [ ] Terminology is consistent (worktree, main repo, cleanup, merge)
- [ ] No orphaned references to old manual-only workflow as primary path

## Sections to Update (from task.md)

1. [ ] "Task Execution Workflow" section (lines 166-188)
2. [ ] "Two-Step Completion" note in Important Notes (line 362)
3. [ ] Workflow description to show automatic spawn behavior
4. [ ] TMUX requirement documentation (new subsection or integrated)

---

**Verification Method**: After documentation updates, walk through this checklist manually, comparing documentation text against the implemented behavior in the skill and agent files.
