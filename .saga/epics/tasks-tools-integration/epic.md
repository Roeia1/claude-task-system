# Tasks Tools Integration

> **Note**: This epic uses the old directory+markdown format. The new single-file JSON format (`.saga/epics/<id>.json`) described below will apply after implementation.

## Overview

This epic replaces SAGA's markdown-based system with Claude Code's native Tasks tools. The current workflow uses `.md` files with YAML frontmatter to define and track work. The new system uses structured JSON files that workers consume via `TaskList`, `TaskGet`, and `TaskUpdate` tools.

The domain model is:

- **Epic**: A group of connected stories with dependencies. Optional — only needed when a goal requires multiple stories.
- **Story**: The worker capsule. A self-contained unit of work with its own task list, worktree, branch, and PR. Executed by a single worker.
- **Task**: Atomic work item within a story. What the worker's headless runs see and execute via Claude Code's native task tools.

The story is the primary entity — everything revolves around it. An epic is secondary: lightweight metadata grouping stories together.

The source of truth lives in `.saga/stories/` and `.saga/epics/` (git-tracked, project-local). At execution time, SAGA hydrates tasks to `~/.claude/tasks/` for native tool compatibility, then syncs status back via tool hooks.

## Glossary

| Term | Definition |
|------|-----------|
| **Epic** | A group of connected stories with dependencies between them. Optional — only needed when a goal requires multiple stories. Defines which stories exist and their execution order. Stored as a single JSON file. |
| **Story** | The worker capsule. A self-contained unit of work with its own task list, worktree, branch, and PR. Executed by a single worker. The fundamental unit of delivery in SAGA. Stored as a folder containing story.json, journal.md, and task files. |
| **Task** | Atomic work item within a story. What the worker's headless runs see and execute via Claude Code's native task tools (`TaskList`, `TaskGet`, `TaskUpdate`). |
| **Journal** | Part of the story. A log where the worker records key decisions, diversions, blockers, and resolutions during execution. Lives inside the story folder. Git-tracked alongside the story. |
| **Blocker** | An obstacle encountered during execution that requires human decision. The worker documents it in the journal and exits. Execution pauses until a human resolves it. |
| **Worker** | A node process responsible for implementing a story. Runs inside a session. Manages Claude Code headless runs, handles configuration (hydration, sync, cleanup), and streams output to a file. One worker per story. |
| **Session** | The tmux detached session wrapping a worker. Created by the skill, monitorable via `tmux attach` or reading the output file. |
| **Headless Run** | A single `claude -p` invocation spawned by the worker. Executes tasks using Claude Code's native task tools. The worker spawns multiple headless runs sequentially — each run picks up where the last left off. |
| **Worktree** | An isolated git checkout for a story. Each story executes in its own worktree with a dedicated branch, enabling parallel story development. |
| **Dashboard** | An npm package (`@saga-ai/dashboard`) that provides a web view for monitoring and viewing epics, stories, and running worker statuses. Currently read-only. |

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
- `story.json` metadata file for each story (context, execution state, optional epic reference)
- Epic files in `.saga/epics/` (single JSON file per epic, children with dependencies)
- Flat folder structure in `.saga/stories/` with globally unique story IDs
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
- Story IDs must be globally unique across the project (enforced at creation time by the generation skill)
- Workers must handle context window limits (task descriptions must be self-contained)
- Must work with Claude Code v2.1.30+ headless mode (requires `CLAUDE_CODE_ENABLE_TASKS=true`)
- Hydration/sync operations should minimize corruption risk (e.g., handle partial write failures gracefully)

## Technical Approach

### Storage

Source of truth: `.saga/stories/` for stories, `.saga/epics/` for epics.

Stories use a flat folder structure with globally unique IDs. Epic-to-story relationships are expressed through data — an `epic` field in `story.json` and a `children` array in the epic file — not through naming conventions.

**Story IDs** use `[a-z0-9-]` (lowercase, digits, dashes). IDs must be globally unique across the project. The generation skill enforces uniqueness at creation time.

**Standalone story** (simple feature, no epic):
```
.saga/stories/
└── add-logout-button/
    ├── story.json              ← metadata: id, title, description, guidance
    ├── journal.md              ← execution log (created by worker)
    ├── write-tests.json        ← task
    └── implement-button.json   ← task
```

**Epic with stories** (complex feature):
```
.saga/epics/
└── user-auth.json              ← single file: children, dependencies

.saga/stories/
├── auth-setup-database/
│   ├── story.json              ← has "epic": "user-auth"
│   ├── journal.md
│   ├── write-tests.json
│   └── create-migrations.json
└── auth-impl-api/
    ├── story.json              ← has "epic": "user-auth"
    ├── journal.md
    └── add-endpoints.json
```

Runtime (for native tool compatibility): `~/.claude/tasks/saga__<story-id>__<session-timestamp>/`

Each worker session gets its own task list namespace. This avoids collisions between runs of the same story and eliminates the need for cleanup.

### Story vs Epic

**Story**:
- A folder in `.saga/stories/<story-id>/`
- Contains `story.json` (metadata), `journal.md` (execution log), and task files (`*.json`)
- Self-contained: everything the worker needs is inside the folder
- Optionally references an epic via the `epic` field in `story.json`
- Executed by a single worker in its own worktree/branch/PR

**Epic**:
- A single file: `.saga/epics/<epic-id>.json`
- Contains `children` array defining stories and dependencies between them
- Lightweight metadata — no directory, no artifacts
- Not directly executable — the user selects which story to execute via a plugin skill

### SAGA Types (in `saga-types` package)

> **Breaking change**: The new `Story`, `Epic`, and `Task` types replace the existing types in `saga-types` entirely. No backward compatibility with the old markdown-based types (`Task`, `StoryFrontmatter`, etc.).

**Story** (stored in `story.json`):
```typescript
interface Story {
  id: string;
  title: string;
  description: string;
  epic?: string;        // epic ID, if this story belongs to an epic
  guidance?: string;
  doneWhen?: string;
  avoid?: string;
  // No status field — derived from task statuses at read time:
  //   any task in_progress → "in_progress"
  //   all tasks completed  → "completed"
  //   otherwise            → "pending"
  // Execution state (populated at runtime):
  branch?: string;
  pr?: string;
  worktree?: string;
}
```

**Epic** (stored in `<epic-id>.json`):
```typescript
interface Epic {
  id: string;
  title: string;
  description: string;
  children: Array<{
    id: string;           // story ID
    blockedBy: string[];  // IDs of sibling stories that must complete first
  }>;
  // No status field — derived from child story statuses at read time:
  //   any story in_progress → "in_progress"
  //   all stories completed → "completed"
  //   otherwise             → "pending"
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
2. Read task files from `.saga/stories/<storyId>/`
3. Convert each SAGA task to Claude Code format
4. Create `~/.claude/tasks/saga__<storyId>__<sessionTimestamp>/`
5. Write converted task files

**Sync (via tool hooks):**
- Tool hooks registered for `TaskUpdate`
- Hooks intercept status changes and update `.saga/stories/<storyId>/*.json`
- Only status is synced back (other fields are source-controlled in SAGA)
- Headless runs may create tasks at runtime via `TaskCreate` for their own tracking; these are not synced back to `.saga/stories/`
- No cleanup needed — each session uses its own task list namespace (`saga__<storyId>__<sessionTimestamp>`), so old task lists are inert

### Worker Architecture

The worker (`worker.js`) is a single linear node process that runs inside a tmux session. The skill creates the tmux session and runs the worker inside it.

**Flow:**

```
Skill (interactive Claude)
  ├─ Computes sessionName, outputFile
  ├─ Creates tmux session: tmux new-session -d -s <name> "node worker.js <args>"
  └─ Returns { sessionName, outputFile } to user

[inside tmux] node worker.js
  ├─ 1. Create worktree and branch for this story (skip if already exists)
  ├─ 2. Create draft PR (skip if already exists)
  ├─ 3. Read story.json for context
  ├─ 4. Hydrate task files to ~/.claude/tasks/
  ├─ 5. Loop: spawn headless runs
  │     └─ claude -p "..." (with story context in prompt)
  │        └─ Headless run executes tasks via native tools
  │        └─ Worker checks exit status, spawns next run if needed
  └─ 6. Mark PR as ready for review
```

**Idempotency**: The skill may be started multiple times for the same story (e.g., after resolving a blocker). All setup steps must be idempotent:
- Worktree/branch creation: check if worktree already exists before creating
- Draft PR creation: check if PR already exists for this branch before creating
- Hydration: always re-hydrate from `.saga/stories/` (picks up current task statuses, so completed tasks are preserved)

**Headless run invocation:**

The worker reads `story.json` and injects its fields into a prompt template. The `story.json` and `epic.json` files are protected from modification by the headless run — any deviations or notes must be recorded in `journal.md` only.

> **Prerequisite**: `CLAUDE_CODE_ENABLE_TASKS=true` is required for headless runs to access the native Tasks tools. Without it, `TaskList`/`TaskGet`/`TaskUpdate` are unavailable and execution will fail. The worker sets this automatically.

```bash
CLAUDE_CODE_ENABLE_TASKS=true \
CLAUDE_CODE_TASK_LIST_ID=saga__<storyId>__<sessionTimestamp> \
claude -p "You are working on: ${story.title}

${story.description}

Guidance: ${story.guidance}

Done when: ${story.doneWhen}

Avoid: ${story.avoid}

Execute the tasks in the task list using TaskList, TaskGet, and TaskUpdate."
```

The prompt template is populated from `story.json` fields. Only non-empty fields are included.

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
- Worker detects non-zero exit code from the headless run process
- No automatic retry (story status is derived from tasks — incomplete tasks remain pending/in_progress)
- `.saga/stories/` reflects the last synced state — the user sees the story as incomplete
- User re-runs execution → fresh per-session task list, hydrated from `.saga/stories/`
- The headless run reads the actual branch state and reconciles — work already done on the branch is recognized even if task status in `.saga/stories/` is stale

**Hydration failure:**
- If writing to `~/.claude/tasks/` fails (permissions, disk space), worker aborts before spawning headless runs
- No partial state to clean up since no headless run started

**Sync failure (hook can't write to .saga/stories/):**
- Hook logs a warning but does not block the headless run
- Status drift between runtime task list and `.saga/stories/` is possible
- On re-run, the headless run reconciles with actual branch state — stale task statuses in `.saga/stories/` do not cause duplicate work

## Integration with Existing Infrastructure

This is not a complete rewrite. SAGA has established mechanisms for worktree isolation, context detection, scope validation, and session management. The new system builds on these foundations.

### Preserved Mechanisms

| Mechanism | Current Location | Integration |
|-----------|-----------------|-------------|
| **SessionStart hook** | `hooks/session-init.sh` | Adjusted to recognize story worktrees |
| **Worktree creation** | `scripts/worktree.js` | Adjusted to create worktrees for stories |
| **Scope validator** | `scripts/scope-validator.js` | Adjusted to validate worker access based on story path |
| **Tmux sessions** | Used by execute-story skill | Session creation moves to the skill; worker.js is a linear script inside tmux |
| **Dashboard file watcher** | `packages/dashboard/watcher.ts` | Adjusted to watch `.saga/stories/` and `.saga/epics/` |

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
| `SAGA_EPIC_SLUG` | Epic identifier | Deprecated (use `SAGA_STORY_ID`) |
| `SAGA_STORY_SLUG` | Story identifier | Deprecated (use `SAGA_STORY_ID`) |
| `SAGA_STORY_DIR` | Path to story.md in worktree | Deprecated |
| `SAGA_STORY_ID` | N/A | Story ID (e.g., `"auth-setup-db"`) |
| `SAGA_STORY_TASK_LIST_ID` | N/A | Claude Code task list ID (e.g., `"saga__auth-setup-db__1707000123456"`) |

### Context Detection

The SessionStart hook (`hooks/session-init.sh`) detects execution context by checking if `.git` is a file (worktree) or directory (main repo):

```bash
if [ -f .git ]; then
    # Inside a worktree - check if it's a story worktree
    worktree_path=$(pwd)
    if [[ "$worktree_path" == *".saga/worktrees/"* ]]; then
        SAGA_TASK_CONTEXT="story-worktree"
        # Extract story ID from worktree folder name
        SAGA_STORY_ID=$(basename "$worktree_path")
    fi
else
    SAGA_TASK_CONTEXT="main"
fi
```

### Worktree and Branch Naming

All derived paths use the story ID directly:

| Story ID | Branch | Worktree | Story Folder |
|----------|--------|----------|-------------|
| `add-logout-button` | `story/add-logout-button` | `.saga/worktrees/add-logout-button/` | `.saga/stories/add-logout-button/` |
| `auth-setup-db` | `story/auth-setup-db` | `.saga/worktrees/auth-setup-db/` | `.saga/stories/auth-setup-db/` |
| `auth-impl-api` | `story/auth-impl-api` | `.saga/worktrees/auth-impl-api/` | `.saga/stories/auth-impl-api/` |

**Rationale:**
- Story ID is used everywhere — no conversion between forms
- IDs use `[a-z0-9-]`, must be globally unique
- Branch prefix `story/` provides clear namespace separation

### Tmux Session Management

The skill creates tmux sessions for workers:

**Session naming:** `saga-story-<story-id>-<timestamp>`

Example: `saga-story-auth-setup-db-1707000123456`

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

// New: uses SAGA_STORY_ID
const storyId = process.env.SAGA_STORY_ID;
const allowedPaths = [
  `.saga/stories/${storyId}/`,
  // Project files (for implementation work)
  // ... other allowed paths
];
```

### Dashboard Changes

The dashboard is adjusted to read the new JSON format directly. No backward compatibility with the old markdown format.

File watcher paths:
```typescript
const watchPaths = [
  '.saga/epics/',      // JSON epic files
  '.saga/stories/',    // JSON story folders
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

### Epics as Single Files

- **Choice**: Epics are single JSON files (`.saga/epics/<id>.json`), not directories
- **Rationale**: An epic is lightweight metadata — it defines children and their dependencies, nothing more. It has no artifacts of its own (no journal, no tasks, no worktree). A single file is sufficient.
- **Alternatives**: Epic as directory with `epic.json` inside (rejected: unnecessary directory for a single file)

### Story vs Epic Distinction

- **Choice**: A story has tasks and is executed by a worker. An epic groups stories with dependencies. They are separate entities.
- **Rationale**: Each story = one worker capsule = one worktree/branch/PR. Clear execution model. Epics define the major pieces, stories define the work within each piece.
- **Alternatives**: Generic "task list" for everything (rejected: confusing terminology, collides with Claude Code's TaskList tool name). Mixed entities with both tasks and children (rejected: unclear execution semantics).

### Relationships via Data, Not Naming Conventions

- **Choice**: Epic-to-story relationship expressed through data — `epic` field in `story.json` and `children` array in the epic file. Story IDs are globally unique, simple slugs.
- **Rationale**: No parsing or convention needed. Relationships are explicit in the data. Story IDs stay clean (`auth-setup-db` not `user-auth--setup-db`). The generation skill enforces ID uniqueness at creation time.
- **Alternatives**: `--` hierarchy separator in story IDs (rejected: makes IDs ugly, relationship is implicit in naming, requires parsing convention)

### Native Tasks as Runtime, SAGA as Source of Truth

- **Choice**: `.saga/stories/` is source of truth, hydrate to `~/.claude/tasks/` at runtime
- **Rationale**: Claude Code's task storage is not configurable (always `~/.claude/tasks/`), has no cleanup, and is not git-trackable. SAGA needs project-local, version-controlled storage.
- **Alternatives**: Use `~/.claude/tasks/` directly (rejected: not git-trackable, no cleanup)

### Per-Session Task List (No Cleanup)

- **Choice**: Each worker session gets its own task list namespace (`saga__<storyId>__<sessionTimestamp>`). No cleanup of `~/.claude/tasks/` is performed.
- **Rationale**: Eliminates collision between runs of the same story and removes the cleanup step entirely. Old session task lists are inert. On re-run after a crash, the headless run reconciles with the actual branch state rather than relying on task list state from a previous session.
- **Alternatives**: Shared per-story task list with cleanup (rejected: cleanup adds complexity, crash leaves stale state, collision risk on re-run)

### Descriptive Filenames and IDs

- **Choice**: Filename = `{id}.json`, IDs are descriptive slugs (e.g., `write-migration-tests`)
- **Rationale**: Human-readable in file explorer, self-documenting. Claude Code accepts non-numeric string IDs.
- **Alternatives**: Numeric IDs (rejected: not human-readable), hash IDs (rejected: opaque)

### Runtime TaskCreate Allowed but Not Synced

- **Choice**: Headless runs may create tasks at runtime via `TaskCreate` for their own tracking, but these are not synced back to `.saga/stories/`
- **Rationale**: Headless runs sometimes need to break down work further during execution. These ad-hoc tasks live only in the session's task list and are not synced back. Only pre-defined tasks in `.saga/stories/` are the source of truth.
- **Alternatives**: Block `TaskCreate` entirely (rejected: too restrictive), sync new tasks back (rejected: adds complexity, blurs source of truth)

### Globally Unique Story IDs

- **Choice**: Story IDs must be globally unique across the project. IDs use `[a-z0-9-]`. Enforced at creation time by the generation skill.
- **Rationale**: Enables flat storage in `.saga/stories/` without namespacing. Clean IDs everywhere (branches, worktrees, sessions). No collision risk.
- **Alternatives**: Namespace by epic ID with `--` separator (rejected: ugly IDs, implicit relationships, requires parsing)

### Derived Status (No Stored Status on Story or Epic)

- **Choice**: Story and epic status is derived at read time from their children, not stored as a field
- **Rationale**: Single source of truth — task status is the only stored status. No risk of story/epic status drifting out of sync with actual task progress. Derivation rules are simple: any child `in_progress` → parent `in_progress`; all children `completed` → parent `completed`; otherwise `pending`.
- **Alternatives**: Stored status field managed by worker (rejected: redundant data, drift risk, requires explicit transition logic)

### Worker as Linear Node Process

- **Choice**: Worker (`worker.js`) is a single linear node process running inside a tmux session created by the skill. No re-entry or bifurcation pattern.
- **Rationale**: Simple architecture. The skill handles session creation (lightweight), the worker handles execution (heavyweight). One process, one responsibility.
- **Alternatives**: Script that creates its own tmux and re-invokes itself (rejected: unnecessary indirection, confusing bifurcation via environment variable)

## Data Models

### Story Schema (story.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Globally unique identifier, matches folder name |
| title | string | Yes | Human-readable title |
| description | string | Yes | Full context for the story goal |
| epic | string | No | Epic ID, if this story belongs to an epic |
| guidance | string | No | How to approach the work |
| doneWhen | string | No | Completion criteria |
| avoid | string | No | Patterns to avoid |
| branch | string | No | Git branch name (populated at execution) |
| pr | string | No | Pull request URL (populated at execution) |
| worktree | string | No | Worktree path (populated at execution) |

Story status is derived at read time from task statuses: any task `in_progress` → story is `in_progress`; all tasks `completed` → story is `completed`; otherwise `pending`. No `status` field is stored.

### Epic Schema (<epic-id>.json)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier, matches filename (without .json) |
| title | string | Yes | Human-readable title |
| description | string | Yes | Full context for the epic goal |
| children | array | Yes | Child stories with dependencies |

Epic status is derived at read time from child story statuses: any story `in_progress` → epic is `in_progress`; all stories `completed` → epic is `completed`; otherwise `pending`. No `status` field is stored.

### Epic Children Schema (in children array)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Story ID |
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
hydrate(storyId: string): void
  - Input: story ID (e.g., "auth-setup-database")
  - Reads: .saga/stories/<storyId>/story.json (for context), *.json task files
  - Converts: SAGA tasks to Claude Code format
  - Output: Creates ~/.claude/tasks/saga__<storyId>__<sessionTimestamp>/ with converted tasks
  - Returns: Story metadata for prompt injection
```

### Sync via Tool Hooks

```
Tool hooks registered for: TaskUpdate
  - Intercept status changes during headless run execution
  - Update status in .saga/stories/<storyId>/*.json
```

### Worker Script

```
worker.js(storyId: string): void
  - Input: story ID (e.g., "auth-setup-database")
  - Creates worktree and branch, creates draft PR
  - Hydrates task files to ~/.claude/tasks/
  - Loops: spawns headless runs, waits for completion, checks status
  - Marks PR ready for review
  - Streams output to file for dashboard monitoring
  - Output: All tasks completed, PR ready
```

## Tech Stack

- **Types**: `saga-types` package with Zod schemas
- **Storage**: JSON files in `.saga/stories/` and `.saga/epics/` (source of truth) and `~/.claude/tasks/` (runtime)
- **Execution**: Claude Code headless mode with `CLAUDE_CODE_TASK_LIST_ID`
- **Worker**: Node.js script (`worker.js`) running inside tmux
- **Dashboard**: Existing SAGA dashboard, updated to read `.saga/stories/` and `.saga/epics/`

