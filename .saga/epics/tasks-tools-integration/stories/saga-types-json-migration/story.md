---
id: saga-types-json-migration
title: SAGA Types Migration to JSON Format
status: ready
epic: tasks-tools-integration
tasks:
  - id: t1
    title: Define new Task type and Zod schema
    status: pending
  - id: t2
    title: Define new Story type and Zod schema
    status: pending
  - id: t3
    title: Define new Epic type and Zod schema
    status: pending
  - id: t4
    title: Define ClaudeCodeTask type and schema
    status: pending
  - id: t5
    title: Implement toClaudeTask and fromClaudeTask conversion functions
    status: pending
  - id: t6
    title: Update SagaPaths and directory utilities for new flat structure
    status: pending
  - id: t7
    title: Update barrel exports in index.ts
    status: pending
  - id: t8
    title: Update and verify all tests pass
    status: pending
---

## Context

SAGA currently uses a markdown-based type system in the `packages/saga-types` package. Stories are represented as markdown files with YAML frontmatter, and the types (`Story`, `StoryFrontmatter`, `Task`, `Epic`) reflect that structure. The project is migrating to a JSON-based storage format where stories live in flat `.saga/stories/<story-id>/` folders containing `story.json` and individual task files (`{id}.json`), and epics are single files at `.saga/epics/<epic-id>.json`.

This story replaces all existing types in `packages/saga-types` with the new JSON-based interfaces defined in the epic. This is a **breaking change** -- there is no backward compatibility with the old markdown-based types. The new types include:

- **Task**: An atomic work item stored as `{id}.json` in a story folder, with fields for `subject`, `description`, `activeForm`, `status`, `blockedBy`, `guidance`, and `doneWhen`.
- **Story**: Metadata stored in `story.json`, with `id`, `title`, `description`, optional `epic` reference, `guidance`, `doneWhen`, `avoid`, and runtime execution state (`branch`, `pr`, `worktree`). Status is **not stored** -- it is derived from task statuses at read time.
- **Epic**: A single JSON file with `id`, `title`, `description`, and `children` array (each child has a story `id` and `blockedBy` list). Status is derived from child story statuses at read time.
- **ClaudeCodeTask**: The interface matching Claude Code's native Tasks tools (`TaskList`, `TaskGet`, `TaskUpdate`), used as the runtime format.
- **Conversion layer**: `toClaudeTask()` and `fromClaudeTask()` functions that bridge SAGA tasks to/from Claude Code format during hydration and sync.

The directory utilities (`SagaPaths`, `EpicPaths`, `StoryPaths`, `WorktreePaths`) must be updated to reflect the new flat `.saga/stories/` layout and single-file `.saga/epics/<id>.json` structure, replacing the current nested `.saga/epics/<epic-slug>/stories/<story-slug>/` hierarchy.

## Scope Boundaries

**In scope:**
- Replace `Task` type: old had `id`, `title`, `status`; new has `id`, `subject`, `description`, `activeForm?`, `status`, `blockedBy`, `guidance?`, `doneWhen?`
- Replace `StoryFrontmatter` / `Story` types with the new `Story` interface (no `frontmatter`/`content` split -- a single flat interface for `story.json`)
- Replace `Epic` type: old had `slug`, `path`, `title`, `content`, `storyCounts`, `stories`, `archived`; new has `id`, `title`, `description`, `children[]`
- Remove `StoryStatus` enum (story status is derived, not stored) and `StoryCounts` type
- Add `ClaudeCodeTask` type with Zod schema
- Add `toClaudeTask()` and `fromClaudeTask()` conversion functions
- Update `SagaPaths` to include a `stories` path (`.saga/stories/`)
- Update `EpicPaths` to point to `<epic-id>.json` single file instead of a directory
- Update `StoryPaths` to use flat `.saga/stories/<story-id>/` with `storyJson`, `journalMd` paths
- Update `WorktreePaths` to use story-id-based paths (`.saga/worktrees/<story-id>/`)
- Add `TaskStatus` schema (retained, same values: `pending`, `in_progress`, `completed`)
- Add story ID validation helper (`[a-z0-9-]` pattern)
- All Zod schemas for all new types
- Complete test coverage for schemas, conversion functions, and directory utilities

**Out of scope:**
- Read/write utilities for JSON files (covered by the "Story and Epic JSON Storage" story)
- Hydration service implementation (covered by the "Hydration and Sync Layer" story)
- Tool hook sync logic (covered by the "Hydration and Sync Layer" story)
- Worker script (covered by the "Worker Script and Execution Pipeline" story)
- Skills migration to consume new types (covered by the "Skills Migration" story)
- Dashboard changes (covered by the "Dashboard Adaptation" story)
- Session type changes (the `Session` type in `session.ts` stays as-is for now; session naming updates will come with the worker story)
- Derived status computation functions (that is a read-time concern for the storage layer)

## Interface

### Inputs

- Epic specification for `Task`, `Story`, `Epic`, and `ClaudeCodeTask` interfaces (see epic "Technical Approach > SAGA Types" and "Data Models" sections)
- Existing `packages/saga-types/` package structure (Zod-based, TypeScript, vitest tests)
- Existing package.json with `@saga-ai/types` package name and `zod` dependency

### Outputs

- `packages/saga-types/src/task.ts` -- `Task`, `TaskStatus`, `TaskStatusSchema`, `TaskSchema` types and schemas
- `packages/saga-types/src/story.ts` -- `Story`, `StorySchema` type and schema (replaces old markdown-based types)
- `packages/saga-types/src/epic.ts` -- `Epic`, `EpicChild`, `EpicChildSchema`, `EpicSchema` types and schemas
- `packages/saga-types/src/claude-code-task.ts` -- `ClaudeCodeTask`, `ClaudeCodeTaskSchema` type and schema
- `packages/saga-types/src/conversion.ts` -- `toClaudeTask()`, `fromClaudeTask()` functions
- `packages/saga-types/src/directory.ts` -- Updated `SagaPaths`, `EpicPaths`, `StoryPaths`, `WorktreePaths` types and factories
- `packages/saga-types/src/index.ts` -- Updated barrel exports
- All corresponding `.test.ts` files with comprehensive coverage
- Other stories in this epic can import from `@saga-ai/types` and get the new JSON-based types

## Acceptance Criteria

- [ ] `TaskSchema` validates objects matching `{ id, subject, description, activeForm?, status, blockedBy, guidance?, doneWhen? }`
- [ ] `TaskStatusSchema` validates `"pending" | "in_progress" | "completed"` and rejects all other values
- [ ] `StorySchema` validates objects matching `{ id, title, description, epic?, guidance?, doneWhen?, avoid?, branch?, pr?, worktree? }` with no `status` field
- [ ] `EpicSchema` validates objects matching `{ id, title, description, children: [{ id, blockedBy }] }` with no `status` field
- [ ] `ClaudeCodeTaskSchema` validates objects matching Claude Code's native task format: `{ id, subject, description, activeForm?, status, owner?, blocks, blockedBy, metadata? }`
- [ ] `toClaudeTask(sagaTask)` returns a valid `ClaudeCodeTask` with `guidance` and `doneWhen` mapped to `metadata`
- [ ] `fromClaudeTask(claudeTask)` returns `{ status }` only (just syncs status back)
- [ ] `createSagaPaths()` returns paths including `.saga/stories/`
- [ ] `createEpicPaths()` returns `epicJson` pointing to `.saga/epics/<id>.json` (single file, not directory)
- [ ] `createStoryPaths()` takes `(projectRoot, storyId)` and returns paths under `.saga/stories/<story-id>/` with `storyJson` and `journalMd`
- [ ] `createWorktreePaths()` takes `(projectRoot, storyId)` and returns `.saga/worktrees/<story-id>/`
- [ ] Story ID validation rejects strings with uppercase letters, spaces, or characters outside `[a-z0-9-]`
- [ ] All old markdown-based types (`StoryFrontmatter`, `StoryFrontmatterSchema`, `StoryStatus`, `StoryStatusSchema`, `StoryCounts`, `StoryCountsSchema`) are removed
- [ ] `vitest run` passes in `packages/saga-types/` with all new tests
- [ ] `tsc --noEmit` passes with no type errors

## Tasks

### t1: Define new Task type and Zod schema

**Guidance:**
- Create a new file `packages/saga-types/src/task.ts`
- Define `TaskStatusSchema` as `z.enum(["pending", "in_progress", "completed"])` (same values as current, carried over)
- Define `TaskSchema` with: `id` (string), `subject` (string), `description` (string), `activeForm` (string, optional), `status` (TaskStatusSchema), `blockedBy` (array of strings), `guidance` (string, optional), `doneWhen` (string, optional)
- Export inferred types: `Task`, `TaskStatus`
- Add a `StoryIdSchema` for validating story IDs: `z.string().regex(/^[a-z0-9-]+$/)` -- this can live here or in a shared validation file

**References:**
- Current task type: `packages/saga-types/src/story.ts` (lines 25-30) -- the old `TaskSchema` with `id`, `title`, `status`
- Epic spec for new Task: see "Data Models > Task Schema" section in epic.md
- Zod documentation for `.regex()` validation

**Avoid:**
- Do not include a `title` field -- the new schema uses `subject` instead (matching Claude Code's convention)
- Do not add `blocks` field -- that belongs to `ClaudeCodeTask` only (SAGA tasks only have `blockedBy`)
- Do not make `blockedBy` optional -- it should always be present (empty array `[]` when no blockers)

**Done when:**
- `TaskSchema.parse()` accepts valid task objects with all required fields
- `TaskSchema.parse()` rejects objects missing `subject`, `description`, or `blockedBy`
- `TaskStatusSchema.parse()` accepts only the three valid status values
- `StoryIdSchema` rejects IDs with uppercase, spaces, or special characters
- Tests in `packages/saga-types/src/task.test.ts` cover valid parsing, required field validation, optional field behavior, and ID validation

### t2: Define new Story type and Zod schema

**Guidance:**
- Rewrite `packages/saga-types/src/story.ts` completely
- Define `StorySchema` with: `id` (string), `title` (string), `description` (string), `epic` (string, optional), `guidance` (string, optional), `doneWhen` (string, optional), `avoid` (string, optional), `branch` (string, optional), `pr` (string, optional), `worktree` (string, optional)
- There is **no status field** on `Story` -- status is derived at read time from task statuses
- Remove all old types: `StoryStatus`, `StoryStatusSchema`, `StoryFrontmatter`, `StoryFrontmatterSchema`, and the old `Story`/`StorySchema`

**References:**
- Current file: `packages/saga-types/src/story.ts` -- will be completely replaced
- Epic spec: "Data Models > Story Schema" section in epic.md
- Epic "Key Decisions > Derived Status" -- explains why no status field

**Avoid:**
- Do not include any `status` field on Story
- Do not include `tasks` array in the Story type -- tasks are separate files, not embedded
- Do not include `slug`, `path`, `frontmatter`, or `content` fields from the old type
- Do not keep any backward compatibility with the old markdown-based types

**Done when:**
- `StorySchema.parse()` accepts valid story objects with required fields (`id`, `title`, `description`)
- `StorySchema.parse()` accepts stories with all optional fields (`epic`, `guidance`, `doneWhen`, `avoid`, `branch`, `pr`, `worktree`)
- `StorySchema.parse()` rejects objects with a `status` field (use `.strict()` or verify it does not include status)
- All old types (`StoryFrontmatter`, `StoryStatus`, etc.) are fully removed from the file
- Tests in `packages/saga-types/src/story.test.ts` are rewritten to cover the new schema

### t3: Define new Epic type and Zod schema

**Guidance:**
- Rewrite `packages/saga-types/src/epic.ts` completely
- Define `EpicChildSchema` with: `id` (string), `blockedBy` (array of strings)
- Define `EpicSchema` with: `id` (string), `title` (string), `description` (string), `children` (array of `EpicChildSchema`)
- There is **no status field** on Epic -- status is derived from child story statuses at read time
- Remove all old types: `StoryCounts`, `StoryCountsSchema`, and the old `Epic`/`EpicSchema`

**References:**
- Current file: `packages/saga-types/src/epic.ts` -- will be completely replaced
- Epic spec: "Data Models > Epic Schema" and "Epic Children Schema" sections in epic.md

**Avoid:**
- Do not include `slug`, `path`, `content`, `storyCounts`, `stories`, or `archived` fields from the old type
- Do not include any `status` field on Epic
- Do not import from `./story.ts` -- Epic no longer embeds Story objects

**Done when:**
- `EpicSchema.parse()` accepts valid epic objects with required fields
- `EpicSchema.parse()` validates children array with `id` and `blockedBy` on each entry
- `EpicSchema.parse()` accepts epics with empty `children: []`
- Old types (`StoryCounts`, etc.) are fully removed
- Tests in `packages/saga-types/src/epic.test.ts` are rewritten to cover the new schema

### t4: Define ClaudeCodeTask type and schema

**Guidance:**
- Create a new file `packages/saga-types/src/claude-code-task.ts`
- Define `ClaudeCodeTaskSchema` with: `id` (string), `subject` (string), `description` (string), `activeForm` (string, optional), `status` (TaskStatusSchema -- reuse from `task.ts`), `owner` (string, optional), `blocks` (array of strings), `blockedBy` (array of strings), `metadata` (record of string to unknown, optional)
- Import `TaskStatusSchema` from `./task.ts`

**References:**
- Epic spec: "ClaudeCodeTask Type" section in epic.md
- Claude Code's built-in Tasks tools behavior -- this type mirrors what `TaskGet` returns and `TaskUpdate` accepts

**Avoid:**
- Do not add SAGA-specific fields (`guidance`, `doneWhen`) as first-class properties -- those go in `metadata`
- Do not make `blocks` or `blockedBy` optional -- they should always be present (empty arrays when no relations)

**Done when:**
- `ClaudeCodeTaskSchema.parse()` accepts valid Claude Code task objects
- `ClaudeCodeTaskSchema.parse()` rejects objects missing `blocks` or `blockedBy`
- Optional fields (`activeForm`, `owner`, `metadata`) can be omitted
- Tests in `packages/saga-types/src/claude-code-task.test.ts` cover schema validation

### t5: Implement toClaudeTask and fromClaudeTask conversion functions

**Guidance:**
- Create a new file `packages/saga-types/src/conversion.ts`
- `toClaudeTask(sagaTask: Task): ClaudeCodeTask` -- maps SAGA task fields to Claude Code format. `guidance` and `doneWhen` go into `metadata`. `blocks` is set to `[]` (computed separately from other tasks' `blockedBy`). All other fields map directly.
- `fromClaudeTask(claudeTask: ClaudeCodeTask): Partial<Task>` -- only extracts `status`. Other fields are source-controlled in SAGA and should not be overwritten from Claude Code.
- Import types from `./task.ts` and `./claude-code-task.ts`

**References:**
- Epic spec: "Conversion Layer" section in epic.md -- exact implementation shown
- Epic spec: "Key Decisions > SAGA Types Decoupled from Claude Code" -- rationale for conversion

**Avoid:**
- Do not sync fields other than `status` in `fromClaudeTask` -- only status is synced back
- Do not compute `blocks` in `toClaudeTask` -- that requires knowledge of all tasks in the story, which is the hydration layer's job
- Do not add side effects (file I/O, etc.) -- these are pure data transformation functions

**Done when:**
- `toClaudeTask()` correctly maps all fields including `guidance`/`doneWhen` into `metadata`
- `toClaudeTask()` sets `blocks` to empty array
- `fromClaudeTask()` returns only `{ status }` regardless of other fields present
- `fromClaudeTask()` handles tasks with and without metadata
- Tests in `packages/saga-types/src/conversion.test.ts` cover round-trip scenarios, edge cases (missing optional fields), and verify that only status is synced back

### t6: Update SagaPaths and directory utilities for new flat structure

**Guidance:**
- Rewrite `packages/saga-types/src/directory.ts` to reflect the new directory layout:
  - `SagaPaths`: add `stories` field for `.saga/stories/` path
  - `EpicPaths`: change to return `epicJson` (`.saga/epics/<id>.json`) instead of `epicDir`/`epicMd`/`storiesDir`
  - `StoryPaths`: change signature to `(projectRoot, storyId)` -- no more `epicSlug` parameter. Returns `storyDir` (`.saga/stories/<story-id>/`), `storyJson` (`.saga/stories/<story-id>/story.json`), `journalMd` (`.saga/stories/<story-id>/journal.md`)
  - `WorktreePaths`: change signature to `(projectRoot, storyId)` -- no more `epicSlug` parameter. Returns `worktreeDir` (`.saga/worktrees/<story-id>/`)
  - Consider keeping `ArchivePaths` minimal or removing if not needed for this epic
- The key structural change is that stories are no longer nested under epics in the filesystem

**References:**
- Current file: `packages/saga-types/src/directory.ts` -- shows the current nested structure
- Epic spec: "Storage" section -- shows new flat structure
- Epic spec: "Worktree and Branch Naming" table -- shows story-id-based paths

**Avoid:**
- Do not keep the old `epicSlug`/`storySlug` parameter pattern in `StoryPaths` or `WorktreePaths` -- these now take `storyId` only
- Do not keep `storyMdInWorktree`/`journalMdInWorktree` that reference the old nested `.saga/epics/<epic>/stories/<story>/` path inside worktrees
- Do not remove `ArchivePaths` entirely without checking if it is used elsewhere -- if unused, it can be removed

**Done when:**
- `createSagaPaths()` returns an object with `stories` path alongside existing `epics`, `worktrees`, `archive`
- `createEpicPaths(projectRoot, epicId)` returns `{ epicId, epicJson }` with correct `.saga/epics/<id>.json` path
- `createStoryPaths(projectRoot, storyId)` returns `{ storyId, storyDir, storyJson, journalMd }` under `.saga/stories/<story-id>/`
- `createWorktreePaths(projectRoot, storyId)` returns `{ storyId, worktreeDir }` under `.saga/worktrees/<story-id>/`
- Tests in `packages/saga-types/src/directory.test.ts` are rewritten to verify all new paths

### t7: Update barrel exports in index.ts

**Guidance:**
- Rewrite `packages/saga-types/src/index.ts` to export from all new modules
- Add exports for new files: `./task.ts`, `./claude-code-task.ts`, `./conversion.ts`
- Update exports for modified files: `./story.ts`, `./epic.ts`, `./directory.ts`
- Keep exports for `./session.ts` unchanged
- Update `package.json` exports map if new entry points are added

**References:**
- Current file: `packages/saga-types/src/index.ts` -- shows current barrel export pattern
- Current file: `packages/saga-types/package.json` -- shows current exports map

**Avoid:**
- Do not export removed types (e.g., `StoryFrontmatter`, `StoryCounts`, `StoryStatus`)
- Do not forget to add `./task.ts`, `./claude-code-task.ts`, `./conversion.ts` to the package.json exports map

**Done when:**
- All new types, schemas, and functions are accessible via `import { ... } from "@saga-ai/types"`
- All new types are accessible via direct subpath imports (e.g., `import { Task } from "@saga-ai/types/task.ts"`)
- No old/removed types appear in the exports
- `tsc --noEmit` passes with no errors

### t8: Update and verify all tests pass

**Guidance:**
- Run `pnpm --filter @saga-ai/types test` to execute all tests
- Run `pnpm --filter @saga-ai/types typecheck` to verify no type errors
- Fix any remaining issues found during the full test run
- Ensure test coverage exists for: all schema validations (valid accept, invalid reject), conversion functions (both directions), directory path construction (all path types), edge cases (empty arrays, missing optional fields, trailing slashes)

**References:**
- Current test files: `packages/saga-types/src/*.test.ts`
- Vitest config: `packages/saga-types/vitest.config.ts`

**Avoid:**
- Do not skip fixing failing tests -- all tests must pass
- Do not leave any old test cases that reference removed types

**Done when:**
- `pnpm --filter @saga-ai/types test` exits with 0 (all tests pass)
- `pnpm --filter @saga-ai/types typecheck` exits with 0 (no type errors)
- No test references old types like `StoryFrontmatter`, `StoryCounts`, `StoryStatus`
