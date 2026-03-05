# SAGA Plugin Scripts

This document covers all scripts in `packages/saga-utils/src/scripts/`, their CLI interfaces, input/output formats, dependencies, error handling, and build/distribution.

## Overview

SAGA scripts are TypeScript source files compiled via esbuild into standalone Node.js bundles at `plugin/scripts/`. They serve two roles:

1. **CLI scripts** — Invoked by skills or the worker via `node $SAGA_PLUGIN_ROOT/scripts/<name>.js`
2. **Hook callbacks** — In-process functions used by the Agent SDK worker pipeline

### Script Inventory

| Script | Type | Purpose |
|--------|------|---------|
| `find.js` | CLI | Resolve epics/stories by ID with fuzzy matching |
| `create-story.js` | CLI | Create git infrastructure for a story |
| `hydrate.js` | CLI | Convert SAGA tasks to Claude Code task format |
| `schemas.js` | CLI | Output LLM-readable schema documentation |
| `worker.js` | CLI | Story execution pipeline entry point |
| `sessions-kill.js` | CLI | Terminate a tmux worker session |
| `scope-validator.js` | Library | Path validation logic (not a CLI) |
| `scope-validator-hook.js` | Hook | PreToolUse — file access scope enforcement |
| `journal-gate-hook.js` | Hook | PreToolUse — journal entry reminder |
| `sync-hook.js` | Hook | PostToolUse — sync task status to disk |
| `auto-commit-hook.js` | Hook | PostToolUse — auto-commit on task completion |
| `task-pacing-hook.js` | Hook | PostToolUse — track tasks per session |
| `token-limit-hook.js` | Hook | PostToolUse — enforce token budget |

---

## CLI Scripts

### find.js

Resolves flexible identifiers (IDs, partial names) to epic or story metadata using exact matching and Fuse.js fuzzy search.

**Usage:**
```bash
node find.js <query>                        # Find a story (default)
node find.js <query> --type epic            # Find an epic
node find.js <query> --type story           # Find a story (explicit)
node find.js <query> --status in_progress   # Filter by status
```

**Environment:** `SAGA_PROJECT_DIR` (required)

**Output (JSON, stdout):**
```json
// Single match found
{ "found": true, "data": { "storyId": "...", "title": "...", "status": "...", "worktreePath": "..." } }

// Multiple ambiguous matches
{ "found": false, "matches": [{ "storyId": "...", ... }, ...] }

// No match or error
{ "found": false, "error": "No story found matching 'xyz'" }
```

**Exit codes:** `0` = found, `1` = not found or error

**Resolution strategy:**
1. Exact match on normalized ID (case-insensitive, hyphens/underscores normalized)
2. Fuse.js fuzzy search with score thresholds:
   - `FUZZY_THRESHOLD = 0.3` for auto-selection
   - `MATCH_THRESHOLD = 0.6` for inclusion
   - `SCORE_SIMILARITY_THRESHOLD = 0.1` for disambiguation
3. Story search weights: `storyId` (2x) > `title` (1x)

**Dependencies:** `fuse.js` for fuzzy matching, `storage.ts` for `scanStories()`, `directory.ts` for path resolution

**Invoked by:** execute-story, resolve-blocker, generate-stories skills (via `!` bang command)

---

### create-story.js

Creates complete git infrastructure for a story: branch, worktree, files, commit, push, and draft PR.

**Usage:**
```bash
node create-story.js --input story.json           # Read from file
node create-story.js --input story.json --skip-pr  # Skip PR creation
node create-story.js --skip-install                # Skip dependency install
echo '{"story":{...},"tasks":[...]}' | node create-story.js  # Read from stdin
```

**Options:**
- `--input <path>` — Read JSON from file (recommended)
- `--skip-install` — Skip dependency installation in worktree
- `--skip-pr` — Skip draft PR creation
- `--help` — Show help

**Environment:** `SAGA_PROJECT_DIR` (required)

**Input format (JSON):**
```json
{
  "story": {
    "id": "auth-login",
    "title": "Login Endpoint",
    "description": "...",
    "epic": "user-auth"
  },
  "tasks": [
    {
      "id": "write-tests",
      "subject": "Write login tests",
      "description": "...",
      "activeForm": "Writing login tests",
      "status": "pending",
      "blockedBy": []
    }
  ]
}
```

Input is validated against `StorySchema` and `TaskSchema` (Zod).

**Output (JSON, stdout):**
```json
// Success
{
  "success": true,
  "storyId": "auth-login",
  "storyTitle": "Login Endpoint",
  "branch": "story/auth-login",
  "worktreePath": "/path/.saga/worktrees/auth-login",
  "prUrl": "https://github.com/org/repo/pull/42"
}

// Failure
{ "success": false, "error": "Branch already exists: story/auth-login" }
```

**Exit codes:** `0` = success, `1` = failure

**Pipeline steps:**
1. **Create worktree**: `git fetch origin main`, `git branch story/<id>`, `git worktree add`
2. **Install deps**: Detect package manager (pnpm > yarn > bun > npm), run install
3. **Write files**: `story.json` + individual task JSONs via `writeStory()`/`writeTask()`
4. **Commit & push**: `git add`, `git commit -m "docs(<id>): add story definition"`, `git push -u`
5. **Create draft PR**: `gh pr create --draft`, then amend commit with PR URL

**Git interactions:** Uses `execFileSync('git', ...)` for all git operations. Uses `gh` CLI for PR creation (best-effort, continues on failure).

**Package manager detection:** Checks for lockfiles in order: `pnpm-lock.yaml` > `yarn.lock` > `bun.lockb`/`bun.lock` > `package-lock.json` > `package.json`

**Invoked by:** plan skill (task "Create artifacts")

---

### hydrate.js

Converts SAGA task files to Claude Code's native task format and writes them to `~/.claude/tasks/`.

**Usage:**
```bash
node hydrate.js <story-id>                    # Use current timestamp
node hydrate.js <story-id> <session-timestamp> # Specific timestamp
```

**Environment:**
- `SAGA_PROJECT_DIR` (required)
- `SAGA_CLAUDE_TASKS_BASE` (optional, override for testing)

**Output (JSON, stdout):**
```json
// Success
{
  "success": true,
  "taskListId": "saga__auth-login__1700000000000",
  "taskCount": 5,
  "storyMeta": {
    "title": "Login Endpoint",
    "description": "...",
    "guidance": "...",
    "doneWhen": "...",
    "avoid": "..."
  }
}

// Failure
{ "success": false, "error": "..." }
```

**Exit codes:** `0` = success, `1` = failure

**What it does:**
1. Reads SAGA task files from `.saga/stories/<storyId>/`
2. Converts each task to Claude Code format (different field names, namespace prefixing)
3. Writes converted tasks to `~/.claude/tasks/saga__<storyId>__<timestamp>/`
4. Returns the `taskListId` for use in headless runs

**Invoked by:** worker.js (step 3/4)

---

### schemas.js

Generates LLM-readable markdown documentation for SAGA schemas. Uses Zod introspection to extract field types and requirements.

**Usage:**
```bash
node schemas.js epic               # Epic schema docs
node schemas.js story              # Story schema docs
node schemas.js task               # Task schema docs
node schemas.js create-story-input # Combined input format docs
```

**Output:** Markdown to stdout containing:
- Field table (name, type, required, description)
- Realistic example JSON
- Writing guide with best practices
- For `create-story-input`: all three schemas + input skeleton + full example

**Exit codes:** `0` = success, `1` = unknown schema

**Zod introspection:** The `describeZodType()` function recursively inspects `_def.typeName` to map Zod types to human-readable strings (string, number, boolean, enum, array, object, etc.). Handles `ZodOptional` and `ZodDefault` wrappers.

**Invoked by:** plan skill (task "Generate story content") — teaches the LLM the exact JSON format to produce

---

### worker.js

The story execution pipeline entry point. Orchestrates the full lifecycle of autonomous story implementation.

**Usage:**
```bash
node worker.js <story-id>                           # Basic execution
node worker.js <story-id> --messages-file output.jsonl # With JSONL output
```

**Environment:**
- `SAGA_PROJECT_DIR` (required)
- `SAGA_PLUGIN_ROOT` (required)

**Configuration:** Read from `.saga/config.json` under `"worker"` key:
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

**Exit codes:**
- `0` — All tasks completed successfully, PR marked ready
- `1` — Error occurred
- `2` — Max cycles or timeout reached

**Pipeline:**
1. **Setup worktree** (`setup-worktree.ts`): Ensure worktree and branch exist
2. **Create draft PR** (`create-draft-pr.ts`): Create PR if not exists
3. **Hydrate tasks** (`hydrate-tasks.ts`): Read story.json, convert tasks to Claude Code format
4. **Resolve MCP servers** (`resolve-mcp-servers.ts`): Load MCP server config from `.saga/config.json`
5. **Run headless loop** (`run-headless-loop.ts`): Execute Claude Code headless runs with hooks
6. **Mark PR ready** (`mark-pr-ready.ts`): Convert draft PR to ready if all tasks completed

**Message writer:** Writes structured JSONL events (pipeline_start, pipeline_step, pipeline_end) to the messages file for monitoring.

**Worker sub-modules** (in `worker/`):

| Module | Purpose |
|--------|---------|
| `setup-worktree.ts` | Git worktree and branch creation/verification |
| `create-draft-pr.ts` | Draft PR creation via `gh` CLI |
| `hydrate-tasks.ts` | Task format conversion and file writing |
| `run-headless-loop.ts` | Cycle management, headless Claude invocation, hook registration |
| `mark-pr-ready.ts` | PR status update, status summary building |
| `message-writer.ts` | JSONL file writer for pipeline events |
| `resolve-worker-config.ts` | Read and merge config from `.saga/config.json` |
| `resolve-mcp-servers.ts` | Read MCP server configuration |

**Invoked by:** execute-story skill (inside tmux session)

---

### sessions-kill.js

Terminates a SAGA worker tmux session.

**Usage:**
```bash
node sessions-kill.js <session-name>
```

**Output (JSON, stdout):**
```json
{ "killed": true }   // Session terminated
{ "killed": false }  // Session not found or couldn't be terminated
```

**Exit codes:** `0` = command completed (check `killed`), `1` = invalid arguments

**Validation:** Session name must start with `saga__`

**Invoked by:** Dashboard CLI (`npx @saga-ai/dashboard sessions kill`)

---

## Shared Utilities

### shared/env.ts

Environment variable helpers used by all scripts:

| Function | Variable | Description |
|----------|----------|-------------|
| `getProjectDir()` | `SAGA_PROJECT_DIR` | Project root directory |
| `getPluginRoot()` | `SAGA_PLUGIN_ROOT` | Plugin installation path |
| `getStoryId()` | `SAGA_STORY_ID` | Current story ID (worker context) |
| `getStoryTaskListId()` | `SAGA_STORY_TASK_LIST_ID` | Task list ID (worker context) |

All throw descriptive `Error` if the variable is not set.

### scope-validator.ts

Path validation library (not a CLI script). Exported function:

```typescript
validatePath(filePath, worktreePath, scope, toolName?): string | null
```

Returns `null` if access is allowed, or a violation reason string if blocked.

**Validation rules:**
1. File must be within the worktree directory
2. `.saga/archive/` is always blocked
3. `.saga/stories/<otherStoryId>/` is blocked (can only access own story)
4. `.saga/epics/<epicId>/stories/` is blocked
5. Write tools (`Write`, `Edit`) cannot modify `.saga/` files except `journal.md` of the assigned story

---

## Hook Scripts

All hooks are in-process Agent SDK callbacks (not subprocess scripts). They implement `HookCallback` from `@anthropic-ai/claude-agent-sdk`.

### scope-validator-hook.ts (PreToolUse)

```typescript
createScopeValidatorHook(worktreePath, storyId): HookCallback
```

Wraps `validatePath()` as a PreToolUse hook. Extracts `file_path` or `path` from tool input and validates against scope rules. Returns `{ permissionDecision: 'deny' }` on violation.

### journal-gate-hook.ts (PreToolUse)

```typescript
createJournalGateHook(worktreePath, storyId): HookCallback
```

Fires on `TaskUpdate` when `status === 'completed'`. Adds `additionalContext` reminding the agent to write a journal entry. This is a soft reminder — the task update always proceeds.

### sync-hook.ts (PostToolUse)

```typescript
createSyncHook(worktreePath, storyId): HookCallback
```

Fires on `TaskUpdate` when both `taskId` and `status` are present. Reads the task JSON file from `.saga/stories/<storyId>/<taskId>.json`, updates its `status` field, and writes it back. Sync failures are silently caught to avoid crashing the agent.

### auto-commit-hook.ts (PostToolUse)

```typescript
createAutoCommitHook(worktreePath, storyId): HookCallback
```

Fires on `TaskUpdate` when `status === 'completed'`. Runs a git pipeline:
1. `git add .`
2. `git commit -m "feat(<storyId>): complete <taskId>"`
3. `git push`

On failure, returns `additionalContext` with the error so the agent can fix and retry manually. On success, confirms "Changes committed and pushed."

### task-pacing-hook.ts (PostToolUse)

```typescript
createTaskPacingHook(worktreePath, storyId, maxTasksPerSession): HookCallback
```

Tracks the count of completed tasks. On each completion, returns `additionalContext` with context usage guidance. When `completedCount >= maxTasksPerSession`, instructs the agent to finish the session.

### token-limit-hook.ts (PostToolUse)

```typescript
createTokenLimitHook(tracker, maxTokens): HookCallback
```

Reads `tracker.inputTokens` (updated externally from the message loop) and compares against `maxTokens`. When exceeded, returns `additionalContext` telling the agent to wrap up immediately.

**TokenTracker interface:**
```typescript
interface TokenTracker {
  inputTokens: number;
}
```

---

## Dependencies Between Scripts

```
worker.js
  -> setup-worktree.ts (git operations)
  -> create-draft-pr.ts (gh CLI)
  -> hydrate-tasks.ts -> hydrate.js logic
  -> run-headless-loop.ts
       -> scope-validator-hook.ts -> scope-validator.ts
       -> journal-gate-hook.ts
       -> sync-hook.ts
       -> auto-commit-hook.ts
       -> task-pacing-hook.ts
       -> token-limit-hook.ts
  -> mark-pr-ready.ts (gh CLI)
  -> resolve-worker-config.ts
  -> resolve-mcp-servers.ts

find.js
  -> finder.ts (Fuse.js, storage.ts, directory.ts)

create-story.js
  -> create-story/service.ts (git, gh, storage.ts, directory.ts)

schemas.js
  -> schemas/ (Zod schema definitions)

hydrate.js
  -> hydrate/service.ts -> hydrate/conversion.ts, hydrate/namespace.ts

sessions-kill.js
  -> (standalone, uses child_process for tmux)
```

All CLI scripts depend on `shared/env.ts` for environment variables.

---

## Error Handling Patterns

### JSON Error Output

All CLI scripts output errors as JSON to stdout (not stderr) for LLM consumption:
```json
{ "success": false, "error": "descriptive message" }
// or
{ "found": false, "error": "descriptive message" }
```

### Exit Codes

- Scripts use `process.exit(1)` for errors
- Worker uses `process.exit(2)` for max cycles/timeout (distinct from errors)
- `sessions-kill.js` always exits `0` — check the `killed` field

### Hook Error Handling

- All hooks return `{ continue: true }` even on failure — they must never crash the agent
- `sync-hook.ts` has a bare `catch {}` around its entire operation
- `auto-commit-hook.ts` logs failures to stderr and surfaces them via `additionalContext`
- `scope-validator-hook.ts` returns `{ permissionDecision: 'deny' }` on violations (blocks the tool call)

### Graceful Degradation

- `create-story.js`: PR creation is best-effort (continues without PR on failure)
- `worker.js`: Pipeline catches top-level errors and exits with code 1

---

## Build and Distribution

### Source

TypeScript source lives at `packages/saga-utils/src/scripts/`. Each `.ts` file (excluding tests, `index.ts`, and subdirectory files) is an esbuild entry point.

### Build Configuration (`esbuild.config.mjs`)

```javascript
await build({
  entryPoints,          // All .ts files in src/scripts/ (non-test, non-index)
  outdir: 'plugin/scripts/',  // Output to plugin directory
  bundle: true,         // Bundle all dependencies
  platform: 'node',
  format: 'esm',
  target: 'node18',
  banner: { js: '#!/usr/bin/env node' },
  packages: 'bundle',   // Bundle npm dependencies (not just local imports)
  sourcemap: false,
  minify: false,        // Keep readable for debugging
});
```

### Key Build Properties

- **Bundle everything**: All dependencies (including `fuse.js`, `zod`, `@anthropic-ai/claude-agent-sdk`) are bundled into each script
- **Self-contained**: Each output `.js` file is a standalone executable with no runtime npm dependencies
- **ESM format**: Output uses ES modules (`import`/`export`)
- **Node 18 target**: Compatible with Node.js 18+
- **Shebang**: Every output file starts with `#!/usr/bin/env node`
- **Readable output**: Not minified, making debugging straightforward

### Output

Built files go to `plugin/scripts/` in the repo root:
```
plugin/scripts/
  find.js
  create-story.js
  hydrate.js
  schemas.js
  worker.js
  sessions-kill.js
  scope-validator.js
  scope-validator-hook.js
  journal-gate-hook.js
  sync-hook.js
  auto-commit-hook.js
  task-pacing-hook.js
  token-limit-hook.js
  storage.js
  package.json
```

### Build Command

```bash
cd packages/saga-utils
pnpm build    # Runs: node esbuild.config.mjs
```

The `prebuild` script runs `biome check --write .` for linting/formatting before building.
