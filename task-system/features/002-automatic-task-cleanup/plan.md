# Technical Plan: Automatic Task Cleanup via TMUX Terminal Spawning

**Feature**: [feature.md](./feature.md)
**Created**: 2025-12-21
**Status**: Draft

## Executive Summary

Make the task-cleanup skill location-aware: when invoked from a worktree, it detects TMUX and spawns a cleanup pane at the main repo; when invoked from main repo, it performs cleanup directly. The task-completer agent stays simple - it just invokes task-merge then task-cleanup sequentially.

## Technical Approach

- **Architectural Pattern**: Location-aware skill - task-cleanup handles both contexts
- **Integration Points**: task-cleanup skill (modified), spawn script (new, inside skill), task-completer agent (simplified)
- **Development Strategy**: Incremental - spawn script first, then skill update, then agent simplification

## System Architecture

### Components

1. **task-completer agent** (SIMPLIFY)
   - **Purpose**: Orchestrate task completion flow
   - **Responsibilities**: Run task-merge, then run task-cleanup (no TMUX logic)
   - **Interfaces**: Invokes task-merge skill, then task-cleanup skill

2. **task-cleanup skill** (MODIFY - location-aware)
   - **Purpose**: Handle cleanup from any location
   - **Responsibilities**:
     - If in main repo: remove worktree directly (current behavior)
     - If in worktree: detect TMUX, prompt user, spawn cleanup pane
   - **Interfaces**: User prompt for task ID, spawn script

3. **spawn-cleanup.sh** (NEW - inside task-cleanup skill)
   - **Purpose**: Spawn TMUX pane with Claude cleanup session
   - **Responsibilities**: Validate args, spawn pane, start Claude
   - **Interfaces**: CLI arguments, exit codes
   - **Location**: `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh`

4. **task-merge skill** (NO CHANGE)
   - **Purpose**: Archive files, merge PR
   - **Responsibilities**: Unchanged
   - **Interfaces**: Unchanged

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKTREE SESSION                                     │
│                                                                             │
│  ┌─────────────────────┐                                                    │
│  │  task-completer     │                                                    │
│  │  agent (simple)     │                                                    │
│  └──────────┬──────────┘                                                    │
│             │                                                               │
│     ┌───────┴───────┐                                                       │
│     ▼               ▼                                                       │
│  ┌──────────┐   ┌──────────────────────────────────────┐                    │
│  │ task-    │   │ task-cleanup skill (location-aware)  │                    │
│  │ merge    │   │                                      │                    │
│  │ skill    │   │  Detects: in worktree                │                    │
│  └──────────┘   │  → TMUX check                        │                    │
│                 │  → User prompt                        │                    │
│                 │  → Spawn script                       │                    │
│                 └──────────────┬───────────────────────┘                    │
│                                │                                            │
│                         ┌──────┴──────┐                                     │
│                         ▼             ▼                                     │
│                   [In TMUX]    [Not in TMUX]                                │
│                         │             │                                     │
│                         ▼             ▼                                     │
│                spawn-cleanup.sh    Manual                                   │
│                         │          instructions                             │
└─────────────────────────┼───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEW TMUX PANE                                        │
│                                                                             │
│  ┌─────────────────────┐      ┌─────────────────────────────────────┐       │
│  │  Claude Code        │ ───▶ │  task-cleanup skill                 │       │
│  │  (new session)      │      │  (detects: in main repo → cleanup)  │       │
│  └─────────────────────┘      └─────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User grants completion permission in worktree
2. task-completer invokes task-merge skill (archive + merge)
3. task-completer invokes task-cleanup skill
4. task-cleanup detects it's in a worktree (`.git` is a file)
5. task-cleanup checks `$TMUX` environment variable
6. If TMUX: prompts user "Spawn cleanup pane? [Y/n]"
7. If yes: runs spawn script with task ID and main repo path
8. Script spawns TMUX pane at main repo with `claude --prompt "cleanup task $TASK_ID"`
9. New session invokes task-cleanup skill (now in main repo context)
10. task-cleanup detects it's in main repo → performs cleanup directly
11. Worktree removed, completion message shown

## Technology Choices

### Core Technologies

- **Spawn Script**: Bash - native to Unix, TMUX commands are shell-based
- **TMUX Detection**: `$TMUX` environment variable - standard detection method
- **TMUX Spawning**: `tmux split-window -h` - creates visible pane in current window
- **Claude Invocation**: `claude --prompt "..."` - standard CLI prompt flag
- **Location Detection**: Check if `.git` is file (worktree) or directory (main repo)

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pane vs Window | `split-window` (pane) | User sees both sessions, context preserved |
| Script Location | `plugin/skills/task-cleanup/scripts/` | Colocated with skill, single responsibility |
| Command Passing | `--prompt` flag | Simple, uses existing CLI capability |
| Location Detection | `.git` file vs directory | Standard git worktree indicator |

## Data Models

No new persistent data models. Feature uses existing runtime data:

- `TASK_ID`: string - extracted from task folder or user prompt
- `MAIN_REPO`: string - from `git rev-parse --git-common-dir`
- `TMUX`: environment variable - non-empty when in TMUX

## API Contracts

### spawn-cleanup.sh Interface

**Location**: `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh`

**Invocation**:
```bash
./plugin/skills/task-cleanup/scripts/spawn-cleanup.sh <task_id> <main_repo_path>
```

**Arguments**:
| Arg | Required | Description | Example |
|-----|----------|-------------|---------|
| `$1` | Yes | Task ID | `015` |
| `$2` | Yes | Absolute path to main repo | `/home/user/project` |

**Exit Codes**:
| Code | Meaning |
|------|---------|
| `0` | Success - pane spawned |
| `1` | Invalid/missing arguments |
| `2` | Main repo path not found |
| `3` | TMUX command failed |

### task-cleanup Skill Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Location Detection                                      │
├─────────────────────────────────────────────────────────────────┤
│ Check: [ -f ".git" ]                                            │
│                                                                 │
│ If file  → In worktree, go to Step 2a                           │
│ If dir   → In main repo, go to Step 2b                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 2a: Worktree Context (NEW)                                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. Extract TASK_ID from task-system/task-NNN folder             │
│ 2. Get MAIN_REPO path                                           │
│ 3. Check TMUX: [ -n "$TMUX" ]                                   │
│    If not TMUX → show manual instructions, exit                 │
│ 4. Prompt: "Spawn cleanup pane? [Y/n]"                          │
│    If no → show manual instructions, exit                       │
│ 5. Run spawn-cleanup.sh $TASK_ID $MAIN_REPO                     │
│ 6. If success → "Cleanup pane spawned. You may close this."     │
│    If fail → show error + manual instructions                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Step 2b: Main Repo Context (EXISTING - unchanged)               │
├─────────────────────────────────────────────────────────────────┤
│ 1. Get task ID from user prompt                                 │
│ 2. Verify worktree exists                                       │
│ 3. Verify PR is merged                                          │
│ 4. Remove worktree                                              │
│ 5. Show success message                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Foundation - Create Spawn Script

1. Create `plugin/skills/task-cleanup/scripts/` directory
2. Create `spawn-cleanup.sh` with argument validation, path check, TMUX command
3. Make script executable
4. Test script independently

**Success Criteria**: Script spawns TMUX pane with Claude at correct directory.

### Phase 2: Core - Update task-cleanup Skill

1. Add location detection (worktree vs main repo)
2. Add worktree flow: TMUX detection, user prompt, spawn execution
3. Preserve main repo flow unchanged
4. Handle all error cases with manual fallback

**Success Criteria**: Skill handles both contexts correctly.

### Phase 3: Simplify task-completer Agent

1. Remove any TMUX/spawn logic references
2. Update to simply call task-merge then task-cleanup
3. Update agent description

**Success Criteria**: Agent is simpler, just orchestrates two skills.

### Phase 4: Integration & Testing

1. Test full flow: completion → merge → cleanup spawn
2. Test fallback scenarios
3. Test error scenarios

**Success Criteria**: Complete lifecycle works; graceful degradation.

### Phase 5: Documentation

1. Update CLAUDE.md with new automatic cleanup flow
2. Update task-cleanup skill documentation
3. Update task-completer agent documentation

**Success Criteria**: Documentation reflects new behavior.

## Testing Strategy

### Unit Testing

**spawn-cleanup.sh**:
- Missing arguments → Exit 1
- Invalid repo path → Exit 2
- Valid arguments in TMUX → Exit 0, pane spawns

**task-cleanup location detection**:
- `.git` is file → worktree context
- `.git` is directory → main repo context

### Integration Testing

| Scenario | Context | Expected |
|----------|---------|----------|
| In TMUX, accept | Worktree | Spawns pane, cleanup runs |
| In TMUX, decline | Worktree | Manual instructions shown |
| Not in TMUX | Worktree | Manual instructions only |
| Spawn fails | Worktree | Error + manual fallback |
| Direct cleanup | Main repo | Worktree removed directly |

### Manual Testing Checklist

- [ ] Worktree + TMUX: cleanup → prompt → spawn → cleanup completes
- [ ] Worktree + TMUX: cleanup → decline → manual instructions
- [ ] Worktree + no TMUX: cleanup → manual instructions (no prompt)
- [ ] Main repo: cleanup → worktree removed directly
- [ ] Spawned pane at correct directory
- [ ] Spawned pane runs correct command
- [ ] Spawned pane stays open after completion
- [ ] Invalid path → graceful error + fallback

## Security Considerations

- **Input Validation**: Script validates task ID format and repo path existence
- **No Privilege Escalation**: Script runs with same permissions as parent
- **Path Injection**: Using quoted variables prevents path injection

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TMUX not installed | Medium | Low | Graceful fallback to manual |
| `claude` not in PATH | Low | Medium | Pane shows error; manual cleanup available |
| User closes pane early | Medium | Low | Worktree remains; manual cleanup later |
| TMUX spawn fails | Low | Low | Error + manual fallback |
| Main repo path incorrect | Low | Medium | Script validates; error + fallback |
| Location detection fails | Very Low | Medium | Falls back to main repo behavior |

## Performance Considerations

- **TMUX spawn**: < 2 seconds (requirement from feature.md)
- **Claude startup**: < 5 seconds to ready state
- **No persistent overhead**: Feature only activates during task completion

## Dependencies

### External Services
- **TMUX**: Must be installed and session running inside TMUX

### Internal Dependencies
- **task-merge skill**: Must complete successfully before cleanup (when in worktree)

### Infrastructure Requirements
- Unix-like environment with TMUX support

## Deployment Plan

1. **Preparation**: Create scripts directory in task-cleanup skill
2. **Deployment**: Add spawn script, update task-cleanup skill, simplify task-completer
3. **Rollback**: Revert task-cleanup to main-repo-only behavior
4. **Monitoring**: User feedback on spawn success/failure rates

## Open Questions

None - all questions resolved in feature.md and planning discussion.

## Architecture Decisions

**ADR: Location-Aware Cleanup Skill**
- **Decision**: Make task-cleanup skill location-aware instead of putting spawn logic in agent
- **Rationale**: Keeps agent simple (just orchestrates skills), all cleanup logic in one place, skill handles the "how"

**ADR: Worktree Merge Flow** (from feature.md)
- **Decision**: Keep merge in worktree, cleanup from root via TMUX spawn
- **Rationale**: Preserves worktree isolation principle; TMUX spawn is targeted solution

## Future Considerations

- Support for other terminal multiplexers (screen, zellij)
- Background cleanup option (no user visibility)
- Batch cleanup of multiple tasks

---

**Ready for review and task generation.**
