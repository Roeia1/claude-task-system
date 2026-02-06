# Tasks Tools Integration

## Overview

This epic replaces SAGA's markdown-based system with Claude Code's native Tasks tools. The current workflow uses `.md` files with YAML frontmatter to define and track work. The new system uses structured JSON files that workers consume via `TaskList`, `TaskGet`, and `TaskUpdate` tools.

The domain model is:

- **Epic**: A group of connected stories with dependencies. Optional — only needed when a goal requires multiple stories.
- **Story**: The worker capsule. A self-contained unit of work with its own task list, worktree, branch, and PR. Executed by a single worker.
- **Task**: Atomic work item within a story. What the worker's headless runs see and execute via Claude Code's native task tools.

The source of truth lives in `.saga/stories/` and `.saga/epics/` (git-tracked, project-local). At execution time, SAGA hydrates tasks to `~/.claude/tasks/` for native tool compatibility, then syncs status back via tool hooks.

## Glossary

| Term | Definition |
|------|-----------|
| **Epic** | A group of connected stories with dependencies between them. Optional — only needed when a goal requires multiple stories. Defines which stories exist and their execution order. |
| **Story** | The worker capsule. A self-contained unit of work with its own task list, worktree, branch, and PR. Executed by a single worker. The fundamental unit of delivery in SAGA. |
| **Task** | Atomic work item within a story. What the worker's headless runs see and execute via Claude Code's native task tools (`TaskList`, `TaskGet`, `TaskUpdate`). |
| **Journal** | Part of the story. A log where the worker records key decisions, diversions, blockers, and resolutions during execution. Git-tracked alongside the story. |
| **Blocker** | An obstacle encountered during execution that requires human decision. The worker documents it in the journal and exits. Execution pauses until a human resolves it. |
| **Worker** | A node process responsible for implementing a story. Runs inside a session. Manages Claude Code headless runs, handles configuration (hydration, sync, cleanup), and streams output to a file. One worker per story. |
| **Session** | The tmux detached session wrapping a worker. Created by the skill, monitorable via `tmux attach` or reading the output file. |
| **Headless Run** | A single `claude -p` invocation spawned by the worker. Executes tasks using Claude Code's native task tools. The worker spawns multiple headless runs sequentially — each run picks up where the last left off. |
| **Worktree** | An isolated git checkout for a story. Each story executes in its own worktree with a dedicated branch, enabling parallel story development. |
| **Canonical Name** | The unique identifier for a story, used everywhere: folder name, branch, worktree, session. Uses `[a-z0-9-]`. For stories within an epic, the epic prefix is joined with `--` (e.g., `user-auth--setup-db`). |

## Goals

- Enable workers to execute using Claude Code's native Tasks tools (`TaskList` → `TaskGet` → execute → `TaskUpdate`)
- Replace markdown epic/story files with structured JSON
- Support epics with multiple stories and dependencies between them
- Provide a worker script that manages story execution end-to-end
- Maintain git-trackable definitions in `.saga/stories/` and `.saga/epics/` (JSON format, human-viewable via dashboard)
- Define SAGA-specific types in `saga-types` package, decoupled from Claude Code's task interface

## Success Metrics

- Workers can execute stories using native Tasks tools with proper status tracking
- Task state is presented in the dashboard during execution
- Cross-session task coordination works via `CLAUDE_CODE_TASK_LIST_ID`
- Worker handles story execution end-to-end (hydration, headless runs, cleanup)
- Each story executes in its own worktree with dedicated branch and PR
- Dashboard can visualize epic/story trees

## Scope

### In Scope

- Integration with existing infrastructure (hooks, worktree.js, scope-validator.js)
- SAGA types in `saga-types` package (`Story`, `Epic`, `Task`, conversion layer)
- `story.json` metadata file for each story (context, execution state)
- `epic.json` metadata file for each epic (children, dependencies)
- Flat folder structure in `.saga/stories/` with canonical naming convention (`--` as hierarchy separator)
- Hydration layer: convert SAGA tasks to Claude Code format, copy to `~/.claude/tasks/`
- Sync layer via tool hooks: update status in `.saga/stories/` using hooks on Tasks builtin tools
- Worker script (`worker.js`): a linear node process that manages story execution inside a tmux session
- Context injection: story context provided in headless run prompt (not as a task)
- Headless run execution loop using native Tasks tools (only real tasks, no synthetic context task)
- Skills for: breakdown (story creation from defined goal), execution selection, review/discuss stories
- Dashboard visualization of epic/story trees

### Out of Scope

- Goal definition process (interactive brainstorming to define what to build) — separate effort
- Epic orchestration (automated traversal of stories in dependency order)
- Parallel worker execution (start with sequential, add parallelism later)
- Import from external systems (JIRA, Linear, etc.)
- Changes to Claude Code's native Tasks tools themselves
- Backward compatibility with existing `.saga/epics/` and `.saga/stories/` markdown files

## Non-Functional Requirements

- Story and task files stored as JSON (viewable via dashboard for human-readable presentation)
- Task filename and ID must always be in sync (`{id}.json`)
- Workers must handle context window limits (task descriptions must be self-contained)
- Must work with Claude Code v2.1.30+ headless mode (requires `CLAUDE_CODE_ENABLE_TASKS=true`)
- Hydration/sync operations should minimize corruption risk (e.g., handle partial write failures gracefully)

## Technical Approach

### Storage

Source of truth: `.saga/stories/` for stories and `.saga/epics/` for epics. Stories use a flat folder structure. Hierarchy is expressed through the `--` naming convention and the `children` array in `epic.json`, not through folder nesting.

**Naming convention:**
- Individual IDs use `[a-z0-9-]` (lowercase, digits, single dashes)
- `--` (double dash) is the hierarchy separator — banned in individual IDs
- The canonical name is used everywhere: folder name, branch, worktree, tmux session, env vars

**Standalone story** (simple feature, no epic):
```
.saga/stories/
└── add-logout-button/
    ├── story.json              ← metadata: id, title, description, guidance
    ├── write-tests.json        ← task
    └── implement-button.json   ← task
```

**Epic with stories** (complex feature):
```
.saga/epics/
└── user-authentication/
    └── epic.json               ← metadata with children array

.saga/stories/
├── user-authentication--setup-database/
│   ├── story.json
│   ├── write-tests.json
│   └── create-migrations.json
└── user-authentication--implement-api/
    ├── story.json
    └── add-endpoints.json
```

Runtime (for native tool compatibility): `~/.claude/tasks/saga__<canonical-name>/`

### Story vs Epic

**Story**:
- Has `story.json` with metadata (no `children`)
- Contains executable task files (`*.json`)
- Executed by a single worker in its own worktree/branch/PR
- Worker capsule: isolated execution environment

**Epic**:
- Has `epic.json` with `children` array defining dependencies between stories
- References stories by canonical name
- Not directly executable — the user selects which story to execute via a plugin skill

### SAGA Types (in `saga-types` package)

> **Breaking change**: The new `Story`, `Epic`, and `Task` types replace the existing types in `saga-types` entirely. No backward compatibility with the old markdown-based types (`Task`, `StoryFrontmatter`, etc.).

**Story** (stored in `story.json`):
```typescript
interface Story {
  id: string;
  title: string;
  description: string;
  guidance?: string;
  doneWhen?: string;
  avoid?: string;
  status?: "pending" | "in_progress" | "completed";
  // Execution state (populated at runtime):
  branch?: string;
  pr?: string;
  worktree?: string;
}
```

**Epic** (stored in `epic.json`):
```typescript
interface Epic {
  id: string;
  title: string;
  description: string;
  children: Array<{
    id: string;           // canonical name of child story
    blockedBy: string[];  // IDs of sibling stories that must complete first
  }>;
  status?: "pending" | "in_progress" | "completed";
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
  blockedBy: string[];  // task IDs within same story
  guidance?: string;
  doneWhen?: string;
}
```

### ClaudeCodeTask Type

Derived from Claude Code's built-in Tasks tools (`TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`):

```typescript
interface ClaudeCodeTask {
  id: string;
  subject: string;
  description: string;
  activeForm?: string;
  status: "pending" | "in_progress" | "completed";
  owner?: string;
  blocks: string[];     // task IDs that this task blocks
  blockedBy: string[];  // task IDs that block this task
  metadata?: Record<string, unknown>;
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
1. Read `story.json` for context (used in headless run prompt)
2. Read task files from `.saga/stories/<canonicalName>/`
3. Convert each SAGA task to Claude Code format
4. Create `~/.claude/tasks/saga__<canonicalName>/`
5. Write converted task files
6. Write `.highwatermark` file

**Sync (via tool hooks):**
- Tool hooks registered for `TaskUpdate`
- Hooks intercept status changes and update `.saga/stories/<canonicalName>/*.json`
- Only status is synced back (other fields are source-controlled in SAGA)
- Headless runs may create tasks at runtime via `TaskCreate` for their own tracking; these are not synced back to `.saga/stories/` and are discarded at cleanup
- Cleanup of `~/.claude/tasks/saga__<canonicalName>/` after execution completes

### Worker Architecture

The worker (`worker.js`) is a single linear node process that runs inside a tmux session. The skill creates the tmux session and runs the worker inside it.

**Flow:**

```
Skill (interactive Claude)
  ├─ Computes sessionName, outputFile
  ├─ Creates tmux session: tmux new-session -d -s <name> "node worker.js <args>"
  └─ Returns { sessionName, outputFile } to user

[inside tmux] node worker.js
  ├─ 1. Create worktree and branch for this story
  ├─ 2. Create draft PR (allows dashboard tracking from the start)
  ├─ 3. Read story.json for context
  ├─ 4. Hydrate task files to ~/.claude/tasks/
  ├─ 5. Loop: spawn headless runs
  │     └─ claude -p "..." (with story context in prompt)
  │        └─ Headless run executes tasks via native tools
  │        └─ Worker checks exit status, spawns next run if needed
  ├─ 6. Clean up ~/.claude/tasks/ after completion
  └─ 7. Mark PR as ready for review
```

**Headless run invocation:**
```bash
CLAUDE_CODE_ENABLE_TASKS=true \
CLAUDE_CODE_TASK_LIST_ID=saga__<canonicalName> \
claude -p "You are working on: ${title}

${description}

Guidance: ${guidance}

Done when: ${doneWhen}

Execute the tasks in the task list using TaskList, TaskGet, and TaskUpdate."
```

The worker only handles story execution. Epic orchestration (traversing stories, respecting dependencies) is out of scope — the user selects which story to execute via a plugin skill.

### Headless Run Execution Loop

Each headless run (inside a story's worktree) receives context via prompt, then:

1. `TaskList` → find next pending unblocked task
2. `TaskGet(<task-id>)` → load full description
3. Execute the work (write code, run tests, etc.)
4. `TaskUpdate(<task-id>, status: "completed")`
5. `TaskList` → check for remaining pending/unblocked tasks
6. Repeat until all tasks are completed, then self-terminate

Headless runs self-terminate when `TaskList` shows all tasks completed. The worker waits for the headless run process to exit. Headless runs only see real executable tasks — no synthetic context task.

### Error Handling

**Headless run crash (process dies mid-execution):**
- Tasks left in `in_progress` status remain in that state in `.saga/stories/`
- Worker detects non-zero exit code from the headless run process
- Story is marked as failed; no automatic retry
- User can re-run execution — the hydration layer reads current status from `.saga/stories/`, so completed tasks are preserved and only remaining tasks are re-attempted

**Stuck tasks:**
- If a headless run exits (crash or self-termination) with tasks still in `in_progress`, the worker resets those tasks to `pending` before marking the story as failed
- This ensures a clean state for re-execution

**Hydration failure:**
- If writing to `~/.claude/tasks/` fails (permissions, disk space), worker aborts before spawning headless runs
- No partial state to clean up since no headless run started

**Sync failure (hook can't write to .saga/stories/):**
- Hook logs a warning but does not block the headless run
- Status drift between `~/.claude/tasks/` and `.saga/stories/` is possible but recoverable
- Post-execution reconciliation: worker reads final state from `~/.claude/tasks/` and writes it to `.saga/stories/` as a fallback

## Integration with Existing Infrastructure

This is not a complete rewrite. SAGA has established mechanisms for worktree isolation, context detection, scope validation, and session management. The new system builds on these foundations.

### Preserved Mechanisms

| Mechanism | Current Location | Integration |
|-----------|-----------------|-------------|
| **SessionStart hook** | `hooks/session-init.sh` | Reused for context detection; updated to recognize story worktrees |
| **Worktree creation** | `scripts/worktree.js` | Extended to create worktrees for stories |
| **Scope validator** | `scripts/scope-validator.js` | Updated to validate worker access based on story path |
| **Tmux sessions** | Used by implement.js | Session creation moves to the skill; worker.js is a linear script inside tmux |
| **Dashboard file watcher** | `packages/dashboard/watcher.ts` | Updated to watch `.saga/stories/` and `.saga/epics/` |

### Environment Variables

The existing environment variable pattern is preserved and extended:

**Core Variables (set by SessionStart hook):**
| Variable | Current | New |
|----------|---------|-----|
| `SAGA_PROJECT_DIR` | Project root or worktree root | Unchanged |
| `SAGA_PLUGIN_ROOT` | Plugin installation path | Unchanged |
| `SAGA_TASK_CONTEXT` | `"main"` or `"story-worktree"` | Unchanged |
| `SAGA_SESSION_DIR` | `/tmp/saga-sessions` | Unchanged |

**Worker Variables (set by worker.js or skill before spawning):**
| Variable | Current | New |
|----------|---------|-----|
| `SAGA_EPIC_SLUG` | Epic identifier | Deprecated (use `SAGA_STORY_PATH`) |
| `SAGA_STORY_SLUG` | Story identifier | Deprecated (use `SAGA_STORY_PATH`) |
| `SAGA_STORY_DIR` | Path to story.md in worktree | Deprecated |
| `SAGA_STORY_PATH` | N/A | Canonical story name (e.g., `"user-auth--setup-db"`) |
| `SAGA_STORY_TASK_LIST_ID` | N/A | Claude Code task list ID (e.g., `"saga__user-auth--setup-db"`) |

### Context Detection

The SessionStart hook (`hooks/session-init.sh`) detects execution context by checking if `.git` is a file (worktree) or directory (main repo):

```bash
if [ -f .git ]; then
    # Inside a worktree - check if it's a story worktree
    worktree_path=$(pwd)
    if [[ "$worktree_path" == *".saga/worktrees/stories/"* ]]; then
        SAGA_TASK_CONTEXT="story-worktree"
        # Extract canonical story name directly from flat worktree folder
        SAGA_STORY_PATH=$(echo "$worktree_path" | sed 's|.*\.saga/worktrees/stories/||' | sed 's|/$||')
    fi
else
    SAGA_TASK_CONTEXT="main"
fi
```

### Worktree and Branch Naming

All derived paths use the canonical story name directly:

| Canonical Name | Branch | Worktree | Story Folder |
|---------------|--------|----------|-------------|
| `add-logout-button` | `story/add-logout-button` | `.saga/worktrees/stories/add-logout-button/` | `.saga/stories/add-logout-button/` |
| `user-auth--setup-db` | `story/user-auth--setup-db` | `.saga/worktrees/stories/user-auth--setup-db/` | `.saga/stories/user-auth--setup-db/` |
| `user-auth--api--endpoints` | `story/user-auth--api--endpoints` | `.saga/worktrees/stories/user-auth--api--endpoints/` | `.saga/stories/user-auth--api--endpoints/` |

**Rationale:**
- One canonical name used everywhere — no conversion between forms
- `--` chosen as hierarchy separator; individual IDs use `[a-z0-9-]` (ban `--` in individual IDs to prevent ambiguity)
- Branch prefix `story/` provides clear namespace separation

### Tmux Session Management

The skill creates tmux sessions for workers:

**Session naming:** `saga-story-<canonical-name>-<timestamp>`

Example: `saga-story-user-auth--setup-db-1707000123456`

**Dashboard integration:**
- Dashboard reads tmux sessions via `tmux list-sessions`
- Filters by `saga-story-` prefix to identify story executions
- Streams output from session output files for real-time monitoring

### Scope Validation

The scope validator is updated to use story context:

```javascript
// Current: uses SAGA_EPIC_SLUG and SAGA_STORY_SLUG
const allowedPaths = [
  `.saga/epics/${epicSlug}/stories/${storySlug}/`,
  // ... other allowed paths
];

// New: uses SAGA_STORY_PATH (canonical name)
const canonicalName = process.env.SAGA_STORY_PATH;
const allowedPaths = [
  `.saga/stories/${canonicalName}/`,
  // Project files (for implementation work)
  // ... other allowed paths
];
```

### Dashboard Migration Path

The dashboard needs to support both systems during transition:

1. **Phase 1**: Add `.saga/stories/` and `.saga/epics/` (JSON) scanner alongside existing markdown scanner
2. **Phase 2**: Unified view showing both legacy and new formats
3. **Phase 3**: Deprecate markdown support once migration complete

File watcher updates:
```typescript
// Current paths
const watchPaths = ['.saga/epics/', '.saga/archive/'];

// New paths (additive)
const watchPaths = [
  '.saga/epics/',      // Legacy markdown + new JSON epics
  '.saga/archive/',    // Legacy support
  '.saga/stories/',    // New JSON stories
];
```

## Key Decisions

### SAGA Types Decoupled from Claude Code

- **Choice**: Define SAGA-specific types in `saga-types` package with conversion layer
- **Rationale**: SAGA can evolve independently. If Claude Code's interface changes, only the conversion layer needs updating. First-class fields for `guidance`, `doneWhen`, etc. instead of generic `metadata`.
- **Alternatives**: Directly use Claude Code's task schema (rejected: tight coupling, SAGA fields buried in metadata)

### Context in Prompt, Not as Task

- **Choice**: Inject story context into headless run prompt, not as a `_context` task
- **Rationale**: Headless runs only see real executable tasks. Cleaner `TaskList` output. Context belongs in the prompt, not as a fake task.
- **Alternatives**: Synthetic `_context` task (rejected: pollutes task list, headless runs must skip it)

### story.json for Metadata

- **Choice**: Each story has `story.json` with metadata, separate from task files
- **Rationale**: Clean separation of story metadata vs individual tasks. Context and execution state in one place.
- **Alternatives**: Context as first task (rejected: conflates metadata with tasks)

### Children in epic.json, Not Pointer Tasks

- **Choice**: Epics define children in `epic.json`, not as "pointer tasks"
- **Rationale**: Children are not tasks — they're references to stories. Cleaner model: stories contain only real tasks.
- **Alternatives**: Pointer tasks (rejected: confusing, mixes orchestration with execution)

### Story vs Epic Distinction

- **Choice**: A story has tasks and is executed by a worker. An epic groups stories with dependencies. They are separate entities.
- **Rationale**: Each story = one worker capsule = one worktree/branch/PR. Clear execution model. Epics define the major pieces, stories define the work within each piece.
- **Alternatives**: Generic "task list" for everything (rejected: confusing terminology, collides with Claude Code's TaskList tool name). Mixed entities with both tasks and children (rejected: unclear execution semantics).

### Native Tasks as Runtime, SAGA as Source of Truth

- **Choice**: `.saga/stories/` is source of truth, hydrate to `~/.claude/tasks/` at runtime
- **Rationale**: Claude Code's task storage is not configurable (always `~/.claude/tasks/`), has no cleanup, and is not git-trackable. SAGA needs project-local, version-controlled storage.
- **Alternatives**: Use `~/.claude/tasks/` directly (rejected: not git-trackable, no cleanup)

### Descriptive Filenames and IDs

- **Choice**: Filename = `{id}.json`, IDs are descriptive slugs (e.g., `write-migration-tests`)
- **Rationale**: Human-readable in file explorer, self-documenting. Claude Code accepts non-numeric string IDs.
- **Alternatives**: Numeric IDs (rejected: not human-readable), hash IDs (rejected: opaque)

### Runtime TaskCreate Allowed but Not Synced

- **Choice**: Headless runs may create tasks at runtime via `TaskCreate` for their own tracking, but these are not synced back to `.saga/stories/`
- **Rationale**: Headless runs sometimes need to break down work further during execution. These ad-hoc tasks are ephemeral and discarded at cleanup. Only pre-defined tasks in `.saga/stories/` are the source of truth.
- **Alternatives**: Block `TaskCreate` entirely (rejected: too restrictive), sync new tasks back (rejected: adds complexity, blurs source of truth)

### Flat Canonical Naming

- **Choice**: One canonical name (using `--` as hierarchy separator) used everywhere: `.saga/stories/`, worktrees, branches, tmux sessions, env vars
- **Rationale**: No conversion between forms. Individual IDs use `[a-z0-9-]`; `--` is banned in individual IDs to prevent ambiguity.
- **Alternatives**: Nested folder structure with path-to-flat conversion (rejected: requires bidirectional conversion, error-prone)

### Worker as Linear Node Process

- **Choice**: Worker (`worker.js`) is a single linear node process running inside a tmux session created by the skill. No re-entry or bifurcation pattern.
- **Rationale**: Simple architecture. The skill handles session creation (lightweight), the worker handles execution (heavyweight). One process, one responsibility.
- **Alternatives**: Script that creates its own tmux and re-invokes itself (rejected: unnecessary indirection, confusing bifurcation via environment variable)

## Data Models

### Story Schema (story.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier, matches folder name (canonical name) |
| title | string | Yes | Human-readable title |
| description | string | Yes | Full context for the story goal |
| guidance | string | No | How to approach the work |
| doneWhen | string | No | Completion criteria |
| avoid | string | No | Patterns to avoid |
| status | enum | No | "pending", "in_progress", "completed" |
| branch | string | No | Git branch name (populated at execution) |
| pr | string | No | Pull request URL (populated at execution) |
| worktree | string | No | Worktree path (populated at execution) |

### Epic Schema (epic.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier, matches folder name |
| title | string | Yes | Human-readable title |
| description | string | Yes | Full context for the epic goal |
| status | enum | No | "pending", "in_progress", "completed" |
| children | array | Yes | Child stories with dependencies |

### Epic Children Schema (in epic.json children array)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Canonical name of the child story |
| blockedBy | string[] | Yes | IDs of sibling stories that must complete first |

### Task Schema ({id}.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique within story, matches filename |
| subject | string | Yes | Short imperative title |
| description | string | Yes | Full context for execution |
| activeForm | string | No | Present continuous for spinner ("Writing tests") |
| status | enum | Yes | "pending", "in_progress", "completed" |
| blockedBy | string[] | Yes | Task IDs that must complete first |
| guidance | string | No | How to approach the work |
| doneWhen | string | No | Completion criteria |

## Interface Contracts

### Hydration Service

```
hydrate(canonicalName: string): void
  - Input: canonical story name (e.g., "user-authentication--setup-database")
  - Reads: .saga/stories/<canonicalName>/story.json (for context), *.json task files
  - Converts: SAGA tasks to Claude Code format
  - Output: Creates ~/.claude/tasks/saga__<canonicalName>/ with converted tasks
  - Returns: Story metadata for prompt injection
```

### Sync via Tool Hooks

```
Tool hooks registered for: TaskUpdate
  - Intercept status changes during headless run execution
  - Update status in .saga/stories/<canonicalName>/*.json
  - Cleanup ~/.claude/tasks/saga__<canonicalName>/ after execution completes
```

### Worker Script

```
worker.js(canonicalName: string): void
  - Input: canonical name of a story (e.g., "user-authentication--setup-database")
  - Creates worktree and branch, creates draft PR
  - Hydrates task files to ~/.claude/tasks/
  - Loops: spawns headless runs, waits for completion, checks status
  - Cleans up runtime files, marks PR ready for review
  - Streams output to file for dashboard monitoring
  - Output: All tasks completed, PR ready
```

## Tech Stack

- **Types**: `saga-types` package with Zod schemas
- **Storage**: JSON files in `.saga/stories/` and `.saga/epics/` (source of truth) and `~/.claude/tasks/` (runtime)
- **Execution**: Claude Code headless mode with `CLAUDE_CODE_TASK_LIST_ID`
- **Worker**: Node.js script (`worker.js`) running inside tmux
- **Dashboard**: Existing SAGA dashboard, updated to read `.saga/stories/` and `.saga/epics/`

## Open Questions

1. **`.highwatermark` management**: String IDs are confirmed to work with Claude Code. Remaining question: verify that hydrating a task list without a `.highwatermark` file (with pre-existing task files using string IDs) works correctly — Claude Code should auto-generate `.highwatermark` and handle its own task creation alongside SAGA-provided tasks. Needs experimental verification.

2. **Dashboard migration**: Dashboard currently reads `.saga/epics/` (markdown) and `.saga/stories/` (markdown). Needs update to read the new JSON format and visualize epic/story hierarchy.

3. ~~**Worktree/branch naming convention**~~: **Resolved** — See "Worktree and Branch Naming" section and "Flat Canonical Naming" key decision. One canonical name used everywhere with `--` as hierarchy separator.
