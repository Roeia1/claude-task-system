# Worker Architecture Documentation

Internal developer documentation for the SAGA worker script -- the pipeline that orchestrates autonomous story execution via headless Claude sessions.

## Overview

The worker is a linear pipeline that takes a story ID and runs it to completion. It lives in `packages/saga-utils/src/scripts/worker.ts` with supporting modules in `packages/saga-utils/src/scripts/worker/`.

### Pipeline Steps

```
1. Setup worktree and branch    → setup-worktree.ts
2. Create draft PR              → create-draft-pr.ts
3. Read story.json for context  → hydrate-tasks.ts (combined with step 4)
4. Hydrate tasks to ~/.claude/  → hydrate-tasks.ts
5. Loop headless Claude runs    → run-headless-loop.ts
6. Mark PR ready on completion  → mark-pr-ready.ts
```

### Entry point

```
node worker.js <story-id> [--messages-file <path>]
```

Required environment variables:
- `SAGA_PROJECT_DIR` -- project root directory
- `SAGA_PLUGIN_ROOT` -- plugin root directory

---

## 1. CLI Argument Parsing

The `parseArgs()` function in `worker.ts` handles:

| Argument | Required | Description |
|----------|----------|-------------|
| `<story-id>` | Yes | Story identifier (e.g., `auth-setup-db`) |
| `--messages-file <path>` | No | Path for JSONL message output stream |
| `--help`, `-h` | No | Print usage and exit |

On invalid input, prints error to stderr and returns `null` (causes `process.exit(1)`).

---

## 2. Worker Configuration (`resolve-worker-config.ts`)

Configuration is read from `.saga/config.json` under the `"worker"` key:

```json
{
  "worker": {
    "maxCycles": 10,
    "maxTime": 60,
    "maxTasksPerSession": 3,
    "maxTokensPerSession": 120000,
    "model": "opus"
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `maxCycles` | 10 | Maximum headless run cycles |
| `maxTime` | 60 | Maximum total time in minutes |
| `maxTasksPerSession` | 3 | Max tasks completed per headless session before exit |
| `maxTokensPerSession` | 120,000 | Input token budget per headless session |
| `model` | `"opus"` | Claude model to use |

All integer options are validated as positive integers via `toPositiveInt()`. Invalid or missing config returns an empty object (all defaults apply).

---

## 3. Step 1: Worktree Setup (`setup-worktree.ts`)

Creates a git worktree and branch for the story.

- **Branch naming**: `story/<storyId>`
- **Worktree path**: `.saga/worktrees/<storyId>/`
- **Idempotent**: Reuses existing worktrees; re-creates from existing branches if worktree was removed

### Logic flow:

1. If worktree directory exists and is a valid git worktree → reuse it
2. If directory exists but is broken → remove and recreate
3. Fetch latest main branch from origin
4. If branch exists → `git worktree add <path> <branch>`
5. If branch doesn't exist → `git worktree add -b <branch> <path> origin/<main>`

Main branch is detected via `git symbolic-ref refs/remotes/origin/HEAD`, falling back to `"main"`.

### Return type:

```typescript
interface SetupWorktreeResult {
  worktreePath: string;    // Full path to worktree directory
  branch: string;          // Branch name (story/<storyId>)
  alreadyExisted: boolean; // Whether worktree was reused
}
```

---

## 4. Step 2: Draft PR Creation (`create-draft-pr.ts`)

Creates a GitHub draft PR for the story branch.

### Logic flow:

1. Check if PR already exists via `gh pr list --head <branch>`
2. If exists → return existing PR URL
3. Push branch to origin via `git push -u origin <branch>`
4. Create draft PR via `gh pr create --draft --title "Story: <storyId>"`

**Idempotent**: Skips creation if PR already exists.

---

## 5. Steps 3-4: Task Hydration (`hydrate-tasks.ts`)

Reads story metadata and SAGA task files, converts them to Claude Code format, and writes them to `~/.claude/tasks/<taskListId>/`.

Delegates to `hydrate/service.ts` which:
1. Reads `story.json` from the worktree's `.saga/stories/<storyId>/`
2. Reads all `{task-id}.json` files from the same directory
3. Converts each SAGA task to Claude Code format via `toClaudeTask()`
4. Generates a unique `taskListId` using `<storyId>-<timestamp>`
5. Writes task files to `~/.claude/tasks/<taskListId>/`

### Return type:

```typescript
interface HydrationResult {
  taskListId: string;  // Unique ID for the Claude Code task list
  taskCount: number;   // Number of tasks hydrated
  storyMeta: StoryMeta; // Story metadata for prompt building
}
```

---

## 6. MCP Server Resolution (`resolve-mcp-servers.ts`)

Reads `.saga/config.json` and returns the `mcpServers` object if present. This allows stories to run with project-specific MCP servers (e.g., shadcn).

Returns `undefined` when no config or no `mcpServers` field exists, letting the Agent SDK load MCPs from `.mcp.json` and other filesystem settings.

---

## 7. Step 5: Headless Run Loop (`run-headless-loop.ts`)

The core execution engine. Spawns sequential headless Claude sessions via the Agent SDK until all tasks complete or limits are reached.

### Architecture

```
runHeadlessLoop()
  ├── buildPrompt()           → Construct the prompt from story metadata
  ├── runSequentialCycles()   → Async iterator over cycles
  │   └── executeCycle()      → Single cycle: spawn + check
  │       └── spawnHeadlessRun()  → Agent SDK query()
  └── checkAllTasksCompleted() → Read task files from disk
```

### Prompt Building

The prompt is constructed from:
1. **Worker instructions** (from `prompts/worker-instructions.ts`) -- TDD workflow, journal writing, context management, scope rules
2. **Story metadata** -- title, description, guidance, doneWhen, avoid
3. **Execution directive** -- "Execute the tasks in the task list using TaskList, TaskGet, and TaskUpdate."

### Headless Run Spawning

Each cycle calls `query()` from `@anthropic-ai/claude-agent-sdk` with:

```typescript
{
  pathToClaudeCodeExecutable: resolveClaudeBinary(),
  model: "opus",
  cwd: worktreePath,
  settingSources: ['user', 'project', 'local'],
  env: {
    SAGA_PROJECT_DIR: worktreePath,
    CLAUDE_CODE_ENABLE_TASKS: 'true',
    CLAUDE_CODE_TASK_LIST_ID: taskListId,
    SAGA_STORY_ID: storyId,
    SAGA_STORY_TASK_LIST_ID: taskListId,
  },
  permissionMode: 'bypassPermissions',
  hooks: { ... },  // See Hook System below
  mcpServers: { ... },  // From config.json if present
}
```

The `for await` loop over `query()` messages:
- Extracts `input_tokens` from assistant messages to update the `TokenTracker`
- Writes all messages to the `MessageWriter` (JSONL file or noop)
- Captures the exit code from `result` messages

### Cycle Loop

Each cycle:
1. Check time limit (`Date.now() - startTime >= maxTimeMs`)
2. Check max cycles (`cycles >= maxCycles`)
3. Write `cycle_start` message
4. Spawn headless run and wait for completion
5. Write `cycle_end` message
6. On non-zero exit code: count cycle, continue (don't check tasks)
7. On success: check if all task files in the story directory have `status: "completed"`
8. If all completed → set `allCompleted = true`, stop loop
9. Otherwise → continue to next cycle

### Return type:

```typescript
interface RunLoopResult {
  allCompleted: boolean;   // Whether all tasks finished
  cycles: number;          // How many cycles were executed
  elapsedMinutes: number;  // Total wall-clock time
}
```

---

## 8. Hook System

The worker registers six hooks with the Agent SDK, split across PreToolUse and PostToolUse events:

### PreToolUse Hooks

| Hook | Matcher | File | Purpose |
|------|---------|------|---------|
| Scope Validator | `Read\|Write\|Edit\|Glob\|Grep` | `scope-validator-hook.ts` | Validates file paths stay within worktree and story scope. Denies access to files outside the worktree or other stories' directories. |
| Journal Gate | `TaskUpdate` | `journal-gate-hook.ts` | Reminds the agent to write a journal entry before marking a task as completed. Soft reminder only (never blocks). |

### PostToolUse Hooks

| Hook | Matcher | File | Purpose |
|------|---------|------|---------|
| Sync | `TaskUpdate` | `sync-hook.ts` | Syncs `TaskUpdate` status changes back to SAGA task JSON files on disk. Only syncs `status` field. |
| Auto-Commit | `TaskUpdate` | `auto-commit-hook.ts` | On task completion: `git add . && git commit && git push`. Reports errors via `additionalContext` for agent to fix. |
| Task Pacing | `TaskUpdate` | `task-pacing-hook.ts` | Tracks completed task count. When `maxTasksPerSession` is reached, instructs agent to finish the session. |
| Token Limit | *(all tools)* | `token-limit-hook.ts` | Checks `TokenTracker.inputTokens` against `maxTokensPerSession`. When exceeded, instructs agent to wrap up, commit, and exit. |

### Hook execution order on TaskUpdate (completion):

```
PreToolUse:
  1. Journal Gate → reminder to write journal

PostToolUse:
  1. Sync → write status to disk
  2. Auto-Commit → git add/commit/push
  3. Task Pacing → check task count limit
  4. Token Limit → check token budget
```

### Token Tracking

The `TokenTracker` is a shared mutable object:
- **Written by**: The `for await` message loop in `spawnHeadlessRun()`, which extracts `input_tokens` from assistant messages
- **Read by**: The `createTokenLimitHook()` callback on every tool use

When `inputTokens >= maxTokensPerSession`, the hook returns:
```
[TOKEN LIMIT] You have reached the session token limit.
Wrap up your current work immediately: commit progress,
update task status, write a journal entry, and exit cleanly.
Do NOT start any new tasks.
```

---

## 9. Step 6: PR Readiness (`mark-pr-ready.ts`)

After the loop completes:
- If `allCompleted` is true → `gh pr ready <branch>` to convert draft PR to ready for review
- If not all completed → no-op (PR stays as draft)
- PR readiness failures are logged as warnings but don't fail the pipeline

---

## 10. Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success -- all tasks completed |
| `1` | Error (missing args, missing env vars, failed worktree setup, etc.) |
| `2` | Timeout or max cycles reached (tasks incomplete) |

---

## 11. Message Writing (`message-writer.ts`)

The `MessageWriter` interface supports JSONL output:

```typescript
interface MessageWriter {
  write(message: WorkerMessage): void;
}
```

Two implementations:
- **`createFileMessageWriter(path)`** -- Appends JSON lines to a file using `appendFileSync`. Lazily creates parent directories.
- **`createNoopMessageWriter()`** -- Discards all messages (used when no `--messages-file` flag).

Messages written include both:
- **SAGA worker events**: `pipeline_start`, `pipeline_step`, `pipeline_end`, `cycle_start`, `cycle_end`
- **Agent SDK messages**: All messages from the `query()` stream (assistant, result, system, etc.)

---

## 12. Environment Variables

| Variable | Set By | Used In | Purpose |
|----------|--------|---------|---------|
| `SAGA_PROJECT_DIR` | User/tmux session | `worker.ts` → `getProjectDir()` | Project root directory |
| `SAGA_PLUGIN_ROOT` | User/tmux session | `shared/env.ts` | Plugin root for skill paths |
| `SAGA_STORY_ID` | Worker → headless env | Hooks, scripts | Current story identifier |
| `SAGA_STORY_TASK_LIST_ID` | Worker → headless env | Hooks, scripts | Claude Code task list ID |
| `CLAUDE_CODE_ENABLE_TASKS` | Worker → headless env | Claude Code SDK | Enables native Tasks tools |
| `CLAUDE_CODE_TASK_LIST_ID` | Worker → headless env | Claude Code SDK | Points to the hydrated task list |
| `CLAUDECODE` | Worker → headless env (unset) | Claude Code | Unset to avoid detection issues |

---

## 13. End-to-End Flow Summary

```
worker.ts main()
  │
  ├── parseArgs()                    # Parse CLI: story-id, --messages-file
  ├── getProjectDir()                # Read SAGA_PROJECT_DIR
  ├── resolveWorkerConfig()          # Read .saga/config.json worker options
  ├── createWriter()                 # File or noop message writer
  │
  ├── Step 1: setupWorktree()        # Create/reuse git worktree + branch
  ├── Step 2: createDraftPr()        # Push branch, create GitHub draft PR
  ├── Step 3-4: hydrateTasks()       # Read story, convert tasks, write to ~/.claude/tasks/
  ├── resolveMcpServers()            # Read MCP config from .saga/config.json
  │
  ├── Step 5: runHeadlessLoop()      # Core execution
  │   ├── buildPrompt()              # Worker instructions + story metadata
  │   └── for each cycle:
  │       ├── spawnHeadlessRun()     # Agent SDK query() with hooks
  │       │   ├── PreToolUse hooks   # Scope validation, journal reminder
  │       │   └── PostToolUse hooks  # Sync, auto-commit, pacing, token limit
  │       └── checkAllTasksCompleted() # Read task files from disk
  │
  ├── Step 6: markPrReady()          # Convert draft PR to ready (if all done)
  └── buildStatusSummary()           # Exit code: 0 (success) or 2 (timeout)
```
