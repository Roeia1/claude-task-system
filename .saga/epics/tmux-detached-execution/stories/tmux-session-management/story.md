---
id: tmux-session-management
title: Tmux Detached Session Management
status: completed
epic: tmux-detached-execution
tasks:
  - id: t1
    title: Create sessions library module
    status: completed
  - id: t2
    title: Add sessions CLI subcommands
    status: completed
  - id: t3
    title: Update implement command for detached execution
    status: completed
  - id: t4
    title: Add comprehensive tests
    status: completed
---

## Context

The SAGA CLI's `implement` command currently runs headless Claude workers synchronously, tying the execution to the interactive session that started it. If the initiating session terminates, times out, or loses connection, all worker progress is lost. This story implements tmux detached session management to decouple worker execution from the initiating process.

This story creates a shared sessions library module (`src/lib/sessions.ts`) that can be imported by both the CLI and the dashboard server. The module provides functions to create, list, query status, stream logs from, and kill tmux sessions running SAGA workers. The CLI will expose these functions via `saga sessions` subcommands, and the `implement` command will be updated to launch workers in detached tmux sessions by default.

The implementation uses the `script` command to capture stdout to files in `/tmp/saga-sessions/`, enabling the dashboard to connect/disconnect freely via `tail -f` without blocking. Session names follow the pattern `saga-<epic-slug>-<story-slug>-<pane-pid>` for unique identification and easy discovery.

## Scope Boundaries

**In scope:**
- Shared sessions module (`src/lib/sessions.ts`) with functions:
  - `createSession(epicSlug, storySlug, command)` - creates detached tmux session
  - `listSessions()` - lists all saga-prefixed sessions
  - `getSessionStatus(sessionName)` - checks if session is running
  - `streamLogs(sessionName)` - streams output file via tail -f
  - `killSession(sessionName)` - terminates session
  - `validateSlug(slug)` - validates slug contains only `[a-z0-9-]`
- CLI commands under `saga sessions`:
  - `sessions list` - lists active SAGA sessions
  - `sessions status <name>` - shows session status
  - `sessions logs <name>` - streams session output
  - `sessions kill <name>` - terminates session
- Update `implement` command to use detached execution
- Output files stored in `/tmp/saga-sessions/`
- Session naming: `saga-<epic-slug>-<story-slug>-<pane-pid>`

**Out of scope:**
- Dashboard monitoring UI (separate epic: saga-dashboard)
- Persistent logging beyond /tmp (out of scope per epic)
- Session retry/restart mechanisms (out of scope per epic)
- Multi-machine session management (out of scope per epic)
- Notification system for completion (out of scope per epic)
- Exit code capture or structured exit information beyond what's written to stdout

## Interface

### Inputs

- Epic slug and story slug (validated to contain only `[a-z0-9-]`)
- Command to execute in the session
- Session name for status/logs/kill operations

### Outputs

- Session creation returns: `{ sessionName: string, outputFile: string }`
- Session list returns: `Array<{ name: string, status: 'running' | 'not_running', outputFile: string }>`
- Status check returns: `{ running: boolean }`
- Logs streams to stdout until interrupted
- Kill returns: `{ killed: boolean }`

### Module Export

The sessions module is exported from the CLI package for direct import by the dashboard server:

```typescript
import { sessions } from '@saga-ai/cli';
// or
import { createSession, listSessions, getSessionStatus, streamLogs, killSession } from '@saga-ai/cli/lib/sessions';
```

## Acceptance Criteria

- [ ] Sessions module exports all functions: createSession, listSessions, getSessionStatus, streamLogs, killSession, validateSlug
- [ ] `saga sessions list` shows all saga-prefixed tmux sessions with name, status, and output file path
- [ ] `saga sessions status <name>` returns running/not_running status
- [ ] `saga sessions logs <name>` streams output file content in real-time
- [ ] `saga sessions kill <name>` terminates the session
- [ ] `saga implement <story>` creates a detached tmux session instead of running synchronously
- [ ] Sessions survive the initiating process terminating
- [ ] Output files are created in `/tmp/saga-sessions/` with session-name.out naming
- [ ] Slug validation rejects slugs with characters outside `[a-z0-9-]`
- [ ] Dashboard server can import sessions module directly without shelling out

## Tasks

### t1: Create sessions library module

**Guidance:**
- Create `src/lib/sessions.ts` as a shared module
- Use `node:child_process` for spawning tmux and script commands
- The `script` command captures stdout: `script -q <file> -c <command>`
- Session creation flow:
  1. Validate slugs
  2. Create output directory: `mkdir -p /tmp/saga-sessions`
  3. Start tmux session without name to get auto-assigned name and pane PID
  4. Rename session to `saga-<epic>-<story>-<pane-pid>`
  5. Rename output file from pending to final name
- Use `tmux has-session -t <name>` to check if running (exit 0 = running)
- Use `tmux ls` with grep for saga- prefix to list sessions
- Use `tmux kill-session -t <name>` to terminate
- For logs, spawn `tail -f <output-file>` and pipe to stdout

**References:**
- `/Users/roeiavrahami/projects/saga/packages/cli/src/commands/implement.ts` - existing spawn patterns
- Epic technical approach section for session wrapper script pattern
- `node:child_process` documentation for spawn and spawnSync

**Avoid:**
- Using named pipes (blocking issues)
- Storing output in project directory (clutters workspace)
- Manual session name collision handling (let PID guarantee uniqueness)
- Synchronous file operations in streaming functions

**Done when:**
- Module exports all 6 functions
- Unit tests pass for each function
- Sessions can be created, listed, monitored, and killed
- Output files are written to /tmp/saga-sessions/

### t2: Add sessions CLI subcommands

**Guidance:**
- Create `src/commands/sessions/` directory with individual command files
- Create `src/commands/sessions/index.ts` to register subcommands
- Register `sessions` as a subcommand group in `src/cli.ts`
- Each subcommand wraps the corresponding sessions module function
- Output format:
  - `list`: JSON array of sessions
  - `status`: JSON object with running boolean
  - `logs`: Raw stdout stream (not JSON)
  - `kill`: JSON object with killed boolean

**References:**
- `/Users/roeiavrahami/projects/saga/packages/cli/src/cli.ts` - command registration patterns
- `/Users/roeiavrahami/projects/saga/packages/cli/src/commands/init.ts` - simple command pattern
- Commander.js subcommand documentation

**Avoid:**
- Mixing streaming output with JSON (logs command streams raw, others return JSON)
- Forgetting to handle SIGINT for graceful cleanup in logs command
- Using console.log for streaming (use process.stdout.write)

**Done when:**
- `saga sessions list` returns JSON array of sessions
- `saga sessions status <name>` returns JSON with running status
- `saga sessions logs <name>` streams output until Ctrl+C
- `saga sessions kill <name>` terminates session and returns success

### t3: Update implement command for detached execution

**Guidance:**
- Modify `implementCommand` in `src/commands/implement.ts`
- Add `--attached` flag (default: false) to run in foreground like today
- When detached (default):
  1. Use sessions.createSession() to create tmux session
  2. Output session info as JSON and exit immediately
  3. The worker runs independently in the tmux session
- When attached (`--attached` flag):
  - Keep current synchronous/streaming behavior
- Update `runLoop` to be callable from both modes
- The tmux session should run the same orchestration loop

**References:**
- `/Users/roeiavrahami/projects/saga/packages/cli/src/commands/implement.ts` - current implementation
- `/Users/roeiavrahami/projects/saga/packages/cli/src/lib/sessions.ts` - sessions module (from t1)
- Epic interface contracts section

**Avoid:**
- Breaking existing `--stream` functionality (keep it working with `--attached`)
- Changing the worker output JSON schema
- Removing synchronous mode entirely (some users may want it)

**Done when:**
- `saga implement <story>` creates detached session by default
- `saga implement <story> --attached` runs synchronously as before
- `saga implement <story> --attached --stream` streams output as before
- Session info JSON is output when running detached
- Worker orchestration loop runs successfully in detached mode

### t4: Add comprehensive tests

**Guidance:**
- Create `src/lib/sessions.test.ts` for unit tests
- Create `src/commands/sessions/*.test.ts` for CLI integration tests
- Update `src/commands/implement.test.ts` for detached mode
- Test patterns:
  - Mock tmux commands for unit tests
  - Use real tmux for integration tests (skip if tmux not available)
  - Test slug validation with various invalid inputs
  - Test session lifecycle: create -> list -> status -> kill
- Edge cases to test:
  - Session name with special characters rejected
  - Non-existent session handling
  - Output file not found handling
  - tmux not installed handling

**References:**
- `/Users/roeiavrahami/projects/saga/packages/cli/src/commands/init.test.ts` - test patterns
- `/Users/roeiavrahami/projects/saga/packages/cli/src/commands/implement.test.ts` - existing implement tests
- Vitest documentation for mocking

**Avoid:**
- Tests that leave orphan tmux sessions (always cleanup in afterEach)
- Tests that depend on specific tmux version behavior
- Flaky timing-dependent tests for streaming

**Done when:**
- Sessions module has >80% test coverage
- CLI commands have integration tests
- Implement command tests cover detached mode
- All tests pass in CI
