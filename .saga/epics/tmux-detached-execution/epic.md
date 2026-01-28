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
- Output files persist in `/tmp/saga-sessions/` (OS manages cleanup)

## Scope

### In Scope

- Tmux daemon session creation for implementation scripts
- Stdout capture using `script` command to `/tmp/saga-sessions/`
- Session naming convention: `saga-<epic-slug>-<story-slug>-<pane-pid>` (PID guarantees uniqueness)
- Output file naming: identical to session name (`/tmp/saga-sessions/<session-name>.out`)
- Exit information written to output file before script terminates (success or failure)
- Session discovery via `tmux ls` with saga- prefix filtering
- Shared session management module (importable by CLI and dashboard server)

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

The `saga-ai` CLI's `implement` command (invoked by the `/execute-story` skill) will be modified to:

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

Dashboard can then use CLI commands:
- List sessions: `saga-ai sessions list`
- Stream output: `saga-ai sessions logs <session-name>`
- Check if running: `saga-ai sessions status <session-name>`
- Kill session: `saga-ai sessions kill <session-name>`

## Key Decisions

### Use `script` Command for Output Capture

- **Choice**: Use the `script` command to capture stdout to a file
- **Rationale**: Allows dashboard to connect/disconnect freely via `tail -f`. No blocking issues like named pipes. Built-in to macOS/Linux.
- **Alternatives Considered**: Named pipes (blocking issues), Unix sockets (complexity), tmux capture-pane (visual buffer only, not raw stdout)

### Use `/tmp/saga-sessions/` for Output Files

- **Choice**: Store output files in `/tmp/saga-sessions/`
- **Rationale**: Standard location for ephemeral data. OS manages cleanup per system configuration. No need for manual cleanup management.
- **Alternatives Considered**: `.saga/tmp/` (clutters project), `.saga/logs/` (persistent overhead)

### Session Naming Convention

- **Choice**: `saga-<epic-slug>-<story-slug>-<pane-pid>` pattern
- **Rationale**: `saga-` prefix enables simple discovery via `tmux ls | grep ^saga-`. Epic slug provides context for which epic the session belongs to. Pane PID guarantees uniqueness and correlates with system process monitoring. Output file uses identical name (`<session-name>.out`).
- **Slug Validation**: CLI must verify slugs contain only lowercase alphanumeric characters and hyphens (`[a-z0-9-]`). Reject if special characters are present.
- **Implementation**: Create session without a name (tmux auto-assigns `0`, `1`, `2`... handling collision internally), then use `-P -F` flags to get the auto-assigned name and pane PID, then rename to our `saga-` prefixed format.
- **Alternatives Considered**: Random suffix (not meaningful), timestamp (collision risk), full UUID (too long), manual temp names (unnecessary complexity)

## Data Models

### Session Metadata (Runtime, not persisted)

Available via tmux and filesystem inspection:

```
Session Name: saga-<epic-slug>-<story-slug>-<pane-pid>
Output File: /tmp/saga-sessions/<session-name>.out (identical to session name)
Status: running | not running (derived from tmux has-session - exit code 0 means running)
Exit Info: Written to output file before script exits (success or failure reason in the output stream)
Pane PID: The PID of the process running inside the tmux pane (correlates with system ps)
```

## Interface Contracts

Session management logic is implemented in a shared module that can be imported by both the `saga-ai` CLI and the dashboard server directly (no shell execution required). The CLI provides a command-line interface to this module.

### Session Creation

- **Command**: `saga-ai implement <epic-slug> <story-slug>`
- **Output**: Session name, output file path (identical to session name with `.out` extension)
- **Note**: Files named `*-pending.out` are transient during setup and should be ignored

### Session Discovery

- **Command**: `saga-ai sessions list`
- **Output**: List of active SAGA sessions (name, status, output file path)

### Session Output Streaming

- **Command**: `saga-ai sessions logs <session-name>`
- **Output**: Real-time stdout from the session (streams until interrupted)

### Session Status Check

- **Command**: `saga-ai sessions status <session-name>`
- **Output**: Session status (running or not running)

### Session Kill

- **Command**: `saga-ai sessions kill <session-name>`
- **Output**: Terminates the session immediately

## Tech Stack

- **tmux**: Session management and detached execution
- **script**: Stdout capture to file (built-in macOS/Linux)
- **bash**: Wrapper scripts for session lifecycle

## Architecture

Session management is implemented as a shared module within the `@saga-ai/cli` package:

```
packages/cli/src/
├── commands/
│   ├── implement.ts      # Uses sessions module
│   └── sessions/         # CLI commands wrapping the module
│       ├── list.ts
│       ├── status.ts
│       ├── logs.ts
│       └── kill.ts
└── lib/
    └── sessions.ts       # Shared module (exported for dashboard server)
```

The dashboard server imports the sessions module directly instead of shelling out to the CLI.

## Open Questions

None - all questions resolved.
