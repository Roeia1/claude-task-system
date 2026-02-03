# Environment Variables

This document is the single source of truth for environment variables used in SAGA.

## Overview

Environment variables in Claude Code are available in the bash execution environment. Claude doesn't automatically "see" these values - they must be read via the Bash tool when needed.

**Key principle**: If you need an environment variable value, use the Bash tool to read it:

```bash
echo $SAGA_PROJECT_DIR
```

The SessionStart hook outputs context at session start, displaying all available variables with their values.

**Naming Convention**: All SAGA environment variables use the `SAGA_` prefix for clear namespacing.

## Variable Reference

### Runtime Variables (Provided by Claude Code)

These are set by the Claude Code runtime before any user interaction. The SessionStart hook reads these and persists SAGA-prefixed versions to `CLAUDE_ENV_FILE`.

| Variable | Description | Example |
|----------|-------------|---------|
| `CLAUDE_PROJECT_DIR` | Absolute path to the project root (runtime only) | `/Users/name/my-project` |
| `CLAUDE_PLUGIN_ROOT` | Absolute path to the plugin installation (runtime only) | `/Users/name/.claude/plugins/...` |
| `CLAUDE_ENV_FILE` | Path to temporary file for persisting bash environment | `/tmp/claude-env-abc123` |

### Session Variables (Set by SessionStart Hook)

These are computed by `hooks/session-init.sh` when a Claude Code session starts. They are derived from filesystem state and persisted with the `SAGA_` prefix.

#### Core Variables (Always Set)

| Variable | Description | Values |
|----------|-------------|--------|
| `SAGA_PROJECT_DIR` | Absolute path to the project root | `/Users/name/my-project` |
| `SAGA_PLUGIN_ROOT` | Absolute path to the plugin installation | `/Users/name/.claude/plugins/...` |
| `SAGA_TASK_CONTEXT` | Current working context | `"main"` or `"story-worktree"` |

#### Story Variables (Conditional)

Set when `SAGA_TASK_CONTEXT="story-worktree"`:

| Variable | Description | Example |
|----------|-------------|---------|
| `SAGA_EPIC_SLUG` | Epic identifier | `"user-auth"` |
| `SAGA_STORY_SLUG` | Story identifier | `"login-flow"` |
| `SAGA_STORY_DIR` | Relative path to story files | `".saga/epics/user-auth/stories/login-flow"` |

### Internal Variables (Set by CLI)

These are set by the SAGA CLI for internal use. They are not set during normal interactive sessions.

| Variable | Description | Values |
|----------|-------------|--------|
| `SAGA_INTERNAL_SESSION` | Indicates CLI is running inside a tmux session spawned by `saga implement`. Used to prevent creating nested tmux sessions. | `"1"` when inside tmux session |

### Detection Logic

The SessionStart hook determines context by checking if `.git` is a file or directory:

1. **Story Worktree**: If `.git` is a **file** (worktrees have a .git file that points to the main repo)
   - Sets: `SAGA_TASK_CONTEXT="story-worktree"`, `SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`, `SAGA_STORY_DIR`
   - Epic and story slugs are extracted from the worktree path

2. **Main Repository**: If `.git` is a **directory** (main repo has .git directory)
   - Sets: `SAGA_TASK_CONTEXT="main"`

```bash
# Detection logic in session-init.sh
if [ -f .git ]; then
  # Worktree - .git is a file pointing to main repo
  SAGA_TASK_CONTEXT="story-worktree"
elif [ -d .git ]; then
  # Main repo - .git is a directory
  SAGA_TASK_CONTEXT="main"
fi
```

## Interactive vs Headless Mode

Both interactive and headless Claude sessions work the same way:

1. Plugin loads
2. SessionStart hook runs and detects context
3. Hook persists all SAGA_ variables to `CLAUDE_ENV_FILE`
4. Hook outputs context summary for Claude to see
5. Bash tool sources `CLAUDE_ENV_FILE`, making all variables available

**There is no difference** - headless workers (spawned via `implement.py` or `claude -p`) run hooks just like interactive sessions.

## Usage Patterns

### In Skill/Instruction Files

Use `${VARIABLE}` syntax (braced) for consistency:

```markdown
Read the file at `${SAGA_PLUGIN_ROOT}/templates/example.md`
```

```bash
cat $SAGA_STORY_DIR/story.md
```

### In Python Scripts

```python
import os

project_dir = os.environ.get("SAGA_PROJECT_DIR")
if not project_dir:
    raise EnvironmentError("SAGA_PROJECT_DIR not set")
```

### In Bash Scripts

```bash
# Always check if set before using
if [ -z "$SAGA_STORY_DIR" ]; then
    echo "Error: SAGA_STORY_DIR not set" >&2
    exit 1
fi
```

## Adding New Variables

If you need to add a new environment variable:

1. **Document it here first** - add to the appropriate table above
2. **Set it in one place only** - add to `hooks/session-init.sh`
3. **Update CLAUDE.md** - if the variable affects how Claude should behave
4. **Use the SAGA_ prefix** - all SAGA variables must be namespaced
5. **Use consistent naming** - the same name should be used everywhere (hook output, env var, documentation)

## Variable Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              Session Start (Interactive or Headless)             │
├─────────────────────────────────────────────────────────────────┤
│  Claude Code Runtime                                             │
│  └── Sets: CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT, CLAUDE_ENV_FILE│
│                          ↓                                       │
│  SessionStart Hook (session-init.sh)                             │
│  └── Detects story worktree (.saga/worktrees/...)                │
│  └── Sets: SAGA_* variables (prefixed for namespacing)           │
│  └── Writes all to CLAUDE_ENV_FILE                               │
│  └── Outputs context summary for Claude                          │
│                          ↓                                       │
│  Bash Tool Invocations                                           │
│  └── Sources CLAUDE_ENV_FILE automatically                       │
│  └── All variables available via $SAGA_* or ${SAGA_*}            │
└─────────────────────────────────────────────────────────────────┘
```

### Example Session Output

**In main repository:**
```
# Session Context

SAGA_PROJECT_DIR: /Users/name/my-project
SAGA_PLUGIN_ROOT: /Users/name/my-project/.claude/plugins/saga
SAGA_TASK_CONTEXT: main

These variables are available via the Bash tool: echo $VARIABLE_NAME
```

**In story worktree:**
```
# Session Context

SAGA_PROJECT_DIR: /Users/name/my-project
SAGA_PLUGIN_ROOT: /Users/name/my-project/.claude/plugins/saga
SAGA_TASK_CONTEXT: story-worktree
SAGA_EPIC_SLUG: user-auth
SAGA_STORY_SLUG: login-flow
SAGA_STORY_DIR: .saga/epics/user-auth/stories/login-flow

These variables are available via the Bash tool: echo $VARIABLE_NAME
```
