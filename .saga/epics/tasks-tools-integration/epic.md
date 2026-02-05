# Tasks Tools Integration

## Overview

This epic replaces SAGA's markdown-based epic/story system with Claude Code's native Tasks tools. The current workflow uses `.md` files with YAML frontmatter to define and track work. The new system uses structured JSON task lists that workers consume directly via `TaskCreate`, `TaskGet`, `TaskUpdate`, and `TaskList` tools.

Everything becomes a "task list" — there is no distinction between "epic" and "story". A task list can contain any combination of:
- **Regular tasks**: executable work items
- **Pointer tasks**: references to child task lists

This flexibility means:
- A root task list might contain only pointer tasks (pure orchestration)
- A root task list might contain only regular tasks (simple goal, no nesting needed)
- A root task list might mix both (some setup tasks, then delegate to child lists)
- Any child task list can also contain pointer tasks, creating arbitrary depth

The tree structure is optional — a single flat task list is valid for simple goals.

The source of truth lives in `.saga/tasks/` (git-tracked, project-local). At execution time, SAGA hydrates task lists to `~/.claude/tasks/` for native tool compatibility, then syncs status back after completion.

## Goals

- Enable workers to execute using Claude Code's native Tasks tools (`TaskList` → `TaskGet` → execute → `TaskUpdate`)
- Replace markdown epic/story files with structured JSON task lists
- Support task list nesting with dependencies between child task lists
- Provide a SAGA execution script that manages task list execution
- Maintain git-trackable task definitions in `.saga/tasks/` (JSON format, human-viewable via dashboard)

## Success Metrics

- Workers can execute task lists using native Tasks tools with proper status tracking
- Task state is presented in the dashboard during execution
- Cross-session task coordination works via `CLAUDE_CODE_TASK_LIST_ID`
- Execution script handles pointer tasks and spawns workers for child task lists
- Dashboard can visualize task list trees

## Scope

### In Scope

- Task list JSON schema for SAGA (context tasks, pointer tasks, regular tasks, metadata conventions)
- Nested folder structure in `.saga/tasks/` with descriptive filenames
- Hydration layer: copy only the relevant task list being executed from `.saga/tasks/` to `~/.claude/tasks/`
- Sync layer via tool hooks: update status in `.saga/tasks/` using hooks on Tasks builtin tools
- Execution script that manages task list execution (deterministic, spawns workers, handles pointer tasks)
- Worker execution loop using native Tasks tools
- Context task convention (first task in every list holds global context; workers read this for implementation guidance)
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

```
.saga/tasks/
└── user-authentication/
    ├── _context.json                    ← context task (id: "_context")
    ├── setup-database.json              ← pointer task (id: "setup-database")
    ├── implement-api.json               ← pointer task (id: "implement-api", blockedBy: ["setup-database"])
    └── setup-database/
        ├── _context.json                ← context task for this list
        ├── write-migration-tests.json   ← regular task (id: "write-migration-tests")
        ├── create-migrations.json       ← regular task (id: "create-migrations", blockedBy: ["write-migration-tests"])
        └── add-seed-data.json           ← regular task (id: "add-seed-data", blockedBy: ["create-migrations"])
```

Runtime (for native tool compatibility): `~/.claude/tasks/saga__<flattened-path>/`

### Task Types

**Context Task** (`_context.json`):
- Always first in every task list
- Holds goal overview, scope, conventions, guidance
- References parent task list (if child)
- Workers read this first for global context

**Pointer Task**:
- References a child task list via `childPath` in metadata
- Has `type: "pointer"` in metadata
- Can have `blockedBy` dependencies on other pointer tasks in the same task list (no cross-list dependencies)
- Status reflects child task list completion

**Regular Task**:
- Executable work item
- Has `subject`, `description`, `status`, `blockedBy`
- Worker picks up, executes, marks completed

### Task JSON Schema

```json
{
  "id": "write-migration-tests",
  "subject": "Write migration tests",
  "description": "Create test cases for database migrations...",
  "activeForm": "Writing migration tests",
  "status": "pending",
  "blocks": [],
  "blockedBy": [],
  "metadata": {
    "type": "task",
    "guidance": "Follow TDD approach, write tests before implementation",
    "doneWhen": "All migration test cases pass"
  }
}
```

Pointer task example:
```json
{
  "id": "setup-database",
  "subject": "Setup database schema",
  "description": "Create database schema for user authentication...",
  "activeForm": "Setting up database",
  "status": "pending",
  "blocks": [],
  "blockedBy": [],
  "metadata": {
    "type": "pointer",
    "childPath": "setup-database/"
  }
}
```

### Hydration & Sync

**Hydration (before execution):**
1. Read the specific task list being executed from `.saga/tasks/<path>/`
2. Create `~/.claude/tasks/saga__<flattened-path>/`
3. Copy all `.json` files for that task list only
4. Write `.highwatermark` file with next available ID

**Sync (via tool hooks):**
- Tool hooks are registered for Tasks builtin tools (`TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet`)
- Hooks intercept tool calls and sync status changes to `.saga/tasks/<path>/`
- Cleanup of `~/.claude/tasks/saga__<flattened-path>/` happens after task list execution completes

### SAGA Execution Script

A deterministic script manages task list execution. It handles both regular tasks and pointer tasks:

1. Hydrate task list to `~/.claude/tasks/`
2. Spawn headless worker: `CLAUDE_CODE_TASK_LIST_ID=saga__<path> claude -p "..."`
3. Worker executes all regular tasks in dependency order
4. When the script encounters a pointer task:
   - Recursively execute the child task list
   - Mark pointer task as completed when child list finishes
5. Tool hooks sync status to `.saga/tasks/` during execution
6. Clean up `~/.claude/tasks/` after completion

**Required environment variables for headless execution:**
```bash
CLAUDE_CODE_ENABLE_TASKS=true CLAUDE_CODE_TASK_LIST_ID=saga__<path> claude -p "..."
```

For a flat task list (no pointers), the orchestrator simply hydrates, spawns one worker, syncs, and cleans up.

### Worker Execution Loop

Each worker (inside a child task list):

1. `TaskGet("_context")` → load global context
2. `TaskList` → find next pending unblocked task
3. `TaskGet(<task-id>)` → load full description
4. Execute the work (write code, run tests, etc.)
5. `TaskUpdate(<task-id>, status: "completed")`
6. Repeat until all tasks done

## Key Decisions

### Native Tasks as Runtime, SAGA as Source of Truth

- **Choice**: `.saga/tasks/` is source of truth, hydrate to `~/.claude/tasks/` at runtime
- **Rationale**: Claude Code's task storage is not configurable (always `~/.claude/tasks/`), has no cleanup, and is not git-trackable. SAGA needs project-local, version-controlled storage.
- **Alternatives**: Use `~/.claude/tasks/` directly (rejected: not git-trackable, no cleanup)

### Descriptive Filenames and IDs

- **Choice**: Filename = `{id}.json`, IDs are descriptive slugs (e.g., `write-migration-tests`)
- **Rationale**: Human-readable in file explorer, self-documenting. Claude Code accepts non-numeric string IDs.
- **Alternatives**: Numeric IDs (rejected: not human-readable), hash IDs (rejected: opaque)

### Nested Folders for Hierarchy

- **Choice**: Child task lists are subfolders of their parent
- **Rationale**: Visual hierarchy in file explorer, natural grouping, easy to navigate
- **Alternatives**: Flat with `--` separators (rejected: loses visual hierarchy)

### Context as First Task

- **Choice**: `_context.json` is always present, holds global context
- **Rationale**: Workers load context through same interface (`TaskGet`), no separate files needed
- **Alternatives**: Separate `context.json` outside task list (rejected: inconsistent interface)

### Drop Epic/Story Terminology

- **Choice**: Everything is a "task list", no distinction between epic and story
- **Rationale**: Simpler mental model. Root vs child is just tree depth, not a different concept.
- **Alternatives**: Keep epic/story (rejected: adds confusion when underlying format is the same)

## Data Models

### Task Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique within task list, matches filename |
| subject | string | Yes | Short imperative title |
| description | string | Yes | Full context for execution |
| activeForm | string | No | Present continuous for spinner ("Writing tests") |
| status | enum | Yes | "pending", "in_progress", "completed" |
| blocks | string[] | Yes | Task IDs that wait on this task |
| blockedBy | string[] | Yes | Task IDs that must complete first |
| metadata | object | No | Type, guidance, doneWhen, childPath, etc. |

### Metadata Fields

| Field | Used In | Description |
|-------|---------|-------------|
| type | All | "context", "pointer", or "task" |
| childPath | Pointer | Relative path to child task list folder |
| parent | Context | ID of parent pointer task (for child lists) |
| guidance | Task | How to approach the work |
| doneWhen | Task | Completion criteria |
| avoid | Task | Patterns to avoid |

## Interface Contracts

### Hydration Service

```
hydrate(sagaPath: string): void
  - Input: path relative to .saga/tasks/ (e.g., "user-authentication/setup-database")
  - Output: Creates ~/.claude/tasks/saga__user-authentication__setup-database/
  - Copies all .json files, writes .highwatermark
```

### Sync via Tool Hooks

```
Tool hooks registered for: TaskCreate, TaskUpdate, TaskList, TaskGet
  - Intercept tool calls during worker execution
  - Sync status changes to .saga/tasks/<path>/*.json in real-time
  - Cleanup ~/.claude/tasks/saga__<flattened-path>/ after execution completes
```

### Execution Script

```
execute(rootPath: string): void
  - Input: root task list path (e.g., "user-authentication")
  - Output: All child task lists executed in dependency order
  - Spawns workers, handles pointer tasks, monitors completion
```

## Tech Stack

- **Storage**: JSON files in `.saga/tasks/` (source of truth) and `~/.claude/tasks/` (runtime)
- **Execution**: Claude Code headless mode with `CLAUDE_CODE_TASK_LIST_ID`
- **Orchestration**: Bash scripts or Node.js for spawning workers and monitoring
- **Dashboard**: Existing SAGA dashboard, updated to read `.saga/tasks/`

## Open Questions

1. **`.highwatermark` management**: Claude Code uses this for auto-increment. When SAGA pre-populates task files with string IDs, what should `.highwatermark` contain? Needs investigation.

2. **Dashboard migration**: Dashboard currently reads `.saga/epics/` and `.saga/stories/`. Needs update to read `.saga/tasks/` tree structure and visualize pointer/child relationships.
