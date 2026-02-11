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

## Session: 2026-02-11T19:20Z

### Task: t4 - Migrate generate-story agent for JSON output

**What was done:**
- Rewrote `plugin/agents/generate-story.md` for JSON story/task output:
  - Updated capabilities: "Create self-contained story.json and task JSON files" (was story.md)
  - Input now expects `epic_id` + `story_id` (was `epic_slug`, agent generated its own slug)
  - Removed "Generate story slug" task (story ID is pre-generated by parent skill)
  - Removed "Read story template" task (no template needed for JSON format)
  - "Create git infrastructure" uses single arg: `node worktree.js "<story_id>"` (was two args)
  - "Read epic context" reads `.saga/epics/<epic_id>.json` (was `epic.md`)
  - "Generate story content" designs JSON structures matching Story and Task schemas:
    - story.json: `{ id, title, description, epic, branch, pr, worktree }`
    - task files: `{ id, subject, description, activeForm, status, blockedBy }`
  - "Write story files" creates `.saga/stories/<story_id>/` with `story.json` + `<taskId>.json` files (was nested `epics/<slug>/stories/<slug>/story.md`)
  - "Commit and create PR" uses `story/<story_id>` branch, references `/execute-story <story_id>`
  - Output JSON uses `story_id` field (was `story_slug`)
  - All paths use flat `.saga/worktrees/<story_id>/` and `.saga/stories/<story_id>/`

**Decisions:**
- Story ID comes from parent skill (globally unique check happens there), so no slug generation task needed
- PR creation step includes amending the commit to update `story.json` with the PR URL
- Task schema fields include optional `guidance` and `doneWhen` — these are populated via the `description` field which contains all guidance detail

**Test results:**
- No code tests needed (agent definition is a markdown file)
- Full suite: 553 passing, 11 pre-existing failures — no regressions

**Next steps:**
- t5: Update /execute-story skill flags and find invocation

## Session: 2026-02-11T19:25Z

### Task: t5 - Update /execute-story skill flags and find invocation

**What was done:**
- Updated `plugin/skills/execute-story/SKILL.md`:
  - Removed `--status ready` from find invocation (line 12): now `--type story` only
  - Changed `data.slug` to `data.storyId` in "Resolve story" task
  - Removed `epicSlug` from disambiguation options (was `Epic: <epicSlug>, Status: <status>`, now `Status: <status>`)
  - Changed disambiguation label from `<slug>` to `<storyId>`
  - Removed stale worker flags from "Run worker" task: `--max-cycles 10 --max-time 60 --model opus --output-file ...` — worker manages its own defaults
  - Simplified tmux command to: `node $SAGA_PLUGIN_ROOT/scripts/worker.js <storyId> 2>&1 | tee /tmp/saga-sessions/<sessionName>.out`
  - Updated notes section to clarify worker manages its own execution loop

**Decisions:**
- Kept the `--output-file` flag removal even though worker.ts does accept it — the tee pipe captures output to the same path, and the worker's `--output-file` writes a JSON summary (different format). The tee approach is what the skill needs for real-time monitoring.
- Left the status output format unchanged (exit codes 0/1/2 still accurate)

**Test results:**
- No code tests needed (SKILL.md is a markdown skill definition)
- Full suite: 553 passing, 11 pre-existing failures — no regressions

**Next steps:**
- t6: Migrate /resolve-blocker skill for flat story paths
