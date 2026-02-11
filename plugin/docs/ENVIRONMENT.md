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
| `SAGA_SESSION_DIR` | Directory for session output files (tmux session logs, wrapper scripts) | `/tmp/saga-sessions` |

**Note**: All paths are absolute. `SAGA_PROJECT_DIR` points to different locations depending on context:
- In main repo: The project root directory (e.g., `/Users/name/my-project`)
- In worktree: The worktree root (e.g., `/Users/name/my-project/.saga/worktrees/{storyId}`)

### Worker Environment Variables

These variables are **only** set when the worker script (`worker.ts`) spawns headless Claude runs. They are NOT set during interactive sessions.

The worker's headless run loop (`worker/run-headless-loop.ts`) sets these before spawning each `claude -p` process:

| Variable | Description | Example |
|----------|-------------|---------|
| `SAGA_STORY_ID` | Story identifier | `"login-flow"` |
| `SAGA_STORY_TASK_LIST_ID` | Claude Code native Tasks list identifier for the story | `"saga-login-flow-1707600000"` |
| `CLAUDE_CODE_ENABLE_TASKS` | Enables Claude Code native Tasks tools | `"true"` |
| `CLAUDE_CODE_TASK_LIST_ID` | Claude Code Tasks list ID (same value as `SAGA_STORY_TASK_LIST_ID`) | `"saga-login-flow-1707600000"` |

Workers use these variables for:
- Scope validation (the `scope-validator` hook uses `SAGA_STORY_ID` to enforce access boundaries)
- Task sync (the `sync-hook` uses `SAGA_STORY_ID` to sync task status back to story files)
- Commit messages: `feat(<storyId>): description`

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

When the `/execute-story` skill launches a worker via `worker.js`:

1. The worker script runs the pipeline (worktree setup, draft PR, task hydration)
2. The headless run loop sets worker env vars before spawning `claude -p`
3. Worker receives: `SAGA_STORY_ID`, `SAGA_STORY_TASK_LIST_ID`, `CLAUDE_CODE_ENABLE_TASKS`, `CLAUDE_CODE_TASK_LIST_ID`
4. SessionStart hook also runs, setting core variables

## Usage Patterns

### In Skill/Instruction Files

Use `${VARIABLE}` syntax (braced) for consistency:

```markdown
Read the file at `${SAGA_PLUGIN_ROOT}/templates/example.md`
```

### In Worker Prompt (Bash commands)

```bash
git commit -m "feat(<storyId>): description"
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
   - Worker variables: Set in `worker/run-headless-loop.ts`
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
│  /execute-story skill                                            │
│  └── Finds story, updates worktree branch                        │
│  └── Launches worker.js in tmux session                          │
│                          ↓                                       │
│  Worker Pipeline (worker.ts)                                     │
│  └── Setup worktree, create draft PR, hydrate tasks              │
│  └── Sets worker env: SAGA_STORY_ID, SAGA_STORY_TASK_LIST_ID    │
│                          ↓                                       │
│  Spawns: claude -p <prompt> (headless run loop)                  │
│  └── Headless Claude inherits env vars                           │
│  └── SessionStart hook also runs (sets core vars)                │
│                          ↓                                       │
│  Headless Execution                                              │
│  └── Uses native Tasks tools (TaskList, TaskGet, TaskUpdate)     │
│  └── scope-validator uses SAGA_STORY_ID for access boundaries    │
│  └── sync-hook syncs task status back to story files             │
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

SAGA_PROJECT_DIR: /Users/name/my-project/.saga/worktrees/login-flow
SAGA_PLUGIN_ROOT: /Users/name/my-project/.claude/plugins/saga
SAGA_TASK_CONTEXT: story-worktree

These variables are available via the Bash tool: echo $VARIABLE_NAME
```

**Headless worker run** (in addition to above, has these env vars set by worker pipeline):
```
SAGA_STORY_ID=login-flow
SAGA_STORY_TASK_LIST_ID=saga-login-flow-1707600000
CLAUDE_CODE_ENABLE_TASKS=true
CLAUDE_CODE_TASK_LIST_ID=saga-login-flow-1707600000
```
