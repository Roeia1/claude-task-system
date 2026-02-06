---
id: story-epic-json-storage
title: Story and Epic JSON Storage
status: ready
epic: tasks-tools-integration
tasks:
  - id: t1
    title: Create new directory structure and update /init skill
    status: pending
  - id: t2
    title: Implement story.json read/write utilities
    status: pending
  - id: t3
    title: Implement epic.json read/write utilities
    status: pending
  - id: t4
    title: Implement task JSON read/write utilities
    status: pending
  - id: t5
    title: Implement derived status computation
    status: pending
  - id: t6
    title: Implement ID validation and uniqueness enforcement
    status: pending
  - id: t7
    title: Update directory.ts path utilities for new structure
    status: pending
  - id: t8
    title: Integration tests for full read/write cycle
    status: pending
---

## Context

SAGA currently stores epics and stories as markdown files with YAML frontmatter in a nested directory structure: `.saga/epics/<epic-slug>/stories/<story-slug>/story.md`. This story migrates the storage layer to a new JSON-based format with a flat structure:

- **Stories** become flat folders at `.saga/stories/<story-id>/` containing `story.json` (metadata) and individual task files (`<task-id>.json`).
- **Epics** become single JSON files at `.saga/epics/<epic-id>.json` (no longer directories).
- **Status** is no longer stored on stories or epics -- it is derived at read time from child statuses (task statuses for stories, story statuses for epics).
- **Story IDs** must be globally unique across the project, enforced at creation time using `[a-z0-9-]` format.

This story builds the foundational storage layer that all other stories in this epic depend on. It provides the read/write utilities, validation logic, and directory structure that the types migration, hydration layer, worker script, skills migration, and dashboard adaptation will consume.

## Scope Boundaries

**In scope:**
- New directory structure: `.saga/stories/<story-id>/` (flat, globally unique IDs) and `.saga/epics/<epic-id>.json` (single files)
- Read/write utility functions for `story.json`, `<epic-id>.json`, and `<task-id>.json` files
- Derived status computation: story status from task statuses, epic status from story statuses
- ID validation (`[a-z0-9-]` pattern) and uniqueness enforcement (checking existing `.saga/stories/` folders)
- Updating the `/init` skill to create the new `.saga/stories/` directory alongside existing `.saga/epics/`
- Updating `directory.ts` in `saga-types` to add path utilities for the new flat structure
- All new scripts and utilities must live in `packages/plugin-scripts/` following the existing pattern (TypeScript source compiled via esbuild to `plugin/scripts/`)

**Out of scope:**
- Zod schema definitions and TypeScript interface types (covered by "SAGA Types Migration to JSON Format" story)
- Hydration to `~/.claude/tasks/` or sync layer via tool hooks (covered by "Hydration and Sync Layer" story)
- Worker script or execution pipeline (covered by "Worker Script and Execution Pipeline" story)
- Updating existing skills to consume the new format (covered by "Skills Migration" story)
- Dashboard changes to read new format (covered by "Dashboard Adaptation" story)
- Migration of existing markdown-based epics/stories to new format (no backward compatibility required per epic)
- Epic orchestration or parallel execution

## Interface

### Inputs

- New TypeScript types (`Story`, `Epic`, `Task` interfaces and Zod schemas) from `saga-types` package -- these will be defined by the "SAGA Types Migration" story. If those types are not yet available, define local interim types in the utility module that match the epic's data model specifications, and add a TODO comment referencing the types story.
- Existing `packages/plugin-scripts/` build infrastructure (esbuild config, `shared/env.ts`)
- Existing `saga-types` `directory.ts` path utilities

### Outputs

- **`readStory(projectRoot, storyId)`**: Reads `.saga/stories/<storyId>/story.json` and returns parsed Story object
- **`writeStory(projectRoot, story)`**: Writes story.json to `.saga/stories/<story.id>/story.json`, creating directory if needed
- **`readEpic(projectRoot, epicId)`**: Reads `.saga/epics/<epicId>.json` and returns parsed Epic object
- **`writeEpic(projectRoot, epic)`**: Writes epic JSON to `.saga/epics/<epicId>.json`
- **`readTask(projectRoot, storyId, taskId)`**: Reads `.saga/stories/<storyId>/<taskId>.json` and returns parsed Task object
- **`writeTask(projectRoot, storyId, task)`**: Writes task JSON to `.saga/stories/<storyId>/<task.id>.json`
- **`listTasks(projectRoot, storyId)`**: Lists all task files in a story folder, returns parsed Task array
- **`listStories(projectRoot)`**: Lists all story folders in `.saga/stories/`
- **`deriveStoryStatus(tasks)`**: Computes story status from task statuses
- **`deriveEpicStatus(storyStatuses)`**: Computes epic status from story statuses
- **`validateStoryId(id)`**: Validates `[a-z0-9-]` format
- **`ensureUniqueStoryId(projectRoot, id)`**: Checks `.saga/stories/` for conflicts
- Updated `/init` skill that creates `.saga/stories/` directory
- Updated `directory.ts` with new flat-structure path helpers

## Acceptance Criteria

- [ ] Running `/init` creates `.saga/stories/` directory alongside `.saga/epics/`, `.saga/archive/`, and `.saga/worktrees/`
- [ ] `writeStory` creates `.saga/stories/<id>/story.json` with valid JSON matching the Story schema
- [ ] `readStory` reads and parses a story.json file, returning a typed Story object
- [ ] `writeEpic` creates `.saga/epics/<id>.json` with valid JSON matching the Epic schema
- [ ] `readEpic` reads and parses an epic JSON file, returning a typed Epic object
- [ ] `writeTask` creates `.saga/stories/<storyId>/<taskId>.json` with valid JSON matching the Task schema
- [ ] `readTask` reads and parses a task JSON file, returning a typed Task object
- [ ] `listTasks` returns all tasks for a story, excluding `story.json` and `journal.md`
- [ ] `deriveStoryStatus` returns `"in_progress"` when any task is in_progress, `"completed"` when all tasks are completed, `"pending"` otherwise
- [ ] `deriveEpicStatus` returns `"in_progress"` when any story is in_progress, `"completed"` when all stories are completed, `"pending"` otherwise
- [ ] `validateStoryId` rejects IDs containing uppercase, spaces, or special characters outside `[a-z0-9-]`
- [ ] `ensureUniqueStoryId` throws when a story folder with the same ID already exists
- [ ] All utility functions have unit tests with edge cases (empty arrays, missing files, malformed JSON)
- [ ] `directory.ts` in saga-types has new path helpers for flat story structure and single-file epic structure
- [ ] All new code follows the TDD pattern (tests written before implementation)

## Tasks

### t1: Create new directory structure and update /init skill

**Guidance:**
- Update the `/init` skill (`plugin/skills/init/SKILL.md`) to create `.saga/stories/` in addition to the existing `.saga/epics/`, `.saga/archive/`, and `.saga/worktrees/` directories
- The `mkdir -p` command should become: `mkdir -p .saga/epics .saga/stories .saga/archive .saga/worktrees`
- Update the completion message to list `.saga/stories/` as "Story data folders (JSON)"
- Keep the init skill idempotent -- running it again should still just report existing structure

**References:**
- Current init skill: `plugin/skills/init/SKILL.md`
- Epic section on storage structure: see "Storage" section of the epic

**Avoid:**
- Removing or renaming existing directories -- this is additive
- Changing the gitignore patterns (`.saga/worktrees/` is already ignored, `.saga/stories/` should be tracked)

**Done when:**
- `/init` creates all four directories including `.saga/stories/`
- The completion message accurately describes the new directory
- The idempotency check still works correctly

### t2: Implement story.json read/write utilities

**Guidance:**
- Create a new TypeScript source file in `packages/plugin-scripts/src/` (e.g., `storage.ts` or `story-storage.ts`) for story read/write functions
- Write tests first in a corresponding `.test.ts` file using vitest
- `writeStory(projectRoot, story)` should: validate the story object, create the directory `.saga/stories/<story.id>/` if it does not exist, write `story.json` with `JSON.stringify(story, null, 2)` plus trailing newline
- `readStory(projectRoot, storyId)` should: read the file, parse JSON, validate against schema (or local type), return typed object
- Handle error cases: directory does not exist, file does not exist, malformed JSON
- Use `fs.readFileSync`/`fs.writeFileSync` for simplicity (these are synchronous CLI scripts)
- If the Zod schemas from `saga-types` are not yet available, define minimal local type guards and add TODO comments

**References:**
- Story schema from epic: `{ id, title, description, epic?, guidance?, doneWhen?, avoid?, branch?, pr?, worktree? }`
- Existing pattern in `packages/plugin-scripts/src/worktree.ts` for file system operations
- Existing `shared/env.ts` for getting project directory

**Avoid:**
- Async operations -- keep all I/O synchronous for script usage
- Storing `status` field in story.json (status is derived, never persisted)
- Coupling to specific Zod schemas that may not exist yet -- use local types with TODO markers

**Done when:**
- `writeStory` creates correctly structured story.json files
- `readStory` returns a typed Story object from a valid file
- Both functions throw descriptive errors for invalid inputs (missing ID, bad JSON)
- Unit tests cover: happy path, missing directory, missing file, malformed JSON, round-trip write-then-read

### t3: Implement epic.json read/write utilities

**Guidance:**
- Add epic read/write functions to the storage module (same file or a companion file)
- Write tests first
- `writeEpic(projectRoot, epic)` should: validate the epic object, write to `.saga/epics/<epic.id>.json` with pretty-printed JSON
- `readEpic(projectRoot, epicId)` should: read `.saga/epics/<epicId>.json`, parse, validate, return typed object
- Note that the new epic format is a single file (not a directory) -- `.saga/epics/<id>.json`
- The `children` array contains objects with `{ id, blockedBy }` structure
- Handle error cases: file does not exist, malformed JSON, invalid children array

**References:**
- Epic schema from epic: `{ id, title, description, children: [{ id, blockedBy }] }`
- Current epic structure in `packages/saga-types/src/epic.ts` (for understanding old format, not for reuse)

**Avoid:**
- Creating directories for epics -- they are single files now
- Storing `status` field in epic.json (status is derived from story statuses)
- Any backward compatibility with the old markdown-based epic format

**Done when:**
- `writeEpic` creates correctly structured JSON files at `.saga/epics/<id>.json`
- `readEpic` returns a typed Epic object from a valid file
- Unit tests cover: happy path, missing file, malformed JSON, empty children, round-trip

### t4: Implement task JSON read/write utilities

**Guidance:**
- Add task read/write functions to the storage module
- Write tests first
- `writeTask(projectRoot, storyId, task)` should: write to `.saga/stories/<storyId>/<task.id>.json`, creating the story directory if needed
- `readTask(projectRoot, storyId, taskId)` should: read `.saga/stories/<storyId>/<taskId>.json`, parse, validate, return typed object
- `listTasks(projectRoot, storyId)` should: read the story directory, filter to only `.json` files that are not `story.json`, parse each, return array of Task objects
- Task filename must always match `task.id` -- the filename is `<id>.json`
- Task status field IS stored (unlike story/epic status)

**References:**
- Task schema from epic: `{ id, subject, description, activeForm?, status, blockedBy, guidance?, doneWhen? }`
- File listing pattern: `readdirSync` + filter

**Avoid:**
- Including `story.json` in task listing -- filter it out explicitly
- Including `journal.md` in task listing -- filter non-JSON files
- Allowing task ID to differ from filename (validate consistency)

**Done when:**
- `writeTask` creates correctly structured task JSON files
- `readTask` returns a typed Task object from a valid file
- `listTasks` returns all tasks for a story, excluding story.json and journal.md
- Unit tests cover: happy path, multiple tasks, empty story folder, ID-filename mismatch detection, round-trip

### t5: Implement derived status computation

**Guidance:**
- Write tests first for all derivation rules
- `deriveStoryStatus(tasks: Task[]): StoryStatus` -- derives story status from its tasks:
  - If any task has `status: "in_progress"` -> return `"in_progress"`
  - If all tasks have `status: "completed"` -> return `"completed"`
  - Otherwise -> return `"pending"`
  - Edge case: empty task array -> return `"pending"`
- `deriveEpicStatus(storyStatuses: StoryStatus[]): EpicStatus` -- derives epic status from story statuses:
  - Same rules as story status derivation but applied to story statuses
  - Edge case: empty array -> return `"pending"`
- These are pure functions with no I/O -- they operate on arrays of status values
- Consider adding a higher-level `readStoryWithStatus` that reads a story + its tasks and returns the story with derived status

**References:**
- Derivation rules from epic: "Derived Status (No Stored Status on Story or Epic)" key decision
- Status enum values: `"pending"`, `"in_progress"`, `"completed"`

**Avoid:**
- Writing status to story.json or epic.json -- status is always derived
- Complex state machines -- the derivation is three simple rules
- Treating `"blocked"` as a valid status (the old format had "blocked", the new format does not)

**Done when:**
- `deriveStoryStatus` returns correct status for all combinations of task statuses
- `deriveEpicStatus` returns correct status for all combinations of story statuses
- Edge cases tested: empty arrays, single-element arrays, mixed statuses
- All in_progress priority cases verified (in_progress wins over pending)

### t6: Implement ID validation and uniqueness enforcement

**Guidance:**
- Write tests first
- `validateStoryId(id: string): boolean` -- validates that the ID matches `[a-z0-9-]+` pattern (no uppercase, no spaces, no special characters, no empty string)
- `ensureUniqueStoryId(projectRoot: string, id: string): void` -- checks if `.saga/stories/<id>/` already exists, throws a descriptive error if it does
- Consider a combined helper `validateAndEnsureUniqueStoryId` that does both checks
- The validation regex should be: `/^[a-z0-9-]+$/` (must have at least one character)

**References:**
- ID rules from epic: "Story IDs use [a-z0-9-] (lowercase, digits, dashes). IDs must be globally unique across the project."
- The generation skill (which creates stories) will call these validators

**Avoid:**
- Overly restrictive validation (dashes are valid, single characters are valid)
- Allowing empty strings, strings starting/ending with dashes (consider if this matters)
- File system checks for validation -- `validateStoryId` should be pure, only `ensureUniqueStoryId` touches the file system

**Done when:**
- `validateStoryId` accepts valid IDs like `"auth-setup-db"`, `"a"`, `"my-story-123"`
- `validateStoryId` rejects IDs like `"Auth-Setup"`, `"my story"`, `"my_story"`, `""`, `"story@1"`
- `ensureUniqueStoryId` passes when no directory exists
- `ensureUniqueStoryId` throws when a story directory already exists
- Unit tests cover both valid and invalid cases exhaustively

### t7: Update directory.ts path utilities for new structure

**Guidance:**
- Update `packages/saga-types/src/directory.ts` to add new path helper functions for the flat story structure
- Write tests first in `directory.test.ts`
- Add `createFlatStoryPaths(projectRoot, storyId)` returning: `{ storyId, storyDir, storyJson, journalMd }`
  - `storyDir`: `.saga/stories/<storyId>/`
  - `storyJson`: `.saga/stories/<storyId>/story.json`
  - `journalMd`: `.saga/stories/<storyId>/journal.md`
- Add `createFlatEpicPath(projectRoot, epicId)` returning: `{ epicId, epicJson }`
  - `epicJson`: `.saga/epics/<epicId>.json`
- Add `createTaskPath(projectRoot, storyId, taskId)` returning the path `.saga/stories/<storyId>/<taskId>.json`
- Keep the existing path utilities for backward compatibility during the transition (they are used by existing scripts)
- Export the new types and functions from `index.ts`

**References:**
- Existing `directory.ts` in `packages/saga-types/src/directory.ts`
- New storage structure from epic: flat `.saga/stories/<id>/` and `.saga/epics/<id>.json`

**Avoid:**
- Removing existing path utilities -- they are still used by current scripts
- Breaking the `saga-types` package exports

**Done when:**
- New path helpers produce correct paths for the flat structure
- Existing path helpers still work unchanged
- New types and functions are exported from `saga-types` index
- Unit tests verify all new path constructions

### t8: Integration tests for full read/write cycle

**Guidance:**
- Write integration tests that exercise the complete workflow
- Test scenario 1: Create a story with tasks, read it back, verify derived status
  - Write story.json, write 3 task files, read story, list tasks, derive status -> "pending"
  - Update one task to in_progress, derive status -> "in_progress"
  - Update all tasks to completed, derive status -> "completed"
- Test scenario 2: Create an epic with children, read it back, verify derived status
  - Write epic.json with 2 children, create both story folders with tasks
  - Derive epic status from story statuses
- Test scenario 3: ID validation + uniqueness
  - Create a story, try to create another with the same ID, verify error
- Use a temporary directory (`os.tmpdir()`) for test isolation
- Clean up temp directories after tests

**References:**
- All utility functions built in t2-t6
- Path helpers from t7
- vitest test patterns used in existing `packages/plugin-scripts/src/*.test.ts`

**Avoid:**
- Testing against the real `.saga/` directory -- always use temp directories
- Flaky tests that depend on timing or external state
- Duplicating unit test coverage -- focus on cross-function interactions

**Done when:**
- Full write-read-derive cycle works for stories, tasks, and epics
- Status derivation is correct after simulated task status changes
- ID uniqueness is enforced across the full workflow
- All tests pass with `pnpm test` in `packages/plugin-scripts/`
