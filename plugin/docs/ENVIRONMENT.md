# Environment Variables

This document is the single source of truth for environment variables used in the Claude Task System.

## Overview

Environment variables in Claude Code are available in the bash execution environment. Claude doesn't automatically "see" these values - they must be read via the Bash tool when needed.

**Key principle**: If you need an environment variable value, use the Bash tool to read it:

```bash
echo $CLAUDE_PROJECT_DIR
```

The SessionStart hook outputs context at session start, displaying all available variables with their values.

## Variable Reference

### Runtime Variables (Provided by Claude Code)

These are set by the plugin runtime before any user interaction. They are only available during hook execution, so the SessionStart hook persists them to `CLAUDE_ENV_FILE`.

| Variable | Description | Example |
|----------|-------------|---------|
| `CLAUDE_PROJECT_DIR` | Absolute path to the project root directory | `/Users/name/my-project` |
| `CLAUDE_PLUGIN_ROOT` | Absolute path to the plugin installation directory | `/Users/name/my-project/.claude/plugins/claude-task-system` |
| `CLAUDE_ENV_FILE` | Path to temporary file for persisting bash environment | `/tmp/claude-env-abc123` |

### Session Variables (Set by SessionStart Hook)

These are computed by `hooks/session-init.sh` when a Claude Code session starts. They are derived from filesystem state.

#### Core Variables (Always Set)

| Variable | Description | Values |
|----------|-------------|--------|
| `TASK_CONTEXT` | Current working context | `"main"` or `"story-worktree"` |

#### Story Variables (Conditional)

Set when `TASK_CONTEXT="story-worktree"`:

| Variable | Description | Example |
|----------|-------------|---------|
| `EPIC_SLUG` | Epic identifier | `"user-auth"` |
| `STORY_SLUG` | Story identifier | `"login-flow"` |
| `STORY_DIR` | Relative path to story files | `".claude-tasks/epics/user-auth/stories/login-flow"` |

### Detection Logic

The SessionStart hook determines context based on filesystem:

1. **Story Worktree**: If `.claude-tasks/epics/` exists AND git worktree path contains `/.claude-tasks/worktrees/`
   - Sets: `TASK_CONTEXT="story-worktree"`, `EPIC_SLUG`, `STORY_SLUG`, `STORY_DIR`

2. **Main Repository**: Otherwise
   - Sets: `TASK_CONTEXT="main"`

## Interactive vs Headless Mode

Both interactive and headless Claude sessions work the same way:

1. Plugin loads
2. SessionStart hook runs and detects context
3. Hook persists all variables to `CLAUDE_ENV_FILE`
4. Hook outputs context summary for Claude to see
5. Bash tool sources `CLAUDE_ENV_FILE`, making all variables available

**There is no difference** - headless workers (spawned via `implement.py` or `claude -p`) run hooks just like interactive sessions.

## Usage Patterns

### In Skill/Instruction Files

Use `${VARIABLE}` syntax (braced) for consistency:

```markdown
Read the file at `${CLAUDE_PLUGIN_ROOT}/templates/example.md`
```

```bash
cat $STORY_DIR/story.md
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
if [ -z "$STORY_DIR" ]; then
    echo "Error: STORY_DIR not set" >&2
    exit 1
fi
```

## Adding New Variables

If you need to add a new environment variable:

1. **Document it here first** - add to the appropriate table above
2. **Set it in one place only** - add to `hooks/session-init.sh`
3. **Update CLAUDE.md** - if the variable affects how Claude should behave
4. **Use consistent naming** - the same name should be used everywhere (hook output, env var, documentation)

## Variable Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              Session Start (Interactive or Headless)             │
├─────────────────────────────────────────────────────────────────┤
│  Claude Code Runtime                                             │
│  └── Sets: CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT, CLAUDE_ENV_FILE│
│                          ↓                                       │
│  SessionStart Hook (session-init.sh)                             │
│  └── Detects story worktree (.claude-tasks/worktrees/...)       │
│  └── Sets: TASK_CONTEXT + context-specific variables             │
│  └── Writes all to CLAUDE_ENV_FILE                               │
│  └── Outputs context summary for Claude                          │
│                          ↓                                       │
│  Bash Tool Invocations                                           │
│  └── Sources CLAUDE_ENV_FILE automatically                       │
│  └── All variables available via $VAR or ${VAR}                  │
└─────────────────────────────────────────────────────────────────┘
```

### Example Session Output

**In main repository:**
```
# Session Context

CLAUDE_PROJECT_DIR: /Users/name/my-project
CLAUDE_PLUGIN_ROOT: /Users/name/my-project/.claude/plugins/claude-task-system
TASK_CONTEXT: main

These variables are available via the Bash tool: echo $VARIABLE_NAME
```

**In story worktree:**
```
# Session Context

CLAUDE_PROJECT_DIR: /Users/name/my-project
CLAUDE_PLUGIN_ROOT: /Users/name/my-project/.claude/plugins/claude-task-system
TASK_CONTEXT: story-worktree
EPIC_SLUG: user-auth
STORY_SLUG: login-flow
STORY_DIR: .claude-tasks/epics/user-auth/stories/login-flow

These variables are available via the Bash tool: echo $VARIABLE_NAME
```
