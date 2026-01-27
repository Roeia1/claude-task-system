# Tmux Detached Execution

## Overview

Decouple SAGA CLI implementation script execution from the initiating Claude Code interactive session. Currently, when the SAGA CLI runs an implementation script via Claude Code's Bash tool, the headless execution is tied to the interactive session - if it terminates or times out, the work is lost. This epic implements tmux daemon mode to run implementation scripts in detached sessions, independent of the initiating process.

## Goals

- Enable implementation scripts to run as detached tmux daemon sessions
- Allow the initiating Claude Code session to safely exit without killing worker execution
- Stream stdout from headless Claude sessions for real-time monitoring
- Support the SAGA dashboard backend monitoring tmux processes

## Success Metrics

- Implementation scripts continue running even if the CLI session terminates
- Dashboard can discover running sessions via `saga-` naming convention
- Dashboard can connect/disconnect to stdout streams freely using `tail -f` on output files
- Output files persist in `/tmp/saga-sessions/` (macOS auto-cleans after 3 days)

## Scope

### In Scope

- Tmux daemon session creation for implementation scripts
- Stdout capture using `script` command to `/tmp/saga-sessions/`
- Session naming convention: `saga-<epic-slug>-<story-slug>-<pane-pid>` (PID guarantees uniqueness)
- Output file naming: identical to session name (`/tmp/saga-sessions/<session-name>.out`)
- Session discovery via `tmux ls` with saga- prefix filtering

### Out of Scope

- Dashboard monitoring UI (separate epic)
- Persistent logging beyond /tmp
- Session retry/restart mechanisms
- Multi-machine session management
- Notification system for completion

## Non-Functional Requirements

- Sessions must survive initiating process termination
- Stdout must be streamable without blocking the session
- Session names must be unique and identifiable
- Session name and output file name must be identical (minus file extension)

## Technical Approach

The implementation script launcher will be modified to:

1. Create output capture file in `/tmp/saga-sessions/`
2. Start a tmux detached session with the `script` command wrapping the execution
3. Return immediately with session info (name, output file path)

The session wrapper script pattern:
```bash
#!/bin/bash
mkdir -p /tmp/saga-sessions

# Create session without name (tmux auto-assigns: 0, 1, 2...)
# -P prints session info, -F formats output to get session name and pane PID
SESSION_INFO=$(tmux new-session -d -P -F '#{session_name}:#{pane_pid}' \
  "script -q '/tmp/saga-sessions/saga-${EPIC_SLUG}-${STORY_SLUG}-pending.out' -c './implementation-script.sh'")

AUTO_NAME=${SESSION_INFO%:*}   # tmux auto-assigned name (e.g., "0")
PANE_PID=${SESSION_INFO#*:}    # pane PID (e.g., "48523")

# Rename to our saga-prefixed format with PID for uniqueness
SESSION_NAME="saga-${EPIC_SLUG}-${STORY_SLUG}-${PANE_PID}"
OUTPUT_FILE="/tmp/saga-sessions/${SESSION_NAME}.out"

tmux rename-session -t "$AUTO_NAME" "$SESSION_NAME"
mv "/tmp/saga-sessions/saga-${EPIC_SLUG}-${STORY_SLUG}-pending.out" "$OUTPUT_FILE"

echo "Session started: $SESSION_NAME"
echo "Output file: $OUTPUT_FILE"
```

Dashboard can then:
- List sessions: `tmux ls | grep ^saga-`
- Stream output: `tail -f /tmp/saga-sessions/<session-name>.out`
- Check if running: `tmux has-session -t <session-name>`

## Key Decisions

### Use `script` Command for Output Capture

- **Choice**: Use the `script` command to capture stdout to a file
- **Rationale**: Allows dashboard to connect/disconnect freely via `tail -f`. No blocking issues like named pipes. Built-in to macOS/Linux.
- **Alternatives Considered**: Named pipes (blocking issues), Unix sockets (complexity), tmux capture-pane (visual buffer only, not raw stdout)

### Use `/tmp/saga-sessions/` for Output Files

- **Choice**: Store output files in `/tmp/saga-sessions/`
- **Rationale**: Standard location for ephemeral data. macOS auto-cleans files older than 3 days. No need for manual cleanup management.
- **Alternatives Considered**: `.saga/tmp/` (clutters project), `.saga/logs/` (persistent overhead)

### Session Naming Convention

- **Choice**: `saga-<epic-slug>-<story-slug>-<pane-pid>` pattern
- **Rationale**: `saga-` prefix enables simple discovery via `tmux ls | grep ^saga-`. Epic slug provides context for which epic the session belongs to. Pane PID guarantees uniqueness and correlates with system process monitoring. Output file uses identical name (`<session-name>.out`).
- **Implementation**: Create session without a name (tmux auto-assigns `0`, `1`, `2`... handling collision internally), then use `-P -F` flags to get the auto-assigned name and pane PID, then rename to our `saga-` prefixed format.
- **Alternatives Considered**: Random suffix (not meaningful), timestamp (collision risk), full UUID (too long), manual temp names (unnecessary complexity)

## Data Models

### Session Metadata (Runtime, not persisted)

Available via tmux and filesystem inspection:

```
Session Name: saga-<epic-slug>-<story-slug>-<pane-pid>
Output File: /tmp/saga-sessions/<session-name>.out (identical to session name)
Status: running | completed (derived from tmux has-session - if session exists, running; if not, completed)
Pane PID: The PID of the process running inside the tmux pane (correlates with system ps)
```

## Interface Contracts

### Session Creation

- **Implementation**: Modify existing CLI execution command to use tmux detached mode
- **Input**: Epic slug, story slug, implementation script path
- **Output**: Session name, output file path (identical to session name with `.out` extension)

### Session Discovery

- **Command**: `tmux ls | grep ^saga-`
- **Output**: List of active SAGA sessions

### Session Output Streaming

- **Command**: `tail -f /tmp/saga-sessions/<session-name>.out`
- **Output**: Real-time stdout from the session

### Session Status Check

- **Command**: `tmux has-session -t <session-name>`
- **Output**: Exit code 0 if running, non-zero if not

## Tech Stack

- **tmux**: Session management and detached execution
- **script**: Stdout capture to file (built-in macOS/Linux)
- **bash**: Wrapper scripts for session lifecycle

## Open Questions

- Should session management commands (list/attach/kill) be added to CLI, or is dashboard-only sufficient?
