# Storage Layer Documentation

Internal developer documentation for the SAGA storage layer, covering file I/O, directory conventions, schema validation, and path resolution.

## Overview

The storage layer lives in `packages/saga-utils/src/` and is composed of three modules:

| Module | File | Purpose |
|--------|------|---------|
| Directory | `directory.ts` | Path construction and directory structure conventions |
| Storage | `storage.ts` | CRUD operations for stories, tasks, and epics |
| Conversion | `conversion.ts` | Bidirectional mapping between SAGA tasks and Claude Code tasks |

All three are re-exported through `index.ts` as the public API of `@saga-ai/utils`.

---

## 1. Directory Structure Conventions

The `.saga/` directory follows this canonical layout:

```
.saga/
├── config.json                    # Worker and MCP server configuration
├── epics/
│   └── {epic-id}.json             # Single file per epic
├── stories/
│   └── {story-id}/
│       ├── story.json             # Story metadata
│       ├── {task-id}.json         # One file per task
│       └── journal.md             # Execution journal (optional)
├── worktrees/
│   └── {story-id}/                # Git worktree directory (full repo clone)
│       └── .saga/stories/{story-id}/  # Worktree-local story copy
└── archive/
    └── {epic-slug}/
        └── {story-slug}/
            └── story.md           # Archived story summary
```

### Key conventions

- **Epics** are single JSON files, not directories.
- **Stories** are directories containing `story.json` plus task files.
- **Tasks** are individual `{task-id}.json` files within a story directory.
- **Worktrees** are full git worktree clones, each containing their own `.saga/stories/{id}/` with the story's working copy.
- **Story status** is never stored -- it is derived from task statuses at read time.
- **Epic status** is never stored -- it is derived from child story statuses at read time.

---

## 2. Path Resolution Logic

### Path types (defined in `directory.ts`)

| Type | Fields | Example Path |
|------|--------|-------------|
| `SagaPaths` | `root`, `saga`, `epics`, `stories`, `worktrees`, `archive` | `.saga/`, `.saga/epics/`, etc. |
| `EpicPaths` | `epicId`, `epicJson` | `.saga/epics/my-epic.json` |
| `StoryPaths` | `storyId`, `storyDir`, `storyJson`, `journalMd` | `.saga/stories/my-story/story.json` |
| `WorktreePaths` | `storyId`, `worktreeDir` | `.saga/worktrees/my-story/` |
| `ArchivePaths` | `epicSlug`, `storySlug?`, `archiveEpicDir`, `archiveStoryDir?`, `archiveStoryMd?` | `.saga/archive/my-epic/my-story/story.md` |

### Path construction functions

All functions accept a `projectRoot` string and normalize trailing slashes via `normalizeRoot()`.

```typescript
// Root-level paths
createSagaPaths(projectRoot: string): SagaPaths

// Entity-specific paths
createEpicPaths(projectRoot: string, epicId: string): EpicPaths
createStoryPaths(projectRoot: string, storyId: string): StoryPaths
createWorktreePaths(projectRoot: string, storyId: string): WorktreePaths
createArchivePaths(projectRoot: string, epicSlug: string, storySlug?: string): ArchivePaths
createTaskPath(projectRoot: string, storyId: string, taskId: string): string
```

### Project root detection

The `projectRoot` parameter is typically provided via the `SAGA_PROJECT_DIR` environment variable, which points to the project root directory (the parent of `.saga/`). In worktree contexts, this points to the worktree directory itself (e.g., `.saga/worktrees/{story-id}/`).

---

## 3. Storage Functions and Signatures

All storage functions are in `storage.ts` and operate on the file system synchronously.

### Story CRUD

```typescript
// Write story.json, creating the directory if needed. Validates against StorySchema.
writeStory(projectRoot: string, story: Story): void

// Read and validate story.json. Throws if missing or invalid.
readStory(projectRoot: string, storyId: string): Story

// List all stories in .saga/stories/. Throws if directory missing.
listStories(projectRoot: string): Story[]

// Filter stories by epic membership
listEpicStories(projectRoot: string, epicId: string): Story[]
listStandaloneStories(projectRoot: string): Story[]
```

### Task CRUD

```typescript
// Write {task.id}.json in story directory. Validates against TaskSchema.
writeTask(projectRoot: string, storyId: string, task: Task): void

// Read and validate a task file. Throws if missing or invalid.
readTask(projectRoot: string, storyId: string, taskId: string): Task

// List all task files in a story directory (excludes story.json).
listTasks(projectRoot: string, storyId: string): Task[]
```

### Epic CRUD

```typescript
// Write epic JSON file. Validates against EpicSchema.
writeEpic(projectRoot: string, epic: Epic): void

// Read and validate an epic file. Throws if missing or invalid.
readEpic(projectRoot: string, epicId: string): Epic

// List all epics in .saga/epics/. Throws if directory missing.
listEpics(projectRoot: string): Epic[]
```

### Story Scanning

```typescript
// Scan all stories from both .saga/stories/ and .saga/worktrees/.
// Returns ScannedStory objects with tasks, derived status, and path metadata.
// Worktree versions take priority when a story exists in both locations.
scanStories(projectRoot: string): ScannedStory[]
```

The `ScannedStory` type extends `Story` with:
- `status: TaskStatus` -- derived from task statuses
- `storyPath: string` -- full path to story.json
- `worktreePath?: string` -- full path to worktree directory (if exists)
- `journalPath?: string` -- full path to journal.md (if exists)
- `tasks: Task[]` -- all tasks belonging to this story

Scanning works in two phases:
1. `scanMasterStories()` reads `.saga/stories/` for stories on the current branch
2. `scanWorktreeStories()` reads `.saga/worktrees/<id>/.saga/stories/<id>/` and overwrites any master entries with the same ID

### Status Derivation

```typescript
// Derive story status from task statuses
deriveStoryStatus(tasks: Pick<Task, 'status'>[]): TaskStatus
// Rules: any in_progress -> in_progress; all completed -> completed; else pending

// Derive epic status from story statuses
deriveEpicStatus(storyStatuses: TaskStatus[]): TaskStatus
// Same rules as deriveStoryStatus
```

### Validation and Existence Checks

```typescript
// Validate story ID format: /^[a-z0-9-]+$/
validateStoryId(id: string): boolean

// Throw if story directory already exists
ensureUniqueStoryId(projectRoot: string, id: string): void

// Check directory existence
storiesDirectoryExists(projectRoot: string): boolean
epicsDirectoryExists(projectRoot: string): boolean
```

---

## 4. File Format Schemas

All schemas use [Zod](https://zod.dev/) for runtime validation. Defined in `packages/saga-utils/src/schemas/`.

### StorySchema (`story.ts`)

```typescript
{
  id: string,           // Story identifier (lowercase alphanumeric + hyphens)
  title: string,        // Human-readable title
  description: string,  // Full description
  epic?: string,        // Parent epic ID (optional)
  guidance?: string,    // Execution guidance for the worker
  doneWhen?: string,    // Acceptance criteria
  avoid?: string,       // Things to avoid during execution
  branch?: string,      // Git branch name
  pr?: string,          // Pull request URL
  worktree?: string,    // Worktree path
}
```

Schema is `.strict()` -- extra fields cause validation errors.

### TaskSchema (`task.ts`)

```typescript
{
  id: string,           // Task identifier
  subject: string,      // Brief description
  description: string,  // Detailed requirements
  activeForm?: string,  // Present continuous form for spinner display
  status: 'pending' | 'in_progress' | 'completed',
  blockedBy: string[],  // IDs of tasks that must complete first
  guidance?: string,    // Execution guidance
  doneWhen?: string,    // Acceptance criteria
}
```

### EpicSchema (`epic.ts`)

```typescript
{
  id: string,           // Epic identifier
  title: string,        // Human-readable title
  description: string,  // Full description
  children: [{          // Child story references
    id: string,         // Story ID
    blockedBy: string[] // Story IDs this child depends on
  }]
}
```

Schema is `.strict()` -- extra fields cause validation errors.

### ClaudeCodeTaskSchema (`claude-code-task.ts`)

```typescript
{
  id: string,
  subject: string,
  description: string,
  activeForm?: string,
  status: 'pending' | 'in_progress' | 'completed',
  owner?: string,
  blocks: string[],
  blockedBy: string[],
  metadata?: Record<string, unknown>,
}
```

### SessionSchema (`session.ts`)

```typescript
{
  name: string,           // Session name: saga__<epic>__<story>__<pid>
  epicSlug: string,       // Epic slug from session name
  storySlug: string,      // Story slug from session name
  status: 'running' | 'completed',
  outputFile: string,     // Path to output file
  outputAvailable: boolean,
  startTime: string,      // ISO 8601
  endTime?: string,       // ISO 8601, only for completed sessions
  outputPreview?: string, // Last lines of output
}
```

### Worker Message Types (`worker-message.ts`)

SAGA worker messages use `type: 'saga_worker'` with subtypes:
- `pipeline_start` -- Worker begins processing a story
- `pipeline_step` -- Progress update within a pipeline
- `pipeline_end` -- Worker finishes (with status, exit code, cycles, elapsed time)
- `cycle_start` -- Individual execution cycle begins
- `cycle_end` -- Individual execution cycle ends

Combined type `WorkerMessage = SagaWorkerMessage | SDKMessage` covers all JSONL output.

---

## 5. Config File Handling

The `.saga/config.json` file stores project-level configuration:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "pnpm",
      "args": ["dlx", "shadcn@latest", "mcp"]
    }
  },
  "worker": {
    "maxTokensPerSession": 20000,
    "maxTasksPerSession": 10
  }
}
```

Config is read by the worker infrastructure (not by the storage module itself). The storage module focuses on story/task/epic data.

---

## 6. Conversion Layer

The conversion module (`conversion.ts`) maps between SAGA tasks and Claude Code's native task format.

### `toClaudeTask(sagaTask: Task): ClaudeCodeTask`

Converts a SAGA task for use with Claude Code's TaskList/TaskGet/TaskUpdate tools:
- `guidance` and `doneWhen` are placed in `metadata`
- `blocks` is always `[]` (computed separately from other tasks' `blockedBy`)

### `fromClaudeTask(claudeTask: ClaudeCodeTask): Pick<Task, 'status'>`

Extracts only `status` from a Claude Code task back to SAGA format. Other fields are source-controlled in SAGA and are not overwritten.

---

## 7. Call Sites and Usage Patterns

### Storage functions are used by:

- **Worker scripts** (`plugin/scripts/`) -- read stories and tasks, write task status updates
- **Skills** (`plugin/skills/`) -- create epics, generate stories, execute stories
- **Dashboard scripts** (`packages/saga-utils/src/scripts/`) -- scan stories and epics for dashboard display
- **Hooks** (`plugin/hooks/`) -- read story context during session startup

### Common patterns:

```typescript
// Reading a story and its tasks
const story = readStory(projectRoot, storyId);
const tasks = listTasks(projectRoot, storyId);

// Writing a new story with tasks
writeStory(projectRoot, { id, title, description });
writeTask(projectRoot, storyId, { id: 'task-1', subject: '...', description: '...', status: 'pending', blockedBy: [] });

// Scanning all stories for dashboard
const allStories = scanStories(projectRoot);

// Validating before creation
if (!validateStoryId(id)) throw new Error('Invalid ID');
ensureUniqueStoryId(projectRoot, id);
```
