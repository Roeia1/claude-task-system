# Story: Epic JSON Storage - Execution Journal

## Session 1: 2026-02-06

### Task: t1 - Create new directory structure and update /init skill

**What was done:**
- Updated `plugin/skills/init/SKILL.md` to include `.saga/stories/` in the directory creation command
- Changed `mkdir -p` from `mkdir -p .saga/epics .saga/archive .saga/worktrees` to `mkdir -p .saga/epics .saga/stories .saga/archive .saga/worktrees`
- Updated the "Create directory structure" task description to list `.saga/stories/` as item (2) - "for story data folders (JSON)"
- Updated the "Report completion" task description to include `.saga/stories/` in the bullet points
- Updated the Completion Message section to include `.saga/stories/` - Story data folders (JSON)
- Added a note in the Notes section: "The `.saga/stories/` directory stores story data as JSON files and is tracked in git"
- Verified idempotency check is unchanged (still uses `ls .saga/ 2>/dev/null`)

**Decisions:**
- Kept the change purely additive - no existing directories or patterns were modified
- `.saga/stories/` is tracked in git (not gitignored), consistent with `.saga/epics/` behavior

**Test baseline:**
- saga-types: 78/78 tests pass
- plugin-scripts: 200/231 pass (31 pre-existing failures in find.test.ts, worktree.test.ts, finder.test.ts, orchestrator.test.ts - unrelated to this story)

**Next steps:**
- t2: Implement story.json read/write utilities

## Session 2: 2026-02-06

### Task: t2 - Implement story.json read/write utilities

**What was done:**
- Created `packages/plugin-scripts/src/storage.ts` with `writeStory` and `readStory` functions
- Created `packages/plugin-scripts/src/storage.test.ts` with 14 unit tests (TDD approach)
- `writeStory(projectRoot, story)`: validates against StorySchema, creates directory if needed, writes pretty-printed JSON with trailing newline
- `readStory(projectRoot, storyId)`: reads file, parses JSON, validates against StorySchema, returns typed Story object
- Uses `@saga-ai/types` for StorySchema, Story type, and createStoryPaths path utility
- Uses synchronous fs operations (readFileSync/writeFileSync) per task guidance

**Tests cover:**
- Happy path: write and read valid stories
- Optional fields: all optional fields preserved in round-trip
- Directory creation: auto-creates story directory
- Pretty printing: JSON.stringify with 2-space indent + trailing newline
- Overwrite: writing to existing story replaces content
- Error: missing ID field rejected by schema
- Error: extra fields rejected by strict schema
- Error: nonexistent story directory
- Error: empty directory (no story.json)
- Error: malformed JSON
- Error: JSON not matching schema
- Round-trip: write then read produces identical object

**Decisions:**
- Used a single `storage.ts` module to host story functions; epic and task utilities (t3, t4) will be added to same file
- Leveraged existing `@saga-ai/types` StorySchema and createStoryPaths rather than defining local types (schemas already exist from prior story)

**Test baseline:**
- plugin-scripts: 214/245 pass (31 pre-existing failures unchanged, 14 new tests all pass)

**Next steps:**
- t3: Implement epic.json read/write utilities

## Session 3: 2026-02-06

### Task: t3 - Implement epic.json read/write utilities

**What was done:**
- Added `writeEpic` and `readEpic` functions to `packages/plugin-scripts/src/storage.ts`
- Added 16 unit tests for epic storage in `packages/plugin-scripts/src/storage.test.ts` (TDD approach)
- `writeEpic(projectRoot, epic)`: validates against EpicSchema, writes to `.saga/epics/<epic.id>.json` with pretty-printed JSON + trailing newline
- `readEpic(projectRoot, epicId)`: reads `.saga/epics/<epicId>.json`, parses JSON, validates against EpicSchema, returns typed Epic object
- Uses `@saga-ai/types` for EpicSchema, Epic type, and createEpicPaths path utility
- Epics are single files (not directories), consistent with the new storage format

**Tests cover:**
- writeEpic: valid content, pretty printing, empty children, multiple children with blockedBy, overwrite, missing ID, missing children field, extra fields (strict), invalid children structure
- readEpic: happy path, empty children, missing file, malformed JSON, schema mismatch, invalid children, round-trip

**Decisions:**
- Added epic functions to same `storage.ts` module alongside story functions (as planned in t2)
- No directory creation needed for epics since they are single files in the existing `.saga/epics/` directory

**Test baseline:**
- plugin-scripts: 230/261 pass (31 pre-existing failures unchanged, 16 new epic tests all pass)

**Next steps:**
- t4: Implement task JSON read/write utilities

## Session 4: 2026-02-06

### Task: t4 - Implement task JSON read/write utilities

**What was done:**
- Added `writeTask`, `readTask`, and `listTasks` functions to `packages/plugin-scripts/src/storage.ts`
- Added 17 unit tests for task storage in `packages/plugin-scripts/src/storage.test.ts` (TDD approach)
- `writeTask(projectRoot, storyId, task)`: validates against TaskSchema, creates story directory if needed, writes to `.saga/stories/<storyId>/<task.id>.json`
- `readTask(projectRoot, storyId, taskId)`: reads `.saga/stories/<storyId>/<taskId>.json`, parses JSON, validates against TaskSchema, returns typed Task object
- `listTasks(projectRoot, storyId)`: reads story directory, filters to only `.json` files excluding `story.json`, parses each into Task objects
- Uses `@saga-ai/types` for TaskSchema, Task type, and createStoryPaths path utility
- Task status IS stored (unlike story/epic status which is derived)

**Tests cover:**
- writeTask: valid content, directory creation, pretty printing, optional fields, status values (pending/in_progress/completed), overwrite, missing id, invalid status, missing blockedBy, multiple tasks in same directory
- readTask: happy path, optional fields, missing story directory, missing task file, malformed JSON, schema mismatch, round-trip
- listTasks: multiple tasks, excludes story.json, excludes journal.md, excludes non-JSON files, empty story folder, story with only story.json and journal.md, missing story directory

**Decisions:**
- Added task functions to same `storage.ts` module alongside story and epic functions (consistent pattern)
- Used `createStoryPaths` for directory path since task path utilities in directory.ts are not yet available (t7 scope)
- `listTasks` filters by `.json` extension and excludes `story.json` specifically, which naturally excludes journal.md and other non-JSON files

**Test baseline:**
- plugin-scripts: 255/286 pass (31 pre-existing failures unchanged, 17 new task tests all pass)

**Next steps:**
- t5: Implement derived status computation

## Session 5: 2026-02-06

### Task: t5 - Implement derived status computation

**What was done:**
- Added `deriveStoryStatus` and `deriveEpicStatus` functions to `packages/plugin-scripts/src/storage.ts`
- Added 18 unit tests for derived status computation in `packages/plugin-scripts/src/storage.test.ts` (TDD approach)
- `deriveStoryStatus(tasks: Pick<Task, 'status'>[])`: derives story status from task statuses
  - Any task `in_progress` -> `"in_progress"`
  - All tasks `completed` -> `"completed"`
  - Otherwise (including empty array) -> `"pending"`
- `deriveEpicStatus(storyStatuses: TaskStatus[])`: derives epic status from story statuses
  - Same derivation rules as story status but applied to story status strings
- Both are pure functions with no I/O -- they operate on arrays of status values
- Used `TaskStatus` type from `@saga-ai/types` for return types (same enum values: pending/in_progress/completed)

**Tests cover:**
- deriveStoryStatus: empty array, all pending, any in_progress, mixed with in_progress, all completed, completed+pending (no in_progress), single pending, single in_progress, single completed
- deriveEpicStatus: empty array, all pending, any in_progress, mixed with in_progress, all completed, completed+pending (no in_progress), single pending, single in_progress, single completed

**Decisions:**
- Used `Pick<Task, 'status'>` as the parameter type for `deriveStoryStatus` to accept minimal objects (only need `status` field), making it flexible for callers
- Used `TaskStatus` as both the input and return type since story/epic statuses share the same enum values (pending/in_progress/completed)
- Kept functions in `storage.ts` alongside the read/write utilities for cohesion

**Test baseline:**
- plugin-scripts: 273/304 pass (31 pre-existing failures unchanged, 18 new derive tests all pass)

**Next steps:**
- t6: Implement ID validation and uniqueness enforcement
