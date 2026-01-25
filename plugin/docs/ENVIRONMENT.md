# Environment Variables

This document is the single source of truth for environment variables used in the Claude Task System.

## Overview

Environment variables in Claude Code are available in the bash execution environment. Claude doesn't automatically "see" these values - they must be read via the Bash tool when needed.

**Key principle**: If you need an environment variable value, use the Bash tool to read it:

```bash
echo $CLAUDE_PROJECT_DIR
```

## Variable Reference

### Runtime Variables (Provided by Claude Code)

These are automatically available in any Claude Code session. They are set by the plugin runtime before any user interaction.

| Variable | Description | Example |
|----------|-------------|---------|
| `CLAUDE_PROJECT_DIR` | Absolute path to the project root directory | `/Users/name/my-project` |
| `CLAUDE_PLUGIN_ROOT` | Absolute path to the plugin installation directory | `/Users/name/my-project/.claude/plugins/claude-task-system` |
| `CLAUDE_ENV_FILE` | Path to temporary file for persisting bash environment | `/tmp/claude-env-abc123` |

**Notes:**
- `CLAUDE_PROJECT_DIR` and `CLAUDE_PLUGIN_ROOT` are only available during hook execution (e.g., SessionStart)
- The SessionStart hook writes them to `CLAUDE_ENV_FILE` so they're available in subsequent Bash tool invocations
- `CLAUDE_ENV_FILE` is sourced automatically by the Bash tool, making all persisted variables accessible

### Session Variables (Set by SessionStart Hook)

These are computed by `hooks/session-init.sh` when a Claude Code session starts. They are derived from filesystem state.

| Variable | Description | Values | Condition |
|----------|-------------|--------|-----------|
| `TASK_CONTEXT` | Whether session is in main repo or task worktree | `"main"` or `"worktree"` | Always set |
| `CURRENT_TASK_ID` | The task number when in a worktree | `"024"`, `"001"`, etc. | Only when `TASK_CONTEXT="worktree"` |

**Detection logic:**
- If `task-system/task-NNN/` folder exists in current directory → `TASK_CONTEXT="worktree"`, `CURRENT_TASK_ID="NNN"`
- Otherwise → `TASK_CONTEXT="main"`, `CURRENT_TASK_ID` is not set

## Headless Mode (Worker Agents)

Headless Claude workers (spawned via `implement.py` or `claude -p`) use the plugin and run hooks just like interactive sessions. The SessionStart hook executes and sets up the same environment variables.

**How it works:**

1. Worker is spawned with `cwd` set to the worktree directory
2. SessionStart hook runs and detects the worktree context
3. Hook writes `TASK_CONTEXT`, `CURRENT_TASK_ID`, etc. to `CLAUDE_ENV_FILE`
4. All variables are available via Bash tool, same as interactive mode

**Worker context in prompt:**

The orchestrator also prepends context to the worker prompt for convenience:
```
**Worktree Root:** /path/to/worktree
**Plugin Root:** /path/to/plugin
**Project Dir:** /path/to/project
**Epic:** example-epic
**Story:** example-story
**Story Dir:** .claude-tasks/epics/example-epic/stories/example-story
```

This provides immediate access to paths without needing a Bash call, but the environment variables remain the authoritative source.

## Usage Patterns

### In Skill/Instruction Files

Use `${VARIABLE}` syntax (braced) for consistency:

```markdown
Read the file at `${CLAUDE_PLUGIN_ROOT}/templates/example.md`
```

```bash
cat ${CLAUDE_PROJECT_DIR}/.claude-tasks/epics/my-epic/epic.md
```

### In Python Scripts

```python
import os

project_dir = os.environ.get("CLAUDE_PROJECT_DIR")
if not project_dir:
    raise EnvironmentError("CLAUDE_PROJECT_DIR not set")
```

### In Bash Scripts

```bash
# Always check if set before using
if [ -z "$CLAUDE_PROJECT_DIR" ]; then
    echo "Error: CLAUDE_PROJECT_DIR not set" >&2
    exit 1
fi
```

## Adding New Variables

If you need to add a new environment variable:

1. **Document it here first** - add to the appropriate table above
2. **Set it in one place only** - either:
   - Runtime: Request from Claude Code plugin system (not user-controllable)
   - Session: Add to `hooks/session-init.sh`
3. **Update CLAUDE.md** - if the variable affects how Claude should behave
4. **Consider headless mode** - will workers need this? If so, either:
   - Ensure it's inherited via subprocess environment
   - Pass it via worker prompt context

## Variable Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Interactive Session                           │
├─────────────────────────────────────────────────────────────────┤
│  Claude Code Runtime                                             │
│  └── Sets: CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT, CLAUDE_ENV_FILE│
│                          ↓                                       │
│  SessionStart Hook (session-init.sh)                             │
│  └── Detects filesystem state                                    │
│  └── Sets: TASK_CONTEXT, CURRENT_TASK_ID (if worktree)          │
│  └── Writes all to CLAUDE_ENV_FILE                               │
│                          ↓                                       │
│  Bash Tool Invocations                                           │
│  └── Sources CLAUDE_ENV_FILE automatically                       │
│  └── All variables available via $VAR or ${VAR}                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Headless Worker Session                       │
├─────────────────────────────────────────────────────────────────┤
│  Parent Process (implement.py)                                   │
│  └── Reads: CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT from env     │
│  └── Computes: worktree path, story dir, etc.                   │
│  └── Prepends context to worker prompt                          │
│                          ↓                                       │
│  subprocess.run(["claude", "-p", ...], cwd=worktree)            │
│  └── Plugin loads, SessionStart hook runs                        │
│  └── Hook detects worktree, writes vars to CLAUDE_ENV_FILE      │
│                          ↓                                       │
│  Worker's Bash Tool                                              │
│  └── Sources CLAUDE_ENV_FILE automatically                       │
│  └── All variables available (same as interactive)               │
│  └── Prompt context provides convenient path access              │
└─────────────────────────────────────────────────────────────────┘
```
