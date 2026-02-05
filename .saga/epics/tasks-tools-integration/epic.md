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

- SAGA types in `saga-types` package (`TaskList`, `Task`, conversion layer)
- `tasklist.json` metadata file for each task list (context, children, execution state)
- Nested folder structure in `.saga/tasks/` with descriptive filenames
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
- Hydration/sync operations must be atomic to prevent corruption

## Technical Approach

### Task List Storage

Source of truth: `.saga/tasks/` with nested folders representing hierarchy.

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
└── user-authentication/
    ├── tasklist.json           ← metadata + children array with dependencies
    ├── setup-database/
    │   ├── tasklist.json
    │   ├── write-tests.json
    │   └── create-migrations.json
    └── implement-api/
        ├── tasklist.json
        └── add-endpoints.json
```

Runtime (for native tool compatibility): `~/.claude/tasks/saga__<flattened-path>/`

### Task List Types

**Leaf Task List**:
- Has `tasklist.json` with no `children` array (or empty)
- Contains executable task files (`*.json`)
- Executed by a single worker in its own worktree/branch/PR
- Worker capsule: isolated execution environment

**Coordinator Task List**:
- Has `tasklist.json` with `children` array defining dependencies
- Contains child task list folders (no task files at this level)
- Execution script processes children in dependency order
- Not directly executable — orchestrates child execution

### SAGA Types (in `saga-types` package)

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
    path: string;
    blockedBy: string[];  // paths of sibling children
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
2. Read task files from `.saga/tasks/<path>/`
3. Convert each SAGA task to Claude Code format
4. Create `~/.claude/tasks/saga__<flattened-path>/`
5. Write converted task files
6. Write `.highwatermark` file

**Sync (via tool hooks):**
- Tool hooks registered for `TaskUpdate` (and optionally `TaskCreate`)
- Hooks intercept status changes and update `.saga/tasks/<path>/*.json`
- Only status is synced back (other fields are source-controlled in SAGA)
- Cleanup of `~/.claude/tasks/saga__<flattened-path>/` after execution completes

### SAGA Execution Script

A deterministic script manages task list execution:

**For a leaf task list:**
1. Create worktree and branch for this task list
2. Read `tasklist.json` for context
3. Hydrate task files to `~/.claude/tasks/`
4. Spawn headless worker with context in prompt:
   ```bash
   CLAUDE_CODE_ENABLE_TASKS=true \
   CLAUDE_CODE_TASK_LIST_ID=saga__<path> \
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
2. Execute children in dependency order (respecting `blockedBy`)
3. For each child: recursively call execution script
4. Mark coordinator as completed when all children complete

### Worker Execution Loop

Each worker (inside a leaf task list) receives context via prompt, then:

1. `TaskList` → find next pending unblocked task
2. `TaskGet(<task-id>)` → load full description
3. Execute the work (write code, run tests, etc.)
4. `TaskUpdate(<task-id>, status: "completed")`
5. Repeat until all tasks done

Workers only see real executable tasks — no synthetic context task.

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
| path | string | Yes | Relative path to child task list folder |
| blockedBy | string[] | Yes | Paths of sibling children that must complete first |

## Interface Contracts

### Hydration Service

```
hydrate(sagaPath: string): void
  - Input: path relative to .saga/tasks/ (e.g., "user-authentication/setup-database")
  - Reads: tasklist.json (for context), *.json task files
  - Converts: SAGA tasks to Claude Code format
  - Output: Creates ~/.claude/tasks/saga__<flattened-path>/ with converted tasks
  - Returns: TaskList metadata for prompt injection
```

### Sync via Tool Hooks

```
Tool hooks registered for: TaskUpdate
  - Intercept status changes during worker execution
  - Update status in .saga/tasks/<path>/*.json
  - Cleanup ~/.claude/tasks/saga__<flattened-path>/ after execution completes
```

### Execution Script

```
execute(taskListPath: string): void
  - Input: task list path (e.g., "user-authentication")
  - For leaf: create worktree, hydrate, spawn worker, create PR
  - For coordinator: execute children in dependency order
  - Output: All tasks/children completed, PRs created
```

## Tech Stack

- **Types**: `saga-types` package with Zod schemas
- **Storage**: JSON files in `.saga/tasks/` (source of truth) and `~/.claude/tasks/` (runtime)
- **Execution**: Claude Code headless mode with `CLAUDE_CODE_TASK_LIST_ID`
- **Orchestration**: Bash scripts or Node.js for spawning workers and monitoring
- **Dashboard**: Existing SAGA dashboard, updated to read `.saga/tasks/`

## Open Questions

1. **`.highwatermark` management**: Claude Code uses this for auto-increment. When SAGA pre-populates task files with string IDs, what should `.highwatermark` contain? Needs investigation.

2. **Dashboard migration**: Dashboard currently reads `.saga/epics/` and `.saga/stories/`. Needs update to read `.saga/tasks/` tree structure and visualize task list hierarchy.

3. **Worktree/branch naming convention**: How should worktree paths and branch names be derived from task list paths? Need consistent, collision-free naming.
