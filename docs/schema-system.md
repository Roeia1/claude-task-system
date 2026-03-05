# Schema Validation System Documentation

Internal developer documentation for the SAGA schema system -- Zod schemas, validation, documentation generation, and the `schemas.js` CLI.

## Overview

All SAGA data schemas live in `packages/saga-utils/src/schemas/` and use [Zod](https://zod.dev/) for runtime validation. They serve two purposes:

1. **Validation** -- Every read/write in the storage layer validates data against these schemas
2. **Documentation generation** -- The `schemas.ts` script introspects Zod schemas to produce LLM-readable markdown

### Schema Files

| File | Schemas | Purpose |
|------|---------|---------|
| `story.ts` | `StorySchema` | Story metadata (`story.json`) |
| `task.ts` | `TaskSchema`, `TaskStatusSchema`, `StoryIdSchema` | Task definitions and status values |
| `epic.ts` | `EpicSchema`, `EpicChildSchema` | Epic structure with child references |
| `claude-code-task.ts` | `ClaudeCodeTaskSchema` | Claude Code native task format |
| `session.ts` | `SessionSchema`, `SessionStatusSchema` | Worker session tracking |
| `worker-message.ts` | `SagaWorkerMessage`, `WorkerMessage` (types only) | JSONL output message types |
| `index.ts` | Barrel export | Re-exports all schemas and types |

---

## 1. StorySchema (`story.ts`)

Story metadata stored at `.saga/stories/<id>/story.json`. Status is derived from task statuses at read time -- never stored.

```typescript
export const StorySchema = z.object({
  id: z.string(),            // Unique identifier (kebab-case, lowercase)
  title: z.string(),         // Short human-readable title (5-10 words)
  description: z.string(),   // Rich markdown: scope, approach, criteria, edge cases
  epic: z.string().optional(),     // Parent epic ID (omit for standalone stories)
  guidance: z.string().optional(), // Implementation hints and suggested approach
  doneWhen: z.string().optional(), // Concrete acceptance criteria
  avoid: z.string().optional(),    // Anti-patterns and out-of-scope items
  branch: z.string().optional(),   // Git branch name (auto-set by create-story.js)
  pr: z.string().optional(),       // Pull request URL (auto-set)
  worktree: z.string().optional(), // Worktree path (auto-set)
}).strict();
```

**Key constraints:**
- `.strict()` -- extra fields cause validation errors
- `branch`, `pr`, `worktree` are auto-populated and should not be set manually
- `epic` links a story to its parent epic by ID

---

## 2. TaskSchema (`task.ts`)

A task is an atomic work item stored at `.saga/stories/<storyId>/<id>.json`.

```typescript
export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

export const TaskSchema = z.object({
  id: z.string(),              // Kebab-case slug (e.g., write-auth-tests)
  subject: z.string(),         // Brief imperative title (5-10 words)
  description: z.string(),     // Detailed markdown with context and guidance
  activeForm: z.string().optional(), // Present-continuous label for UI spinner
  status: TaskStatusSchema,    // Current status
  blockedBy: z.array(z.string()), // Task IDs within the same story
  guidance: z.string().optional(), // Implementation hints
  doneWhen: z.string().optional(), // Acceptance criteria
});

export const StoryIdSchema = z.string().regex(/^[a-z0-9-]+$/);
```

**Key constraints:**
- `status` must be one of: `pending`, `in_progress`, `completed`
- `blockedBy` references task IDs within the same story, not across stories
- `StoryIdSchema` enforces lowercase alphanumeric with hyphens only
- No `.strict()` -- allows extra fields (unlike Story and Epic)

---

## 3. EpicSchema (`epic.ts`)

Epic structure stored at `.saga/epics/<id>.json`. Status is derived from child story statuses at read time.

```typescript
export const EpicChildSchema = z.object({
  id: z.string(),                    // Story ID this child references
  blockedBy: z.array(z.string()),    // Sibling story IDs that must complete first
}).strict();

export const EpicSchema = z.object({
  id: z.string(),                    // Unique identifier (kebab-case)
  title: z.string(),                 // Short title
  description: z.string(),          // Rich markdown design doc
  children: z.array(EpicChildSchema), // Ordered list of child story references
}).strict();
```

**Key constraints:**
- Both `.strict()` -- extra fields cause validation errors
- `children` order defines the default execution sequence
- `blockedBy` in children references sibling story IDs (not task IDs)

---

## 4. ClaudeCodeTaskSchema (`claude-code-task.ts`)

Mirrors Claude Code's native task format used by TaskList/TaskGet/TaskUpdate tools.

```typescript
export const ClaudeCodeTaskSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  activeForm: z.string().optional(),
  status: TaskStatusSchema,
  owner: z.string().optional(),       // Agent ID (not in SAGA TaskSchema)
  blocks: z.array(z.string()),        // Tasks blocked by this one (computed)
  blockedBy: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(), // Holds guidance, doneWhen
});
```

**Differences from SAGA TaskSchema:**
- Has `owner` field (agent assignment)
- Has `blocks` field (reverse dependency, computed from other tasks' `blockedBy`)
- Has `metadata` record (holds `guidance` and `doneWhen` from SAGA tasks)
- Missing `guidance` and `doneWhen` as top-level fields (moved to `metadata`)

---

## 5. SessionSchema (`session.ts`)

Tracks worker session information for the dashboard.

```typescript
export const SessionStatusSchema = z.enum(['running', 'completed']);

export const SessionSchema = z.object({
  name: z.string(),               // saga__<epic>__<story>__<pid>
  epicSlug: z.string(),           // Epic slug from session name
  storySlug: z.string(),          // Story slug from session name
  status: SessionStatusSchema,    // running | completed
  outputFile: z.string(),         // Path to output file
  outputAvailable: z.boolean(),   // Whether output file exists
  startTime: z.string(),          // ISO 8601
  endTime: z.string().optional(), // ISO 8601, only for completed
  outputPreview: z.string().optional(), // Last lines of output
});
```

---

## 6. Worker Message Types (`worker-message.ts`)

Pure TypeScript types (no Zod schemas) for JSONL output. Uses discriminated union on `subtype`:

```typescript
export type SagaWorkerMessage =
  | { type: 'saga_worker'; subtype: 'pipeline_start'; timestamp: string; storyId: string }
  | { type: 'saga_worker'; subtype: 'pipeline_step'; timestamp: string; step: number; message: string }
  | { type: 'saga_worker'; subtype: 'pipeline_end'; timestamp: string; storyId: string; status: 'completed' | 'incomplete'; exitCode: number; cycles: number; elapsedMinutes: number }
  | { type: 'saga_worker'; subtype: 'cycle_start'; timestamp: string; cycle: number; maxCycles: number }
  | { type: 'saga_worker'; subtype: 'cycle_end'; timestamp: string; cycle: number; exitCode: number | null };

export type WorkerMessage = SagaWorkerMessage | SDKMessage;
```

All messages use `type: 'saga_worker'` to distinguish from Agent SDK messages (`'assistant'`, `'result'`, `'system'`, etc.).

---

## 7. Schema Relationships

```
Epic
  └── children[].id ──references──> Story.id

Story
  ├── epic ──references──> Epic.id (optional)
  └── contains Task files

Task
  └── blockedBy[] ──references──> Task.id (within same story)

ClaudeCodeTask
  ├── mapped from Task via toClaudeTask()
  ├── blockedBy[] ──references──> ClaudeCodeTask.id
  └── blocks[] ──references──> ClaudeCodeTask.id (computed)
```

**Status derivation chain:**
```
Task.status → deriveStoryStatus() → Story status (computed)
Story statuses → deriveEpicStatus() → Epic status (computed)
```

---

## 8. The `schemas.js` CLI Script

Located at `packages/saga-utils/src/scripts/schemas.ts`, compiled to `plugin/scripts/schemas.js`.

### Usage

```bash
node schemas.js <epic|story|task|create-story-input>
```

### What it does

Introspects Zod schemas at runtime using `describeZodType()` and generates LLM-readable markdown documentation including:

1. **Field table** -- Type, required/optional, and prescriptive description for each field
2. **Nested schemas** -- e.g., `EpicChildSchema` within `EpicSchema`
3. **Example JSON** -- Realistic, markdown-heavy examples
4. **Writing guide** -- Best practices for authoring each entity type

### Zod introspection

The `describeZodType()` function recursively inspects `zodType._def.typeName` to map Zod types to human-readable strings:

| Zod Type | Output |
|----------|--------|
| `ZodString` | `string` |
| `ZodNumber` | `number` |
| `ZodBoolean` | `boolean` |
| `ZodEnum` | `enum("a" \| "b")` |
| `ZodArray` | `<inner>[]` |
| `ZodObject` | `object` |
| `ZodOptional` | Sets `required: false` |
| `ZodDefault` | Sets `required: false` |
| `ZodRecord` | `Record<string, unknown>` |

### Field descriptions

The `FIELD_DESCRIPTIONS` dictionary provides prescriptive, actionable descriptions for every field across all schemas. These are keyed as `"schema.field"` (e.g., `"story.description"`, `"task.blockedBy"`).

### Schema registry

```typescript
const SCHEMAS: Record<string, SchemaEntry> = {
  epic: { schema: EpicSchema, description: '...', nested: { 'children[]': ... } },
  story: { schema: StorySchema, description: '...' },
  task: { schema: TaskSchema, description: '...' },
};
```

---

## 9. The `create-story-input` Format

When `schemas.js create-story-input` is called, it generates combined documentation for the JSON input format used by `create-story.js`:

```json
{
  "story": {
    "id": "<story-id>",
    "title": "<title>",
    "description": "<rich markdown>",
    "epic": "<epic-id or omit>",
    "guidance": "<optional>",
    "doneWhen": "<optional>",
    "avoid": "<optional>"
  },
  "tasks": [
    {
      "id": "<kebab-case-slug>",
      "subject": "<imperative title>",
      "description": "<detailed markdown>",
      "activeForm": "<present-continuous>",
      "status": "pending",
      "blockedBy": []
    }
  ]
}
```

This combines a `Story` and an array of `Task` objects into a single input file. The output includes:
- Input format skeleton
- Full Story schema documentation
- Full Task schema documentation
- Full Epic schema documentation (for reference)
- A realistic full example with markdown-heavy descriptions

---

## 10. How Schemas Are Used

### For validation (storage layer)

Every storage function validates data through schemas before reading or writing:

```typescript
// Writing: validate before writing to disk
const validated = StorySchema.parse(story);
writeFileSync(path, JSON.stringify(validated, null, 2));

// Reading: validate after parsing from disk
const raw = readFileSync(path, 'utf-8');
return TaskSchema.parse(JSON.parse(raw));
```

`Schema.parse()` throws a `ZodError` with detailed messages if validation fails.

### For documentation generation (schemas.js)

The schemas script reads schema definitions at runtime:
- `schema.shape` to enumerate fields
- `zodType._def` to introspect types and constraints
- `FIELD_DESCRIPTIONS` for prescriptive guidance

### For type safety (TypeScript)

Each schema exports an inferred type:
```typescript
export type Story = z.infer<typeof StorySchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Epic = z.infer<typeof EpicSchema>;
```

These types are used throughout the codebase for compile-time type checking.

### For conversion (conversion.ts)

The conversion layer maps between `Task` and `ClaudeCodeTask`:
- `toClaudeTask()`: Moves `guidance`/`doneWhen` into `metadata`, sets `blocks: []`
- `fromClaudeTask()`: Extracts only `status` for sync-back to SAGA
