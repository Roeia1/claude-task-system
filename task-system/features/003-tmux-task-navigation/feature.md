# Feature: Claude Spawn - Same-Pane Session Handoff

**Created:** 2025-12-21
**Status:** Draft
**Feature ID:** 003

## Overview

A generic script (`claude-spawn.sh`) that enables Claude to hand off to a new Claude session in a different directory with a given prompt, reusing the same tmux pane. The current Claude process is killed after scheduling the new session via tmux.

## Motivation

Currently, when a user says "start task 015" from the master branch or a wrong worktree, the system instructs them to manually navigate to the correct worktree. This interrupts workflow and requires multiple manual steps. By creating a generic spawn script, we can:

1. Seamlessly transition to the correct directory
2. Reuse the same tmux pane (no pane proliferation)
3. Provide a reusable utility for any "spawn Claude elsewhere" scenario

## User Stories

### Story 1: Start Task from Wrong Location

**As a** developer working in the main repository or wrong worktree
**I want** to start a task and have Claude seamlessly transition to the correct worktree
**So that** I can begin working immediately without manual navigation

**Acceptance Criteria:**
- [ ] Running "start task NNN" from wrong location detects the mismatch
- [ ] System invokes `claude-spawn.sh` with worktree path and "start task NNN" prompt
- [ ] Current Claude session is terminated
- [ ] New Claude session starts in the same tmux pane
- [ ] New Claude executes with the provided prompt
- [ ] Transition feels seamless to the user

### Story 2: Generic Claude Spawning

**As a** plugin developer
**I want** a generic script to spawn Claude in any directory with any prompt
**So that** I can reuse this capability for other navigation scenarios

**Acceptance Criteria:**
- [ ] Script accepts path and prompt as arguments
- [ ] Script works independently of task-start (generic utility)
- [ ] Script validates tmux is available
- [ ] Script handles edge cases (invalid path, missing arguments)

### Story 3: Non-tmux Fallback

**As a** developer not using tmux
**I want** clear instructions when the spawn script cannot be used
**So that** I can manually navigate to the correct location

**Acceptance Criteria:**
- [ ] System detects when not running inside tmux
- [ ] System displays manual navigation instructions
- [ ] No error or crash occurs

## Functional Requirements

1. A script `plugin/scripts/claude-spawn.sh` shall be created
2. The script shall accept two arguments: `<path>` and `<prompt>`
3. The script shall use `tmux run-shell -d` to schedule the new Claude session (detached from current process)
4. The script shall kill the current Claude process after scheduling
5. The new Claude session shall use `--dangerously-skip-permissions` flag with prompt as positional argument
6. The script shall validate that it's running inside tmux before proceeding
7. The task-start skill shall invoke this script when wrong location is detected

## Non-Functional Requirements

### Performance
- Transition should complete within 1-2 seconds
- No perceptible gap between old Claude exit and new Claude start

### Reliability
- Script process must survive the death of the parent Claude process
- Use `tmux run-shell -d` to ensure tmux owns the spawned process

### Usability
- Same pane reuse means no tmux pane management overhead
- User sees continuous flow in their terminal

## Out of Scope

- Support for terminal multiplexers other than tmux
- Custom Claude flags (beyond `--dangerously-skip-permissions`)
- Multiple Claude spawning (only single handoff)
- Windows support

## Success Metrics

- **Seamlessness**: Transition appears as one continuous session to user
- **Reliability**: 99%+ success rate when tmux is available
- **Reusability**: Script used by multiple skills/features

## Dependencies

- **External tools**: tmux must be installed and session must be running inside tmux
- **Claude CLI**: Must support `--dangerously-skip-permissions` flag and prompt as positional argument
- **Infrastructure**: Unix-like environment with bash

## Open Questions

- [x] ~~Should we create a new pane or reuse the same pane?~~ → Reuse same pane
- [x] ~~Where should the script live?~~ → `plugin/scripts/claude-spawn.sh`
- [ ] Should the script support an optional delay parameter?
- [ ] Should we log spawn events somewhere for debugging?

## References

- Existing task-start skill: `plugin/skills/task-start/SKILL.md`
- tmux run-shell documentation: `man tmux` (run-shell command)
- Claude CLI documentation

---

**Note**: This document describes WHAT to build, not HOW. Technical implementation details belong in plan.md.
