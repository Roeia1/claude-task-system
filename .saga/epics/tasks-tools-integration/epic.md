# Tasks Tools Integration

## Overview

This epic replaces SAGA's markdown-based epic/story system with Claude Code's native Tasks tools. The current workflow uses `.md` files with YAML frontmatter to define and track work. The new system uses structured JSON task lists that workers consume directly via `TaskList`, `TaskGet`, and `TaskUpdate` tools.

Everything becomes a "task list" — there is no distinction between "epic" and "story". A task list is a **worker capsule**: an isolated unit of work executed in its own worktree, branch, and PR.

Task lists can be:
- **Leaf**: Contains executable tasks, executed by a single worker
- **Coordinator**: Contains child task lists with dependencies, orchestrates execution order

The tree structure is optional — a single leaf task list is valid for simple goals.

The source of truth lives in `.saga/tasks/` (git-tracked, project-local). At execution time, SAGA hydrates task lists to `~/.claude/tasks/` for native tool compatibility, then syncs status back via tool hooks.

## Goals

- Enable workers to execute using Claude Code's native Tasks tools (`TaskList` → `TaskGet` → execute → `TaskUpdate`)
- Replace markdown epic/story files with structured JSON task lists
- Support task list nesting with dependencies between child task lists
- Provide a SAGA execution script that manages task list execution
- Maintain git-trackable task definitions in `.saga/tasks/` (JSON format, human-viewable via dashboard)
- Define SAGA-specific types in `saga-types` package, decoupled from Claude Code's task interface

## Success Metrics

- Workers can execute task lists using native Tasks tools with proper status tracking
- Task state is presented in the dashboard during execution
- Cross-session task coordination works via `CLAUDE_CODE_TASK_LIST_ID`
- Execution script handles child task lists and spawns workers in dependency order
- Each leaf task list executes in its own worktree with dedicated branch and PR
- Dashboard can visualize task list trees

## Scope

### In Scope

- Integration with existing infrastructure (hooks, worktree.js, implement.js, scope-validator.js)
- SAGA types in `saga-types` package (`TaskList`, `Task`, conversion layer)
- `tasklist.json` metadata file for each task list (context, children, execution state)
- Flat folder structure in `.saga/tasks/` with canonical naming convention (`--` as hierarchy separator)
- Hydration layer: convert SAGA tasks to Claude Code format, copy to `~/.claude/tasks/`
- Sync layer via tool hooks: update status in `.saga/tasks/` using hooks on Tasks builtin tools
- Execution script that manages task list execution (deterministic, spawns workers, handles children)
- Context injection: task list context provided in worker prompt (not as a task)
- Worker execution loop using native Tasks tools (only real tasks, no synthetic context task)
- Skills for: breakdown (task list creation from defined goal), execution selection, review/discuss task lists
- Dashboard visualization of task list trees

### Out of Scope

- Goal definition process (interactive brainstorming to define what to build) — separate effort
- Parallel worker execution (start with sequential, add parallelism later)
- Import from external systems (JIRA, Linear, etc.)
- Changes to Claude Code's native Tasks tools themselves
- Backward compatibility with existing `.saga/epics/` and `.saga/stories/` markdown files

## Non-Functional Requirements

- Task list files stored as JSON (viewable via dashboard for human-readable presentation)
- Filename and task ID must always be in sync (`{id}.json`)
- Workers must handle context window limits (task descriptions must be self-contained)
- Must work with Claude Code v2.1.30+ headless mode (requires `CLAUDE_CODE_ENABLE_TASKS=true`)
- Hydration/sync operations should minimize corruption risk (e.g., handle partial write failures gracefully)

## Technical Approach

### Task List Storage

Source of truth: `.saga/tasks/` with flat folder structure. Hierarchy is expressed through the `--` naming convention and the `children` array in `tasklist.json`, not through folder nesting.

**Naming convention:**
- Individual task list IDs use `[a-z0-9-]` (lowercase, digits, single dashes)
- `--` (double dash) is the hierarchy separator — banned in individual IDs
- The canonical name is used everywhere: folder name, branch, worktree, tmux session, env vars

**Leaf task list** (simple feature, no nesting):
```
.saga/tasks/
└── add-logout-button/
    ├── tasklist.json           ← metadata: id, title, description, guidance
    ├── write-tests.json        ← task
    └── implement-button.json   ← task
```

**Coordinator task list** (complex feature with children):
```
.saga/tasks/
├── user-authentication/                  ← coordinator (has children in tasklist.json)
│   └── tasklist.json
├── user-authentication--setup-database/  ← child leaf
│   ├── tasklist.json
│   ├── write-tests.json
│   └── create-migrations.json
└── user-authentication--implement-api/   ← child leaf
    ├── tasklist.json
    └── add-endpoints.json
```

Runtime (for native tool compatibility): `~/.claude/tasks/saga__<canonical-name>/`

### Task List Types

**Leaf Task List**:
- Has `tasklist.json` with no `children` array (or empty)
- Contains executable task files (`*.json`)
- Executed by a single worker in its own worktree/branch/PR
- Worker capsule: isolated execution environment

**Coordinator Task List**:
- Has `tasklist.json` with `children` array defining dependencies
- References child task lists by ID (children are sibling folders in `.saga/tasks/`, not nested)
- Execution script processes children sequentially in dependency order
- Not directly executable — orchestrates child execution

### SAGA Types (in `saga-types` package)

> **Breaking change**: The new `TaskList` and `Task` types replace the existing `Task` and related types in `saga-types` entirely. No backward compatibility with the old story-based types (`Task`, `StoryFrontmatter`, etc.).

**TaskList** (stored in `tasklist.json`):
```typescript
interface TaskList {
  id: string;
  title: string;
  description: string;
  guidance?: string;
  doneWhen?: string;
  avoid?: string;
  status?: "pending" | "in_progress" | "completed";
  // Coordinator only:
  children?: Array<{
    id: string;           // canonical name of child task list
    blockedBy: string[];  // IDs of sibling children that must complete first
  }>;
  // Execution state (populated at runtime):
  branch?: string;
  pr?: string;
  worktree?: string;
}
```

**Task** (stored in `{id}.json`):
```typescript
interface Task {
  id: string;
  subject: string;
  description: string;
  activeForm?: string;
  status: "pending" | "in_progress" | "completed";
  blockedBy: string[];  // task IDs within same list
  guidance?: string;
  doneWhen?: string;
}
```

### Conversion Layer

SAGA tasks are converted to Claude Code format during hydration:

```typescript
function toClaudeTask(sagaTask: Task): ClaudeCodeTask {
  return {
    id: sagaTask.id,
    subject: sagaTask.subject,
    description: sagaTask.description,
    activeForm: sagaTask.activeForm,
    status: sagaTask.status,
    blocks: [],  // computed from other tasks' blockedBy
    blockedBy: sagaTask.blockedBy,
    metadata: {
      guidance: sagaTask.guidance,
      doneWhen: sagaTask.doneWhen,
    },
  };
}

function fromClaudeTask(claudeTask: ClaudeCodeTask): Partial<Task> {
  return {
    status: claudeTask.status,
    // Only sync status back; other fields are source-controlled
  };
}
```

### Hydration & Sync

**Hydration (before execution):**
1. Read `tasklist.json` for context (used in worker prompt)
2. Read task files from `.saga/tasks/<canonicalName>/`
3. Convert each SAGA task to Claude Code format
4. Create `~/.claude/tasks/saga__<canonicalName>/`
5. Write converted task files
6. Write `.highwatermark` file

**Sync (via tool hooks):**
- Tool hooks registered for `TaskUpdate`
- Hooks intercept status changes and update `.saga/tasks/<canonicalName>/*.json`
- Only status is synced back (other fields are source-controlled in SAGA)
- Workers may create tasks at runtime via `TaskCreate` for their own tracking; these are not synced back to `.saga/tasks/` and are discarded at cleanup
- Cleanup of `~/.claude/tasks/saga__<canonicalName>/` after execution completes

### SAGA Execution Script

A deterministic script manages task list execution:

**For a leaf task list:**
1. Create worktree and branch for this task list
2. Read `tasklist.json` for context
3. Hydrate task files to `~/.claude/tasks/`
4. Spawn headless worker with context in prompt:
   ```bash
   CLAUDE_CODE_ENABLE_TASKS=true \
   CLAUDE_CODE_TASK_LIST_ID=saga__<canonicalName> \
   claude -p "You are working on: ${title}

   ${description}

   Guidance: ${guidance}

   Done when: ${doneWhen}

   Execute the tasks in the task list using TaskList, TaskGet, and TaskUpdate."
   ```
5. Tool hooks sync status to `.saga/tasks/` during execution
6. Clean up `~/.claude/tasks/` after completion
7. Create PR for the branch

**For a coordinator task list:**
1. Read `tasklist.json` to get children and dependencies
2. Execute children sequentially in dependency order (respecting `blockedBy`)
3. For each child: recursively call execution script
4. Mark coordinator as completed when all children complete

### Worker Execution Loop

Each worker (inside a leaf task list) receives context via prompt, then:

1. `TaskList` → find next pending unblocked task
2. `TaskGet(<task-id>)` → load full description
3. Execute the work (write code, run tests, etc.)
4. `TaskUpdate(<task-id>, status: "completed")`
5. `TaskList` → check for remaining pending/unblocked tasks
6. Repeat until all tasks are completed, then self-terminate

Workers self-terminate when `TaskList` shows all tasks completed. The execution script waits for the worker process to exit. Workers only see real executable tasks — no synthetic context task.

### Error Handling

**Worker crash (process dies mid-execution):**
- Tasks left in `in_progress` status remain in that state in `.saga/tasks/`
- Execution script detects non-zero exit code from the worker process
- Task list is marked as failed; no automatic retry
- User can re-run execution — the hydration layer reads current status from `.saga/tasks/`, so completed tasks are preserved and only remaining tasks are re-attempted

**Stuck tasks:**
- If a worker exits (crash or self-termination) with tasks still in `in_progress`, the execution script resets those tasks to `pending` before marking the task list as failed
- This ensures a clean state for re-execution

**Hydration failure:**
- If writing to `~/.claude/tasks/` fails (permissions, disk space), execution script aborts before spawning the worker
- No partial state to clean up since the worker never started

**Sync failure (hook can't write to .saga/tasks/):**
- Hook logs a warning but does not block the worker
- Status drift between `~/.claude/tasks/` and `.saga/tasks/` is possible but recoverable
- Post-execution reconciliation: execution script reads final state from `~/.claude/tasks/` and writes it to `.saga/tasks/` as a fallback

**Coordinator child failure:**
- If a child task list fails, the coordinator stops executing further children
- Children that depend on the failed child (via `blockedBy`) are not attempted
- Coordinator is marked as failed; user decides whether to retry or intervene

## Integration with Existing Infrastructure

This is not a complete rewrite. SAGA has established mechanisms for worktree isolation, context detection, scope validation, and session management. The new task list system builds on these foundations.

### Preserved Mechanisms

| Mechanism | Current Location | Integration |
|-----------|-----------------|-------------|
| **SessionStart hook** | `hooks/session-init.sh` | Reused for context detection; updated to recognize task list worktrees |
| **Worktree creation** | `scripts/worktree.js` | Extended to create worktrees for leaf task lists |
| **Orchestrator** | `scripts/implement.js` | Refactored to become the execution script; handles task list tree traversal |
| **Scope validator** | `scripts/scope-validator.js` | Updated to validate worker access based on task list path |
| **Tmux sessions** | Used by implement.js | Preserved for detached execution and dashboard monitoring |
| **Dashboard file watcher** | `packages/dashboard/watcher.ts` | Updated to watch `.saga/tasks/` in addition to `.saga/epics/` |

### Environment Variables

The existing environment variable pattern is preserved and extended:

**Core Variables (set by SessionStart hook):**
| Variable | Current | New |
|----------|---------|-----|
| `SAGA_PROJECT_DIR` | Project root or worktree root | Unchanged |
| `SAGA_PLUGIN_ROOT` | Plugin installation path | Unchanged |
| `SAGA_TASK_CONTEXT` | `"main"` or `"story-worktree"` | `"main"` or `"tasklist-worktree"` |
| `SAGA_SESSION_DIR` | `/tmp/saga-sessions` | Unchanged |

**Worker Variables (set by execution script before spawning):**
| Variable | Current | New |
|----------|---------|-----|
| `SAGA_EPIC_SLUG` | Epic identifier | Deprecated (use `SAGA_TASK_LIST_PATH`) |
| `SAGA_STORY_SLUG` | Story identifier | Deprecated (use `SAGA_TASK_LIST_PATH`) |
| `SAGA_STORY_DIR` | Path to story.md in worktree | Deprecated |
| `SAGA_TASK_LIST_PATH` | N/A | Canonical task list name (e.g., `"user-auth--setup-db"`) |
| `SAGA_TASK_LIST_ID` | N/A | Claude Code task list ID (e.g., `"saga__user-auth--setup-db"`) |

### Context Detection

The SessionStart hook (`hooks/session-init.sh`) detects execution context by checking if `.git` is a file (worktree) or directory (main repo):

```bash
if [ -f .git ]; then
    # Inside a worktree - check if it's a task list worktree
    worktree_path=$(pwd)
    if [[ "$worktree_path" == *".saga/worktrees/tasks/"* ]]; then
        SAGA_TASK_CONTEXT="tasklist-worktree"
        # Extract canonical task list name directly from flat worktree folder
        SAGA_TASK_LIST_PATH=$(echo "$worktree_path" | sed 's|.*\.saga/worktrees/tasks/||' | sed 's|/$||')
    fi
else
    SAGA_TASK_CONTEXT="main"
fi
```

### Worktree and Branch Naming

All derived paths use the canonical task list name directly:

| Canonical Name | Branch | Worktree | Task Folder |
|---------------|--------|----------|-------------|
| `add-logout-button` | `tasklist/add-logout-button` | `.saga/worktrees/tasks/add-logout-button/` | `.saga/tasks/add-logout-button/` |
| `user-auth--setup-db` | `tasklist/user-auth--setup-db` | `.saga/worktrees/tasks/user-auth--setup-db/` | `.saga/tasks/user-auth--setup-db/` |
| `user-auth--api--endpoints` | `tasklist/user-auth--api--endpoints` | `.saga/worktrees/tasks/user-auth--api--endpoints/` | `.saga/tasks/user-auth--api--endpoints/` |

**Rationale:**
- One canonical name used everywhere — no conversion between forms
- `--` chosen as hierarchy separator; individual IDs use `[a-z0-9-]` (ban `--` in individual IDs to prevent ambiguity)
- Branch prefix `tasklist/` provides clear namespace separation

### Tmux Session Management

The execution script spawns workers in detached tmux sessions, preserving the existing pattern:

**Session naming:** `saga-tl-<canonical-name>-<pid>`

Example: `saga-tl-user-auth--setup-db-12345`

**Rationale:** Single dash delimiters throughout. `tl` prefix (short for "task list") keeps sessions short and parseable. The canonical name already uses `--` for hierarchy, which is visually distinct from the single `-` structural delimiters.

**Dashboard integration:**
- Dashboard reads tmux sessions via `tmux list-sessions`
- Filters by `saga-tl-` prefix to identify task list executions
- Streams output from session output files for real-time monitoring

### Scope Validation

The scope validator is updated to use task list context:

```javascript
// Current: uses SAGA_EPIC_SLUG and SAGA_STORY_SLUG
const allowedPaths = [
  `.saga/epics/${epicSlug}/stories/${storySlug}/`,
  // ... other allowed paths
];

// New: uses SAGA_TASK_LIST_PATH (canonical name)
const canonicalName = process.env.SAGA_TASK_LIST_PATH;
const allowedPaths = [
  `.saga/tasks/${canonicalName}/`,
  // Project files (for implementation work)
  // ... other allowed paths
];
```

### Dashboard Migration Path

The dashboard needs to support both systems during transition:

1. **Phase 1**: Add `.saga/tasks/` scanner alongside existing `.saga/epics/` scanner
2. **Phase 2**: Unified view showing both legacy stories and new task lists
3. **Phase 3**: Deprecate `.saga/epics/` support once migration complete

File watcher updates:
```typescript
// Current paths
const watchPaths = ['.saga/epics/', '.saga/archive/'];

// New paths (additive)
const watchPaths = [
  '.saga/epics/',    // Legacy support
  '.saga/archive/',  // Legacy support
  '.saga/tasks/',    // New task lists
];
```

## Key Decisions

### SAGA Types Decoupled from Claude Code

- **Choice**: Define SAGA-specific types in `saga-types` package with conversion layer
- **Rationale**: SAGA can evolve independently. If Claude Code's interface changes, only the conversion layer needs updating. First-class fields for `guidance`, `doneWhen`, etc. instead of generic `metadata`.
- **Alternatives**: Directly use Claude Code's task schema (rejected: tight coupling, SAGA fields buried in metadata)

### Context in Prompt, Not as Task

- **Choice**: Inject task list context into worker prompt, not as a `_context` task
- **Rationale**: Workers only see real executable tasks. Cleaner `TaskList` output. Context belongs in the prompt, not as a fake task.
- **Alternatives**: Synthetic `_context` task (rejected: pollutes task list, workers must skip it)

### tasklist.json for Metadata

- **Choice**: Each task list has `tasklist.json` with metadata, separate from task files
- **Rationale**: Clean separation of list metadata vs individual tasks. Children/dependencies defined in one place.
- **Alternatives**: Context as first task (rejected: conflates metadata with tasks)

### Children in tasklist.json, Not Pointer Tasks

- **Choice**: Coordinator task lists define children in `tasklist.json`, not as "pointer tasks"
- **Rationale**: Children are not tasks — they're references to other task lists. Cleaner model: task lists contain only real tasks.
- **Alternatives**: Pointer tasks (rejected: confusing, mixes orchestration with execution)

### Leaf vs Coordinator Distinction

- **Choice**: Task list is either a leaf (has tasks) or coordinator (has children), never both
- **Rationale**: Each leaf = one worker capsule = one worktree/branch/PR. Clear execution model. Intuitive breakdown: coordinators define the major pieces, leaves define the work within each piece.
- **Alternatives**: Mixed task lists with both tasks and children (rejected: unclear execution semantics, complicates worktree/branch model)

### Native Tasks as Runtime, SAGA as Source of Truth

- **Choice**: `.saga/tasks/` is source of truth, hydrate to `~/.claude/tasks/` at runtime
- **Rationale**: Claude Code's task storage is not configurable (always `~/.claude/tasks/`), has no cleanup, and is not git-trackable. SAGA needs project-local, version-controlled storage.
- **Alternatives**: Use `~/.claude/tasks/` directly (rejected: not git-trackable, no cleanup)

### Descriptive Filenames and IDs

- **Choice**: Filename = `{id}.json`, IDs are descriptive slugs (e.g., `write-migration-tests`)
- **Rationale**: Human-readable in file explorer, self-documenting. Claude Code accepts non-numeric string IDs.
- **Alternatives**: Numeric IDs (rejected: not human-readable), hash IDs (rejected: opaque)

### Drop Epic/Story Terminology

- **Choice**: Everything is a "task list", no distinction between epic and story
- **Rationale**: Simpler mental model. Root vs child is just tree depth, not a different concept.
- **Alternatives**: Keep epic/story (rejected: adds confusion when underlying format is the same)

### Runtime TaskCreate Allowed but Not Synced

- **Choice**: Workers may create tasks at runtime via `TaskCreate` for their own tracking, but these are not synced back to `.saga/tasks/`
- **Rationale**: Workers sometimes need to break down work further during execution. These ad-hoc tasks are ephemeral and discarded at cleanup. Only pre-defined tasks in `.saga/tasks/` are the source of truth.
- **Alternatives**: Block `TaskCreate` entirely (rejected: too restrictive), sync new tasks back (rejected: adds complexity, blurs source of truth)

### Flat Canonical Naming

- **Choice**: One canonical name (using `--` as hierarchy separator) used everywhere: `.saga/tasks/`, worktrees, branches, tmux sessions, env vars
- **Rationale**: No conversion between forms. Individual IDs use `[a-z0-9-]`; `--` is banned in individual IDs to prevent ambiguity.
- **Alternatives**: Nested folder structure with path-to-flat conversion (rejected: requires bidirectional conversion, error-prone)

## Data Models

### TaskList Schema (tasklist.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier, matches folder name |
| title | string | Yes | Human-readable title |
| description | string | Yes | Full context for the task list goal |
| guidance | string | No | How to approach the work |
| doneWhen | string | No | Completion criteria |
| avoid | string | No | Patterns to avoid |
| status | enum | No | "pending", "in_progress", "completed" |
| children | array | No | Child task lists with dependencies (coordinator only) |
| branch | string | No | Git branch name (populated at execution) |
| pr | string | No | Pull request URL (populated at execution) |
| worktree | string | No | Worktree path (populated at execution) |

### Task Schema ({id}.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique within task list, matches filename |
| subject | string | Yes | Short imperative title |
| description | string | Yes | Full context for execution |
| activeForm | string | No | Present continuous for spinner ("Writing tests") |
| status | enum | Yes | "pending", "in_progress", "completed" |
| blockedBy | string[] | Yes | Task IDs that must complete first |
| guidance | string | No | How to approach the work |
| doneWhen | string | No | Completion criteria |

### Child Reference Schema (in tasklist.json children array)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Canonical name of the child task list |
| blockedBy | string[] | Yes | IDs of sibling children that must complete first |

## Interface Contracts

### Hydration Service

```
hydrate(canonicalName: string): void
  - Input: canonical task list name (e.g., "user-authentication--setup-database")
  - Reads: .saga/tasks/<canonicalName>/tasklist.json (for context), *.json task files
  - Converts: SAGA tasks to Claude Code format
  - Output: Creates ~/.claude/tasks/saga__<canonicalName>/ with converted tasks
  - Returns: TaskList metadata for prompt injection
```

### Sync via Tool Hooks

```
Tool hooks registered for: TaskUpdate
  - Intercept status changes during worker execution
  - Update status in .saga/tasks/<canonicalName>/*.json
  - Cleanup ~/.claude/tasks/saga__<canonicalName>/ after execution completes
```

### Execution Script

```
execute(canonicalName: string): void
  - Input: canonical task list name (e.g., "user-authentication")
  - For leaf: create worktree, hydrate, spawn worker, create PR
  - For coordinator: execute children sequentially in dependency order
  - Output: All tasks/children completed, PRs created
```

## Tech Stack

- **Types**: `saga-types` package with Zod schemas
- **Storage**: JSON files in `.saga/tasks/` (source of truth) and `~/.claude/tasks/` (runtime)
- **Execution**: Claude Code headless mode with `CLAUDE_CODE_TASK_LIST_ID`
- **Orchestration**: Bash scripts or Node.js for spawning workers and monitoring
- **Dashboard**: Existing SAGA dashboard, updated to read `.saga/tasks/`

## Open Questions

1. **`.highwatermark` management**: String IDs are confirmed to work with Claude Code. Remaining question: verify that hydrating a task list without a `.highwatermark` file (with pre-existing task files using string IDs) works correctly — Claude Code should auto-generate `.highwatermark` and handle its own task creation alongside SAGA-provided tasks. Needs experimental verification.

2. **Dashboard migration**: Dashboard currently reads `.saga/epics/` and `.saga/stories/`. Needs update to read `.saga/tasks/` tree structure and visualize task list hierarchy.

3. ~~**Worktree/branch naming convention**~~: **Resolved** — See "Worktree and Branch Naming" section and "Flat Canonical Naming" key decision. One canonical name used everywhere with `--` as hierarchy separator.
