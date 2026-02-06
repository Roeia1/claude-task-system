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
