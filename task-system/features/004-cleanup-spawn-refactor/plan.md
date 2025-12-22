# Technical Plan: Unified Cleanup Spawn Using claude-spawn Script

**Feature**: [feature.md](./feature.md)
**Created**: 2025-12-22
**Status**: Draft

## Executive Summary

Refactor the task-cleanup skill to use `claude-spawn.sh` instead of `spawn-cleanup.sh` for spawning cleanup sessions. This involves updating the skill documentation, adjusting the script path and invocation pattern, updating success messaging, and removing the now-obsolete `spawn-cleanup.sh` script.

## Technical Approach

- **Architectural Pattern**: Script consolidation - replacing a specialized script with the existing generalized script
- **Integration Points**: `task-cleanup/SKILL.md` → `scripts/claude-spawn.sh`
- **Development Strategy**: Direct replacement with documentation updates

## System Architecture

### Components

1. **claude-spawn.sh** (existing, unchanged)
   - **Purpose**: Spawn Claude session in a different directory
   - **Responsibilities**: TMUX validation, create new pane via `tmux split-window -h`, kill original pane
   - **Interfaces**: `claude-spawn.sh <path> <prompt>` → exit codes 0/1/2/3

2. **task-cleanup/SKILL.md** (modified)
   - **Purpose**: Orchestrate task cleanup from worktree or main repo
   - **Responsibilities**: Location detection, spawn invocation (from worktree), direct cleanup (from main repo)
   - **Interfaces**: User command "cleanup task NNN"

3. **spawn-cleanup.sh** (to be removed)
   - **Current Purpose**: Spawn cleanup pane using `tmux split-window -h`
   - **Status**: To be deleted after migration

### Component Diagram

```
Before:
┌─────────────────────┐         ┌──────────────────────┐
│ task-cleanup/SKILL  │───────▶ │ spawn-cleanup.sh     │
│ (worktree context)  │         │ (tmux split-window)  │
└─────────────────────┘         └──────────────────────┘
                                          │
                                          ▼
                                   New TMUX pane

After:
┌─────────────────────┐         ┌──────────────────────┐
│ task-cleanup/SKILL  │───────▶ │ claude-spawn.sh      │
│ (worktree context)  │         │ (tmux split-window)  │
└─────────────────────┘         └──────────────────────┘
                                          │
                                          ▼
                                   New pane created,
                                   old pane killed
```

### Data Flow

1. User triggers cleanup from worktree context
2. SKILL detects worktree context and validates TMUX
3. User confirms spawn (preserved behavior)
4. SKILL invokes `claude-spawn.sh` with main repo path and cleanup prompt
5. claude-spawn.sh creates new pane with Claude, then kills original pane
6. New Claude session starts at main repo with "cleanup task NNN" command

## Key Changes

### 1. Script Path Change

**Before:**
```bash
bash plugin/skills/task-cleanup/scripts/spawn-cleanup.sh "$TASK_ID" "$MAIN_REPO"
```

**After:**
```bash
bash plugin/scripts/claude-spawn.sh "$MAIN_REPO" "cleanup task $TASK_ID"
```

Note the argument order is different:
- `spawn-cleanup.sh`: `<task_id> <path>`
- `claude-spawn.sh`: `<path> <prompt>`

### 2. Exit Code Mapping

| spawn-cleanup.sh | claude-spawn.sh | Meaning |
|------------------|-----------------|---------|
| Exit 0 | Exit 0 | Success (but behavior differs - see below) |
| Exit 1 | Exit 2 | Invalid/missing arguments |
| Exit 2 | Exit 3 | Path not found |
| Exit 3 | Exit 1 | TMUX not available/failed |

**Important behavioral difference:**
- `spawn-cleanup.sh` exit 0: Script returns, pane created, user sees success message, original pane remains
- `claude-spawn.sh` exit 0: Script creates new pane, kills original pane, code after invocation never runs

### 3. Success Message Handling

**Before** (after spawn-cleanup.sh returns):
```
===============================================================
Cleanup Pane Spawned Successfully
===============================================================

A new TMUX pane has been opened at the main repository.
The cleanup process will run automatically there.

You may close this session when ready.
===============================================================
```

**After** (before claude-spawn.sh call):
```
===============================================================
Spawning Cleanup at Main Repository
===============================================================

Opening new pane at: $MAIN_REPO
A new Claude session will run cleanup automatically.

===============================================================
```

The success message must be displayed **before** calling claude-spawn.sh since the original pane will be killed.

### 4. Error Handling Update

Exit code interpretation must be updated:

```markdown
| Exit Code | Meaning | Action |
|-----------|---------|--------|
| 0 | Success | (never reached - original pane killed) |
| 1 | Not in TMUX | Display manual instructions |
| 2 | Invalid arguments | Display error + manual fallback |
| 3 | Path not found | Display error + manual fallback |
```

## Implementation Strategy

### Phase 1: Update task-cleanup/SKILL.md

1. Update Step 2a.5 to use claude-spawn.sh
2. Move success message before script invocation
3. Update exit code handling
4. Update script path reference
5. Update Notes section to reference claude-spawn.sh

**Success Criteria**: SKILL.md correctly documents new behavior

### Phase 2: Remove spawn-cleanup.sh

1. Delete `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh`
2. Remove `plugin/skills/task-cleanup/scripts/` directory if empty

**Success Criteria**: spawn-cleanup.sh no longer exists

### Phase 3: Update Related Documentation

1. Update `CLAUDE.md` if it references spawn-cleanup.sh
2. Update `plugin/agents/task-completer.md` if needed

**Success Criteria**: No stale references to spawn-cleanup.sh

## Testing Strategy

### Manual Testing

1. **Happy path (TMUX available)**:
   - Complete a task in worktree
   - Trigger cleanup
   - Confirm spawn
   - Verify: Session terminates, new session starts at main repo, cleanup runs

2. **No TMUX**:
   - Run cleanup from worktree without TMUX
   - Verify: Manual instructions displayed correctly

3. **User declines spawn**:
   - Trigger cleanup, decline spawn
   - Verify: Manual instructions displayed

4. **From main repo**:
   - Run cleanup from main repo
   - Verify: Direct cleanup works (unchanged behavior)

### Verification Checklist

- [ ] Cleanup spawn works in TMUX
- [ ] Old pane is closed after new pane is created
- [ ] Manual fallback works without TMUX
- [ ] Error messages are consistent with task-start
- [ ] Main repo cleanup still works directly

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|-----------|--------|---------------------|
| Success message not shown before pane killed | Low | Medium | Display message before script call, flush output |
| Exit code confusion | Low | Low | Document mapping clearly, test all codes |
| Path escaping issues | Low | Low | claude-spawn.sh already handles escaping |

## Dependencies

### Internal Dependencies
- **claude-spawn.sh**: Existing script, no changes needed

### Files to Modify
1. `plugin/skills/task-cleanup/SKILL.md` - Main changes
2. `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh` - Delete

### Files to Verify
1. `CLAUDE.md` - Check for spawn-cleanup.sh references
2. `plugin/agents/task-completer.md` - Check for spawn-cleanup.sh references

## Open Questions

None - all questions resolved during feature definition.

## Architecture Decisions

No new ADRs needed - this is a consolidation refactor using existing patterns established by task-start.

## Future Considerations

- Consider adding a `--replace-session` flag to distinguish spawn behaviors if different use cases emerge
- Could unify all spawn-related logic in a shared utility if more spawn scenarios arise

---

**Note**: This document describes HOW to build the feature. It should be reviewed and approved before generating tasks.
