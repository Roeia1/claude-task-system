---
id: skills-migration
title: Skills Migration
status: ready
epic: tasks-tools-integration
tasks:
  - id: t1
    title: Update directory helpers in saga-types
    status: pending
  - id: t2
    title: Update find script for new storage layout
    status: pending
  - id: t3
    title: Update worktree script for story-based naming
    status: pending
  - id: t4
    title: Update scope-validator for story-based paths
    status: pending
  - id: t5
    title: Update session-init hook for new context detection
    status: pending
  - id: t6
    title: Migrate /create-epic skill to produce JSON epic files
    status: pending
  - id: t7
    title: Migrate /generate-stories skill for new format
    status: pending
  - id: t8
    title: Migrate generate-story agent for JSON output
    status: pending
  - id: t9
    title: Migrate /execute-story skill to use worker.js
    status: pending
  - id: t10
    title: Migrate /resolve-blocker skill for flat story paths
    status: pending
  - id: t11
    title: Migrate /list-sessions skill for new session naming
    status: pending
  - id: t12
    title: Build and verify compiled scripts
    status: pending
---

## Context

SAGA is transitioning from a markdown-based epic/story system to a structured JSON format backed by Claude Code's native Tasks tools. The new architecture uses flat `.saga/stories/` folders with `story.json` metadata and individual task JSON files, and `.saga/epics/` with single `<id>.json` files instead of directories with `epic.md`. Worktrees move from `.saga/worktrees/<epic>/<story>/` to `.saga/worktrees/<story-id>/`, and branches change from `story-<story>-epic-<epic>` to `story/<story-id>`.

This story updates all existing plugin skills (`/create-epic`, `/generate-stories`, `/execute-story`, `/resolve-blocker`, `/list-sessions`), the `generate-story` agent, and all supporting scripts (`find.js`, `worktree.js`, `scope-validator.js`, `session-init.sh`) to work with this new storage layout and JSON format. The types, storage utilities, hydration layer, worker script, and dashboard are handled by other stories -- this story focuses exclusively on the skill definitions (SKILL.md files), agent definition (generate-story.md), and the TypeScript sources in `packages/plugin-scripts/` that compile to `plugin/scripts/`.

## Scope Boundaries

**In scope:**
- Updating `packages/saga-types/src/directory.ts` path helpers to support the new flat storage layout (new `createStoryPaths` taking only `storyId`, new `createEpicFilePath`, updated `createWorktreePaths` taking only `storyId`)
- Updating `packages/plugin-scripts/src/find/` to scan `.saga/stories/` and `.saga/epics/*.json` instead of `.saga/epics/<slug>/stories/` and `.saga/epics/<slug>/epic.md`
- Updating `packages/plugin-scripts/src/worktree.ts` to use `story/<storyId>` branch naming and `.saga/worktrees/<storyId>/` paths
- Updating `packages/plugin-scripts/src/scope-validator.ts` to use `SAGA_STORY_ID` and `.saga/stories/<storyId>/` paths
- Updating `plugin/hooks/session-init.sh` to extract `SAGA_STORY_ID` from worktree path and set the new environment variables
- Rewriting `plugin/skills/create-epic/SKILL.md` to produce `<id>.json` files instead of `epic.md` in a directory
- Rewriting `plugin/skills/generate-stories/SKILL.md` to create `story.json` + task files in `.saga/stories/<storyId>/`
- Rewriting `plugin/agents/generate-story.md` to produce JSON story/task files instead of `story.md`
- Rewriting `plugin/skills/execute-story/SKILL.md` to invoke `worker.js` instead of `implement.js`
- Rewriting `plugin/skills/resolve-blocker/SKILL.md` for flat `.saga/stories/<storyId>/` paths
- Rewriting `plugin/skills/list-sessions/SKILL.md` for `saga-story-<storyId>-<timestamp>` session naming
- Building compiled scripts via `pnpm build` in `packages/plugin-scripts/`

**Out of scope:**
- Defining new SAGA types/Zod schemas (covered by "SAGA Types Migration to JSON Format" story)
- Implementing read/write storage utilities for story.json and task files (covered by "Story and Epic JSON Storage" story)
- Implementing the hydration service or sync hooks (covered by "Hydration and Sync Layer" story)
- Implementing `worker.js` (covered by "Worker Script and Execution Pipeline" story)
- Dashboard changes (covered by "Dashboard Adaptation" story)
- Backward compatibility with old markdown format
- Epic orchestration or parallel worker execution

## Interface

### Inputs

- **New SAGA types** from saga-types package: `Story`, `Epic`, `Task` interfaces and Zod schemas (from "SAGA Types Migration" story)
- **Storage utilities**: `readStory()`, `writeStory()`, `readEpic()`, `writeEpic()`, `readTasks()`, `writeTask()` (from "Story and Epic JSON Storage" story)
- **worker.js** script: the worker that `/execute-story` will invoke in tmux (from "Worker Script and Execution Pipeline" story)
- **Existing skill/agent files** in `plugin/skills/` and `plugin/agents/`
- **Existing script sources** in `packages/plugin-scripts/src/`

### Outputs

- **Updated SKILL.md files** for all five skills plus the generate-story agent
- **Updated TypeScript sources** in `packages/plugin-scripts/src/` (find, worktree, scope-validator)
- **Updated session-init.sh** hook
- **Updated directory helpers** in `packages/saga-types/src/directory.ts`
- **Compiled scripts** in `plugin/scripts/` (via `pnpm build`)
- All other stories depend on these updated skills and scripts to function correctly

## Acceptance Criteria

- [ ] `packages/saga-types/src/directory.ts` exports new path helpers for flat story layout (`createStoryFolder(root, storyId)` returning `.saga/stories/<storyId>/`) and epic file path (`createEpicFilePath(root, epicId)` returning `.saga/epics/<epicId>.json`)
- [ ] Old directory helpers that used `epicSlug + storySlug` nesting are removed or deprecated
- [ ] `find.js` scans `.saga/stories/*/story.json` for stories and `.saga/epics/*.json` for epics
- [ ] `worktree.js` creates branches as `story/<storyId>` and worktrees at `.saga/worktrees/<storyId>/`
- [ ] `scope-validator.js` uses `SAGA_STORY_ID` env var and validates against `.saga/stories/<storyId>/`
- [ ] `session-init.sh` extracts `SAGA_STORY_ID` from worktree path and exports it
- [ ] `/create-epic` skill writes `<id>.json` to `.saga/epics/` (single file, no directory)
- [ ] `/generate-stories` skill creates `story.json` + task files in `.saga/stories/<storyId>/` for each story
- [ ] `generate-story` agent creates JSON story + task files instead of story.md
- [ ] `/execute-story` skill invokes `worker.js` (not `implement.js`) and uses new session naming
- [ ] `/resolve-blocker` skill reads from `.saga/stories/<storyId>/journal.md` in the worktree
- [ ] `/list-sessions` skill parses `saga-story-<storyId>-<timestamp>` session names
- [ ] All scripts build successfully via `pnpm build` in `packages/plugin-scripts/`
- [ ] Existing tests are updated to reflect new paths and behavior

## Tasks

### t1: Update directory helpers in saga-types

**Guidance:**
- Add new functions alongside existing ones, then remove old ones:
  - `createStoryFolder(projectRoot, storyId)` returning `{ storyId, storyDir: ".saga/stories/<storyId>/", storyJson, journalMd }`
  - `createEpicFilePath(projectRoot, epicId)` returning `{ epicId, epicFile: ".saga/epics/<epicId>.json" }`
  - Update `createWorktreePaths(projectRoot, storyId)` to use single storyId (not epicSlug + storySlug)
  - Update `createSagaPaths` to include `stories: "${saga}/stories"` alongside epics
- Remove or deprecate `createStoryPaths`, `createEpicPaths` (which use epic/story nesting), and `createArchivePaths`
- Update the directory tree comment at the top of the file to reflect the new structure
- Update corresponding tests in `directory.test.ts`

**References:**
- `packages/saga-types/src/directory.ts` -- current helpers
- `packages/saga-types/src/directory.test.ts` -- current tests
- Epic section "Storage" for new directory layout

**Avoid:**
- Changing the `SagaPaths` interface signature for `root`, `saga`, `epics`, `worktrees` (just add `stories`)
- Breaking the `normalizeRoot` utility -- it is used across packages

**Done when:**
- New path helpers produce correct paths for flat story layout
- Old nested path helpers are removed
- All directory tests pass with updated expectations
- TypeScript compiles cleanly

### t2: Update find script for new storage layout

**Guidance:**
- Update `packages/plugin-scripts/src/find/saga-scanner.ts` to scan:
  - Stories: glob `.saga/stories/*/story.json`, parse each to get `id`, `title`, `status` (derived from task files)
  - Epics: glob `.saga/epics/*.json`, parse each to get `id`, `title`, `description`
- Update `packages/plugin-scripts/src/find/finder.ts` to use the new scanner output format
- Update `packages/plugin-scripts/src/find/index.ts` CLI interface if needed (flags remain `--type epic|story`)
- The find script output JSON should include `data.storyId` (not `data.slug` / `data.epicSlug`) for stories, and `data.epicId` for epics
- For story matches, include `data.worktreePath` computed as `.saga/worktrees/<storyId>/`

**References:**
- `packages/plugin-scripts/src/find/saga-scanner.ts` -- current scanner
- `packages/plugin-scripts/src/find/finder.ts` -- current finder logic
- `packages/plugin-scripts/src/find.test.ts` -- integration tests
- `packages/plugin-scripts/src/find/finder.test.ts` -- unit tests

**Avoid:**
- Changing the overall find.js CLI contract (it should still output JSON to stdout)
- Removing fuzzy search capability (Fuse.js) -- update the search keys to match new fields

**Done when:**
- `node find.js "story-name" --type story` finds stories in `.saga/stories/`
- `node find.js "epic-name" --type epic` finds epics in `.saga/epics/`
- Output JSON uses `storyId` / `epicId` fields
- All find tests pass

### t3: Update worktree script for story-based naming

**Guidance:**
- Update `packages/plugin-scripts/src/worktree.ts` to accept a single `storyId` argument (not epicSlug + storySlug)
- Branch naming: `story/<storyId>` (not `story-<slug>-epic-<epic>`)
- Worktree path: `.saga/worktrees/<storyId>/` (not `.saga/worktrees/<epic>/<story>/`)
- Output JSON should include `{ worktreePath, branch }` with the new values
- Update CLI arg parsing: `node worktree.js <storyId>` (single argument)

**References:**
- `packages/plugin-scripts/src/worktree.ts` -- current implementation
- `packages/plugin-scripts/src/worktree.test.ts` -- current tests
- Epic section "Worktree and Branch Naming" for new convention

**Avoid:**
- Breaking idempotency -- if worktree already exists, return existing info without error
- Removing the git worktree add / git branch create logic -- just update the paths and names

**Done when:**
- `node worktree.js my-story-id` creates branch `story/my-story-id` and worktree at `.saga/worktrees/my-story-id/`
- Output JSON has correct `worktreePath` and `branch`
- Tests pass with new naming convention

### t4: Update scope-validator for story-based paths

**Guidance:**
- Update `packages/plugin-scripts/src/scope-validator.ts` to use `SAGA_STORY_ID` instead of `SAGA_EPIC_SLUG` + `SAGA_STORY_SLUG`
- Allowed paths should reference `.saga/stories/<storyId>/` instead of `.saga/epics/<epicSlug>/stories/<storySlug>/`
- Keep project-level file access (implementation files outside `.saga/`) unchanged

**References:**
- `packages/plugin-scripts/src/scope-validator.ts` -- current implementation
- `packages/plugin-scripts/src/scope-validator.test.ts` -- current tests
- Epic section "Scope Validation"

**Avoid:**
- Making the validator overly restrictive -- workers need access to project files for implementation

**Done when:**
- Scope validator reads `SAGA_STORY_ID` and validates against `.saga/stories/<storyId>/`
- Tests pass

### t5: Update session-init hook for new context detection

**Guidance:**
- Update `plugin/hooks/session-init.sh` to:
  - Extract `SAGA_STORY_ID` from worktree path: if path matches `.saga/worktrees/<id>/`, set `SAGA_STORY_ID` to `<id>`
  - Export `SAGA_STORY_ID` to `CLAUDE_ENV_FILE` when in story-worktree context
  - Remove references to `SAGA_EPIC_SLUG` and `SAGA_STORY_SLUG` (deprecated)
- The worktree detection logic changes: path pattern is `.saga/worktrees/<storyId>/` (one level, not two)

**References:**
- `plugin/hooks/session-init.sh` -- current hook
- Epic section "Context Detection"
- Epic section "Environment Variables"

**Avoid:**
- Removing `SAGA_TASK_CONTEXT`, `SAGA_PROJECT_DIR`, `SAGA_PLUGIN_ROOT`, `SAGA_SESSION_DIR` -- these are unchanged
- Breaking the `.git` file detection logic for worktrees

**Done when:**
- In a story worktree at `.saga/worktrees/my-story/`, `SAGA_STORY_ID` is set to `my-story`
- `SAGA_TASK_CONTEXT` is still correctly set to `story-worktree`
- Deprecated variables (`SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`, `SAGA_STORY_DIR`) are not exported

### t6: Migrate /create-epic skill to produce JSON epic files

**Guidance:**
- Update `plugin/skills/create-epic/SKILL.md` task definitions:
  - "Create directory structure" task is removed -- epics are single files, no directory needed
  - "Write epic file" task writes JSON to `.saga/epics/<id>.json` instead of markdown to `.saga/epics/<id>/epic.md`
  - The JSON file follows the Epic schema: `{ id, title, description, children: [] }` (empty children initially)
  - "Report completion" references the new file path
- The dialog-based workflow (vision + architecture sections) is simplified: the epic JSON only stores `id`, `title`, `description` -- the rich dialog content becomes the `description` field
- Update the template reference or remove it (epic template may no longer be needed for JSON format)
- Ensure the "Check existing epic" task checks for `.saga/epics/<id>.json` file existence

**References:**
- `plugin/skills/create-epic/SKILL.md` -- current skill
- Epic section "Epic Schema" for the JSON structure
- Epic section "Epics as Single Files" for rationale

**Avoid:**
- Creating directories for epics -- they are single files now
- Keeping references to `epic.md` or the old directory structure
- Removing the interactive dialog entirely -- the description field should still capture the rich context from user dialog

**Done when:**
- `/create-epic` produces `.saga/epics/<id>.json` with valid Epic schema
- No epic directories are created (no `mkdir`)
- Existing epic check looks for `.json` file

### t7: Migrate /generate-stories skill for new format

**Guidance:**
- Update `plugin/skills/generate-stories/SKILL.md`:
  - "Resolve epic" task: find script now returns `epicId` instead of `epicSlug`
  - "Read epic document" task: reads `.saga/epics/<epicId>.json` instead of `.saga/epics/<slug>/epic.md`
  - "Spawn story generation agents" task: passes `epicId` and updated context to agents
  - The agent now produces `story.json` + task files in `.saga/stories/<storyId>/` (not story.md in worktree)
  - "Report completion" reflects new paths
- Update the find.js invocation from `--type epic` to match new find script output
- Story IDs must be globally unique across the project (the skill should check `.saga/stories/` for existing IDs)

**References:**
- `plugin/skills/generate-stories/SKILL.md` -- current skill
- Epic section "Storage" for new story folder structure
- Epic section "Globally Unique Story IDs"

**Avoid:**
- Changing the parallel agent spawning pattern -- it works well, just update the data format
- Keeping references to `epic.md`, nested `stories/` directories under epics, or `story.md` files

**Done when:**
- `/generate-stories` reads epic from `.saga/epics/<id>.json`
- Stories are created in `.saga/stories/<storyId>/` with `story.json` + task JSON files
- Story IDs are checked for global uniqueness
- Agent invocations pass correct parameters for new format

### t8: Migrate generate-story agent for JSON output

**Guidance:**
- Update `plugin/agents/generate-story.md`:
  - Instead of writing `story.md` with YAML frontmatter, the agent writes:
    - `story.json` to `.saga/stories/<storyId>/story.json` with Story schema fields
    - Individual task files `<taskId>.json` to `.saga/stories/<storyId>/` with Task schema fields
  - The worktree.js invocation changes: `node worktree.js "<storyId>"` (single argument)
  - Write story file task creates `.saga/stories/<storyId>/` directory (not nested under epics in worktree)
  - Git commit and PR creation use new branch naming (`story/<storyId>`)
  - The agent output JSON uses `story_id` instead of `story_slug`
- The epic reference in story.json uses the `epic` field
- Task files use the Task schema: `{ id, subject, description, activeForm, status: "pending", blockedBy: [], guidance, doneWhen }`

**References:**
- `plugin/agents/generate-story.md` -- current agent
- Epic section "Story Schema" and "Task Schema"
- Epic section "Descriptive Filenames and IDs"

**Avoid:**
- Generating story.md with YAML frontmatter -- the new format is JSON
- Using the old nested path structure for stories
- Keeping references to `story-<slug>-epic-<epic>` branch naming

**Done when:**
- Agent creates `story.json` + task JSON files in `.saga/stories/<storyId>/`
- Worktree creation uses single storyId argument
- Branch naming follows `story/<storyId>` convention
- PR is created with updated title/body format
- Output JSON includes `story_id`, `branch`, `worktree_path`, `pr_url`

### t9: Migrate /execute-story skill to use worker.js

**Guidance:**
- Update `plugin/skills/execute-story/SKILL.md`:
  - "Resolve story" task: find script returns `storyId` (not `epicSlug` + `slug`)
  - "Update worktree branch" task: uses `.saga/worktrees/<storyId>/` path
  - "Run implementation orchestrator" task: invokes `node $SAGA_PLUGIN_ROOT/scripts/worker.js "<storyId>"` instead of `implement.js`
  - Worker creates tmux session named `saga-story-<storyId>-<timestamp>`
  - Status output format references new paths and session naming
- The find.js `--type story` call should work with new format (stories in `.saga/stories/`)
- Remove `--max-cycles`, `--max-time`, `--model` flags (worker.js manages its own execution loop)

**References:**
- `plugin/skills/execute-story/SKILL.md` -- current skill
- Epic section "Worker Architecture" for worker invocation details
- Epic section "Tmux Session Management" for session naming

**Avoid:**
- Referencing `implement.js` -- it is replaced by `worker.js`
- Using `SAGA_EPIC_SLUG` or `SAGA_STORY_SLUG` -- use `SAGA_STORY_ID`
- Keeping the old `--status ready` filter on find (stories have derived status now)

**Done when:**
- `/execute-story` invokes `worker.js` with storyId
- Session naming follows `saga-story-<storyId>-<timestamp>` pattern
- Status output shows correct paths and monitoring commands
- Find invocation works with new story format

### t10: Migrate /resolve-blocker skill for flat story paths

**Guidance:**
- Update `plugin/skills/resolve-blocker/SKILL.md`:
  - Path computation uses `SAGA_STORY_ID` and `.saga/stories/<storyId>/`
  - Worktree path: `.saga/worktrees/<storyId>/`
  - Story files in worktree: `.saga/stories/<storyId>/story.json` and `.saga/stories/<storyId>/journal.md`
  - The find.js invocation uses new format (returns `storyId`)
  - Story context is read from `story.json` (JSON) instead of `story.md` (markdown)
  - Resume command suggests `/execute-story <storyId>` instead of `/implement`
- The journal.md format and blocker/resolution pattern remain unchanged (journal is still markdown)

**References:**
- `plugin/skills/resolve-blocker/SKILL.md` -- current skill
- Epic section "Storage" for new paths

**Avoid:**
- Changing the blocker/resolution markdown format in journal.md -- it still works
- Using `SAGA_EPIC_SLUG` or `SAGA_STORY_SLUG`
- Referencing `/implement` command (it is now `/execute-story`)

**Done when:**
- Paths reference `.saga/stories/<storyId>/` and `.saga/worktrees/<storyId>/`
- Story context is read from JSON
- Find invocation returns `storyId`
- Resume instructions point to `/execute-story`

### t11: Migrate /list-sessions skill for new session naming

**Guidance:**
- Update `plugin/skills/list-sessions/SKILL.md`:
  - Session name format is now `saga-story-<storyId>-<timestamp>` (not `saga-<epic>-<story>-<timestamp>`)
  - Parsing: remove `saga-story-` prefix, last 13 digits are timestamp, remainder is storyId
  - Table columns: Story (not Epic + Story), Started, Session Name
  - Update the commands shown to user (if they reference old skill names or paths)
- The `npx @saga-ai/dashboard sessions list` command may need updating depending on dashboard changes, but this story updates the skill's parsing/display logic

**References:**
- `plugin/skills/list-sessions/SKILL.md` -- current skill
- Epic section "Tmux Session Management" for session naming

**Avoid:**
- Assuming epic information is in the session name -- it is not
- Breaking the elapsed time calculation from timestamp

**Done when:**
- Session name parsing extracts storyId from `saga-story-<storyId>-<timestamp>`
- Display table shows Story column (not Epic + Story)
- Commands in output are updated

### t12: Build and verify compiled scripts

**Guidance:**
- Run `pnpm build` in `packages/plugin-scripts/` to compile updated TypeScript to `plugin/scripts/`
- Run `pnpm test` in `packages/plugin-scripts/` to verify all tests pass
- Run `pnpm typecheck` in `packages/plugin-scripts/` for type safety
- Run `pnpm test` in `packages/saga-types/` for type tests
- Verify the compiled `.js` files in `plugin/scripts/` reflect the changes

**References:**
- `packages/plugin-scripts/esbuild.config.mjs` -- build configuration
- `packages/plugin-scripts/package.json` -- build scripts

**Avoid:**
- Manually editing files in `plugin/scripts/` -- they are compiled output
- Skipping tests -- they validate the migration is correct

**Done when:**
- `pnpm build` succeeds without errors
- `pnpm test` passes in both `packages/plugin-scripts/` and `packages/saga-types/`
- `pnpm typecheck` passes
- Compiled scripts in `plugin/scripts/` are up to date
