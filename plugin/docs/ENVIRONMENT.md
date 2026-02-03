# Environment Variables

This document is the single source of truth for environment variables used in SAGA.

## Overview

Environment variables in Claude Code are available in the bash execution environment. Claude doesn't automatically "see" these values - they must be read via the Bash tool when needed.

**Key principle**: If you need an environment variable value, use the Bash tool to read it:

```bash
echo $SAGA_PROJECT_DIR
```

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

These are computed by `hooks/session-init.sh` when a Claude Code session starts. They are available in both interactive and headless sessions.

| Variable | Description | Example |
|----------|-------------|---------|
| `SAGA_PROJECT_DIR` | Absolute path to the project or worktree root | `/Users/name/my-project` |
| `SAGA_PLUGIN_ROOT` | Absolute path to the plugin installation | `/Users/name/.claude/plugins/saga` |
| `SAGA_TASK_CONTEXT` | Current working context | `"main"` or `"story-worktree"` |

**Note**: All paths are absolute. `SAGA_PROJECT_DIR` points to different locations depending on context:
- In main repo: The project root directory (e.g., `/Users/name/my-project`)
- In worktree: The worktree root (e.g., `/Users/name/my-project/.saga/worktrees/{epic}/{story}`)

### Worker Environment Variables

These variables are **only** set when spawning headless Claude workers via `saga implement`. They are NOT set during interactive sessions.

The worker orchestrator (`implement.ts`) sets these before spawning each worker:

| Variable | Description | Example |
|----------|-------------|---------|
| `SAGA_EPIC_SLUG` | Epic identifier | `"user-auth"` |
| `SAGA_STORY_SLUG` | Story identifier | `"login-flow"` |
| `SAGA_STORY_DIR` | Absolute path to story files | `/Users/name/.../worktree/.saga/epics/user-auth/stories/login-flow` |

**Note**: All paths are absolute, consistent with `SAGA_PROJECT_DIR` and `SAGA_PLUGIN_ROOT`.

Workers use these variables for:
- Reading `story.md` and `journal.md` via `$SAGA_STORY_DIR`
- Commit messages: `feat($SAGA_EPIC_SLUG-$SAGA_STORY_SLUG): description`
- Scope validation (the `scope-validator` hook uses these to enforce access boundaries)

### Internal Variables (Set by CLI)

These are set by the SAGA CLI for internal use. They are not set during normal interactive sessions.

| Variable | Description | Values |
|----------|-------------|--------|
| `SAGA_INTERNAL_SESSION` | Indicates CLI is running inside a tmux session spawned by `saga implement`. Used to prevent creating nested tmux sessions. | `"1"` when inside tmux session |

## Context Detection

The SessionStart hook determines context by checking if `.git` is a file or directory:

1. **Story Worktree**: If `.git` is a **file** (worktrees have a .git file that points to the main repo)
   - Sets: `SAGA_TASK_CONTEXT="story-worktree"`

2. **Main Repository**: If `.git` is a **directory** (main repo has .git directory)
   - Sets: `SAGA_TASK_CONTEXT="main"`

## Interactive vs Worker Sessions

### Interactive Sessions

When you run `claude` interactively in a SAGA project:

1. SessionStart hook runs and detects context
2. Sets core variables: `SAGA_PROJECT_DIR`, `SAGA_PLUGIN_ROOT`, `SAGA_TASK_CONTEXT`
3. Story-specific context (epic, story) comes from user input via plugin skills

### Worker Sessions (Headless)

When `saga implement` spawns headless workers:

1. The orchestrator sets worker env vars before spawning `claude -p`
2. Worker receives: `SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`, `SAGA_STORY_DIR`
3. SessionStart hook also runs, setting core variables
4. Worker prompt can use all variables in bash commands

## Usage Patterns

### In Skill/Instruction Files

Use `${VARIABLE}` syntax (braced) for consistency:

```markdown
Read the file at `${SAGA_PLUGIN_ROOT}/templates/example.md`
```

### In Worker Prompt (Bash commands)

```bash
cat $SAGA_STORY_DIR/story.md
git commit -m "feat($SAGA_EPIC_SLUG-$SAGA_STORY_SLUG): description"
```

### In TypeScript Scripts

```typescript
import process from 'node:process';

const projectDir = process.env.SAGA_PROJECT_DIR;
if (!projectDir) {
  throw new Error('SAGA_PROJECT_DIR not set');
}
```

## Adding New Variables

If you need to add a new environment variable:

1. **Document it here first** - add to the appropriate table above
2. **Determine the scope**:
   - Session variables: Set in `hooks/session-init.sh`
   - Worker variables: Set in `implement/session-manager.ts`
3. **Use the SAGA_ prefix** - all SAGA variables must be namespaced
4. **Use consistent naming** - the same name should be used everywhere

## Variable Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Interactive Session                           │
├─────────────────────────────────────────────────────────────────┤
│  Claude Code Runtime                                             │
│  └── Sets: CLAUDE_PROJECT_DIR, CLAUDE_PLUGIN_ROOT, CLAUDE_ENV_FILE│
│                          ↓                                       │
│  SessionStart Hook (session-init.sh)                             │
│  └── Detects context (main vs worktree)                          │
│  └── Sets: SAGA_PROJECT_DIR, SAGA_PLUGIN_ROOT, SAGA_TASK_CONTEXT │
│  └── Writes to CLAUDE_ENV_FILE                                   │
│                          ↓                                       │
│  Plugin Skills                                                   │
│  └── User provides epic/story context via skill invocation       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Worker Session (Headless)                     │
├─────────────────────────────────────────────────────────────────┤
│  saga implement                                                  │
│  └── Finds story, validates worktree                             │
│  └── Sets worker env: SAGA_EPIC_SLUG, SAGA_STORY_SLUG, SAGA_STORY_DIR│
│                          ↓                                       │
│  Spawns: claude -p <worker-prompt>                               │
│  └── Worker inherits env vars                                    │
│  └── SessionStart hook also runs (sets core vars)                │
│                          ↓                                       │
│  Worker Execution                                                │
│  └── Uses $SAGA_STORY_DIR to read story.md, journal.md           │
│  └── Uses $SAGA_EPIC_SLUG-$SAGA_STORY_SLUG in commits            │
│  └── scope-validator enforces access boundaries                  │
└─────────────────────────────────────────────────────────────────┘
```

### Example Session Output

**Interactive session (main repository):**
```
# Session Context

SAGA_PROJECT_DIR: /Users/name/my-project
SAGA_PLUGIN_ROOT: /Users/name/my-project/.claude/plugins/saga
SAGA_TASK_CONTEXT: main

These variables are available via the Bash tool: echo $VARIABLE_NAME
```

**Interactive session (worktree):**
```
# Session Context

SAGA_PROJECT_DIR: /Users/name/my-project/.saga/worktrees/user-auth/login-flow
SAGA_PLUGIN_ROOT: /Users/name/my-project/.claude/plugins/saga
SAGA_TASK_CONTEXT: story-worktree

These variables are available via the Bash tool: echo $VARIABLE_NAME
```

**Worker session** (in addition to above, has these env vars set by orchestrator):
```
SAGA_EPIC_SLUG=user-auth
SAGA_STORY_SLUG=login-flow
SAGA_STORY_DIR=/Users/name/my-project/.saga/worktrees/user-auth/login-flow/.saga/epics/user-auth/stories/login-flow
```
