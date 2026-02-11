# Skills Migration Journal

## Session: 2026-02-11T19:00Z

### Task: t1 - Update worktree script for story-based naming

**What was done:**
- Updated `packages/plugin-scripts/src/worktree.ts`:
  - Changed `createWorktree()` from `(projectPath, epicSlug, storySlug)` to `(projectPath, storyId)`
  - Branch naming changed from `story-${storySlug}-epic-${epicSlug}` to `story/${storyId}`
  - `createWorktreePaths` call updated to new 2-arg signature `(projectPath, storyId)`
  - CLI now expects single `<storyId>` argument instead of `<epic-slug> <story-slug>`
  - Updated `parseArgs` to extract single positional arg as `storyId`
  - Updated help text and doc comment
- Updated `packages/plugin-scripts/src/worktree.test.ts`:
  - All tests migrated to single storyId argument format
  - Branch assertions use `story/<storyId>` format
  - Path assertions use `.saga/worktrees/<storyId>` format
  - Added test for missing storyId argument
  - Removed tests for multiple worktrees under same epic (no longer applicable)
  - 15 tests, all passing

**Decisions:**
- Kept idempotency error behavior (fail if branch or worktree already exists) — same as before, just with new naming
- Removed the "multiple worktrees for same epic" test since the concept of epic-scoped worktrees is gone; replaced with a general "multiple worktrees" test

**Test results:**
- worktree.test.ts: 15/15 passing
- Full suite: 553 passing, 11 pre-existing failures (find.test.ts: 7, orchestrator.test.ts: 4) — no regressions

**Next steps:**
- t2: Migrate /create-epic skill to produce JSON epic files

## Session: 2026-02-11T19:10Z

### Task: t2 - Migrate /create-epic skill to produce JSON epic files

**What was done:**
- Rewrote `plugin/skills/create-epic/SKILL.md` for JSON epic format:
  - Removed "Create directory structure" task (epics are single files, no directories)
  - Removed "Read epic template" task (template not needed for JSON format)
  - Added "Generate epic title" task (title is now a separate JSON field)
  - "Check existing epic" now checks for `.saga/epics/<id>.json` file instead of directory
  - "Write epic JSON" produces `{ id, title, description, children: [] }` at `.saga/epics/<id>.json`
  - `description` field captures all vision/architecture dialog content as rich markdown
  - Changed allowed-tools from `Bash(mkdir:*)` to `Bash(ls:*)` (no directories to create)
  - Updated all references from "slug" to "ID" terminology
  - Added example JSON output section
  - Updated completion message and notes for new file structure

**Decisions:**
- Left the `epic-template.md` file in place — it's no longer referenced by the skill but removing template files is outside this task's scope
- Kept the interactive dialog workflow (vision + architecture) intact — the content now feeds into the `description` field as markdown
- Added a "Generate epic title" task since `title` is a separate field in the Epic schema (previously it was just the H1 in epic.md)

**Test results:**
- No code tests needed (SKILL.md is a markdown skill definition)
- Full suite: 553 passing, 11 pre-existing failures — no regressions

**Next steps:**
- t3: Migrate /generate-stories skill for new format

## Session: 2026-02-11T19:15Z

### Task: t3 - Migrate /generate-stories skill for new format

**What was done:**
- Rewrote `plugin/skills/generate-stories/SKILL.md` for JSON story format:
  - Changed `argument-hint` from `"[epic-slug]"` to `"[epic-id]"`
  - Added `Bash(ls:*)` to allowed-tools for listing existing stories
  - "Read epic document" now reads `.saga/epics/<epicId>.json` (JSON) instead of `.saga/epics/<slug>/epic.md` (markdown)
  - Added new "Check existing stories" task to list `.saga/stories/` for global ID uniqueness
  - "Generate story breakdown" now generates unique `id` fields alongside `title` and `description`
  - "Present breakdown" displays `**ID**` field for each story
  - "Spawn story generation agents" passes `epic_id`, `story_id`, `story_title`, `story_description` to agents (was `epic_slug`, `story_title`, `story_description`)
  - "Collect results" expects `story_id`, `story_title`, `branch`, `worktree_path`, `pr_url` fields
  - "Report completion" uses `story/<story_id>` branch format, references `.saga/stories/`, `/execute-story <story-id>`
  - Updated notes section with flat layout and JSON format details

**Decisions:**
- Kept `data.slug` reference in "Resolve epic" task since the find.js `EpicInfo` interface still uses `{ slug: string }` — this is the actual field name in the finder output, even though we now treat it as an epic ID
- Added "Check existing stories" as a separate task (not merged into breakdown) to keep the task flow clear and explicit
- Story template file (`story-template.md`) is no longer referenced — the generate-story agent will produce JSON directly

**Test results:**
- No code tests needed (SKILL.md is a markdown skill definition)
- Full suite: 553 passing, 11 pre-existing failures — no regressions

**Next steps:**
- t4: Migrate generate-story agent for JSON output
