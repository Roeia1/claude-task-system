---
id: skills-migration
title: Skills Migration
status: ready
epic: tasks-tools-integration
tasks:
  - id: t1
    title: Update worktree script for story-based naming
    status: pending
  - id: t2
    title: Migrate /create-epic skill to produce JSON epic files
    status: pending
  - id: t3
    title: Migrate /generate-stories skill for new format
    status: pending
  - id: t4
    title: Migrate generate-story agent for JSON output
    status: pending
  - id: t5
    title: Update /execute-story skill flags and find invocation
    status: pending
  - id: t6
    title: Migrate /resolve-blocker skill for flat story paths
    status: pending
  - id: t7
    title: Migrate /list-sessions skill for new session naming
    status: pending
  - id: t8
    title: Build and verify compiled scripts
    status: pending
---

## Context

SAGA is transitioning from a markdown-based epic/story system to a structured JSON format backed by Claude Code's native Tasks tools. The new architecture uses flat `.saga/stories/` folders with `story.json` metadata and individual task JSON files, and `.saga/epics/` with single `<id>.json` files instead of directories with `epic.md`. Worktrees move from `.saga/worktrees/<epic>/<story>/` to `.saga/worktrees/<storyId>/`, and branches change from `story-<story>-epic-<epic>` to `story/<storyId>`.

Previous stories in this epic have already migrated the underlying infrastructure:
- **saga-types-json-migration**: New Zod schemas, `directory.ts` path helpers (`createStoryPaths`, `createEpicPaths`, `createWorktreePaths` — all using flat layout), new types (`Story`, `Epic`, `Task`)
- **story-epic-json-storage**: `storage.ts` with `readStory/writeStory/readEpic/writeEpic/readTask/writeTask` utilities
- **hydration-sync-layer**: `hydrate.ts` and `sync-hook.ts` for Claude Tasks ↔ JSON sync
- **worker-execution-pipeline**: `worker.ts` with full execution pipeline, updated `scope-validator.ts` (uses `SAGA_STORY_ID`), updated `session-init.sh` (extracts `SAGA_STORY_ID` from flat worktree path), updated `find/saga-scanner.ts` (scans `.saga/stories/` and `.saga/epics/*.json`)

This story focuses on the remaining migration work: the **worktree script** (still uses old 2-arg format), all **skill SKILL.md files**, and the **generate-story agent definition**.

## Scope Boundaries

**In scope:**
- Updating `packages/plugin-scripts/src/worktree.ts` to accept single `storyId`, use `story/<storyId>` branches, and `.saga/worktrees/<storyId>/` paths
- Rewriting `plugin/skills/create-epic/SKILL.md` to produce `.saga/epics/<id>.json` files instead of `epic.md` in a directory
- Rewriting `plugin/skills/generate-stories/SKILL.md` to create `story.json` + task files in `.saga/stories/<storyId>/`
- Rewriting `plugin/agents/generate-story.md` to produce JSON story/task files instead of `story.md`
- Updating `plugin/skills/execute-story/SKILL.md` to remove stale flags and fix the find invocation
- Rewriting `plugin/skills/resolve-blocker/SKILL.md` for flat `.saga/stories/<storyId>/` paths
- Rewriting `plugin/skills/list-sessions/SKILL.md` for `saga-story-<storyId>-<timestamp>` session naming
- Building compiled scripts via `pnpm build` in `packages/plugin-scripts/`

**Out of scope:**
- Types/schemas (done by saga-types-json-migration)
- Storage utilities (done by story-epic-json-storage)
- Hydration/sync (done by hydration-sync-layer)
- Worker script (done by worker-execution-pipeline)
- Find script/scanner (done by worker-execution-pipeline)
- Scope validator (done by worker-execution-pipeline)
- Session-init hook (done by worker-execution-pipeline)
- Directory helpers in saga-types (done by saga-types-json-migration)
- Dashboard changes (covered by dashboard-adaptation story)
- Backward compatibility with old markdown format

## Interface

### Inputs

- **New SAGA types** from saga-types package: `Story`, `Epic`, `Task` interfaces and Zod schemas
- **Storage utilities**: `readStory()`, `writeStory()`, `readEpic()`, `writeEpic()`, `readTasks()`, `writeTask()`
- **worker.js** script: the worker that `/execute-story` invokes in tmux
- **Existing skill/agent files** in `plugin/skills/` and `plugin/agents/`
- **Existing worktree.ts** in `packages/plugin-scripts/src/`

### Outputs

- **Updated SKILL.md files** for all five skills plus the generate-story agent
- **Updated worktree.ts** in `packages/plugin-scripts/src/`
- **Compiled worktree.js** in `plugin/scripts/` (via `pnpm build`)

## Acceptance Criteria

- [ ] `worktree.ts` accepts single `storyId` argument, creates branch `story/<storyId>`, worktree at `.saga/worktrees/<storyId>/`
- [ ] `/create-epic` skill writes `<id>.json` to `.saga/epics/` (single file, no directory)
- [ ] `/generate-stories` skill creates `story.json` + task files in `.saga/stories/<storyId>/` for each story
- [ ] `generate-story` agent creates JSON story + task files instead of story.md
- [ ] `/execute-story` skill invokes `worker.js` without stale flags (`--max-cycles`, `--max-time`, `--model`) and removes `--status ready` from find
- [ ] `/resolve-blocker` skill reads from `.saga/stories/<storyId>/` and `.saga/worktrees/<storyId>/`
- [ ] `/list-sessions` skill parses `saga-story-<storyId>-<timestamp>` session names
- [ ] All scripts build successfully via `pnpm build` in `packages/plugin-scripts/`
- [ ] Existing worktree tests are updated to reflect new paths and behavior

## Tasks

### t1: Update worktree script for story-based naming

**Guidance:**
- `packages/plugin-scripts/src/worktree.ts` is still entirely in the old format:
  - `createWorktree()` takes `(projectPath, epicSlug, storySlug)` — but `createWorktreePaths` from saga-types now only takes `(projectRoot, storyId)` (2 args, not 3)
  - Branch naming uses `story-${storySlug}-epic-${epicSlug}` — should be `story/${storyId}`
  - CLI expects two positional args `<epic-slug> <story-slug>` — should be single `<storyId>`
- Update `createWorktree()` to take `(projectPath, storyId)`, call `createWorktreePaths(projectPath, storyId)`, and use branch name `story/${storyId}`
- Update CLI: `node worktree.js <storyId>` (single argument)
- Update `parseArgs` to expect one positional arg
- Update help text and doc comment
- Update or create tests in `packages/plugin-scripts/src/worktree.test.ts`

**References:**
- `packages/plugin-scripts/src/worktree.ts` — current (old) implementation
- `packages/saga-types/src/directory.ts` — `createWorktreePaths(root, storyId)` signature

**Avoid:**
- Breaking idempotency — if worktree already exists, return existing info without error
- Removing the git worktree add / git branch create logic — just update the paths and names

**Done when:**
- `node worktree.js my-story-id` creates branch `story/my-story-id` and worktree at `.saga/worktrees/my-story-id/`
- CLI accepts single storyId argument
- Output JSON has correct `worktreePath` and `branch`
- Tests pass with new naming convention

### t2: Migrate /create-epic skill to produce JSON epic files

**Guidance:**
- Update `plugin/skills/create-epic/SKILL.md`:
  - "Create directory structure" task is removed — epics are single files, no directory needed
  - "Write epic file" task writes JSON to `.saga/epics/<id>.json` instead of markdown to `.saga/epics/<id>/epic.md`
  - The JSON file follows the Epic schema: `{ id, title, description, children: [] }` (empty children initially)
  - "Check existing epic" checks for `.saga/epics/<id>.json` file existence (not a directory)
  - "Report completion" references the new file path
- The dialog-based workflow (vision + architecture sections) is simplified: the epic JSON only stores `id`, `title`, `description` — the rich dialog content becomes the `description` field
- Remove the template reference (epic template is no longer needed for JSON format)

**References:**
- `plugin/skills/create-epic/SKILL.md` — current skill (old format: creates `.saga/epics/<slug>/epic.md`)
- `packages/saga-types/src/epic.ts` — Epic schema/type definition

**Avoid:**
- Creating directories for epics — they are single files now
- Keeping references to `epic.md` or the old directory structure
- Removing the interactive dialog — the description field should capture the rich context

**Done when:**
- `/create-epic` skill definition produces `.saga/epics/<id>.json` with valid Epic schema
- No `mkdir` for epic directories
- Existing epic check looks for `.json` file

### t3: Migrate /generate-stories skill for new format

**Guidance:**
- Update `plugin/skills/generate-stories/SKILL.md`:
  - "Resolve epic" task: find script now returns `data.epicId` instead of `data.slug`
  - "Read epic document" task: reads `.saga/epics/<epicId>.json` instead of `.saga/epics/<slug>/epic.md`
  - "Spawn story generation agents" task: passes `epicId` and updated context to agents
  - The agent now produces `story.json` + task files in `.saga/stories/<storyId>/` (not story.md)
  - "Report completion" reflects new paths
- Update the find.js invocation output parsing to match new format
- Story IDs must be globally unique across the project (check `.saga/stories/` for existing IDs)

**References:**
- `plugin/skills/generate-stories/SKILL.md` — current skill (old format: reads `epic.md`, creates nested story dirs)

**Avoid:**
- Changing the parallel agent spawning pattern — just update the data format
- Keeping references to `epic.md`, nested `stories/` directories under epics, or `story.md` files

**Done when:**
- `/generate-stories` reads epic from `.saga/epics/<id>.json`
- Stories are created in `.saga/stories/<storyId>/` with `story.json` + task JSON files
- Story IDs checked for global uniqueness
- Agent invocations pass correct parameters

### t4: Migrate generate-story agent for JSON output

**Guidance:**
- Update `plugin/agents/generate-story.md`:
  - Instead of writing `story.md` with YAML frontmatter, the agent writes:
    - `story.json` to `.saga/stories/<storyId>/story.json` with Story schema fields
    - Individual task files `<taskId>.json` to `.saga/stories/<storyId>/` with Task schema fields
  - Worktree invocation changes: `node worktree.js "<storyId>"` (single argument, not two)
  - Write story files to `.saga/stories/<storyId>/` directory (not nested under epics)
  - Git commit and PR use new branch naming (`story/<storyId>`)
  - Agent output JSON uses `story_id` instead of `story_slug`
- Epic reference in story.json uses the `epic` field
- Task files use the Task schema: `{ id, subject, description, activeForm, status: "pending", blockedBy: [], guidance, doneWhen }`

**References:**
- `plugin/agents/generate-story.md` — current agent (old format: creates story.md with YAML frontmatter, two-arg worktree, nested paths)
- `packages/saga-types/src/story.ts` — Story schema
- `packages/saga-types/src/task.ts` — Task schema

**Avoid:**
- Generating story.md with YAML frontmatter
- Using old nested path structure
- Keeping `story-<slug>-epic-<epic>` branch naming

**Done when:**
- Agent creates `story.json` + task JSON files in `.saga/stories/<storyId>/`
- Worktree uses single storyId argument
- Branch naming follows `story/<storyId>` convention
- PR is created with updated title/body
- Output JSON includes `story_id`, `branch`, `worktree_path`, `pr_url`

### t5: Update /execute-story skill flags and find invocation

**Guidance:**
- The execute-story SKILL.md is already mostly migrated (uses `storyId`, `saga-story-<storyId>-<timestamp>` sessions, `.saga/worktrees/<storyId>/` paths). Two things still need fixing:
  1. **Remove stale worker flags**: The "Run worker" task invokes `worker.js` with `--max-cycles 10 --max-time 60 --model opus --output-file ...` — the worker manages its own execution loop and doesn't accept these flags. Simplify to: `node $SAGA_PLUGIN_ROOT/scripts/worker.js <storyId>`
  2. **Remove `--status ready` from find**: The find invocation at the top uses `--status ready` — story status is now derived from task files and the find script may not support this filter. Change to: `node $SAGA_PLUGIN_ROOT/scripts/find.js "$0" --type story`
  3. **Fix tmux command**: The worker runs in tmux but the output capture pattern needs simplification since worker handles its own output. Use: `tmux new-session -d -s "<sessionName>" "node $SAGA_PLUGIN_ROOT/scripts/worker.js <storyId> 2>&1 | tee /tmp/saga-sessions/<sessionName>.out"`
- Also update the "Resolve story" task to use `data.storyId` instead of `data.slug`

**References:**
- `plugin/skills/execute-story/SKILL.md` — current skill (partially migrated)
- `packages/plugin-scripts/src/worker.ts` — worker entry point (no --max-cycles/--max-time/--model flags)

**Avoid:**
- Rewriting parts that already work (session naming, worktree paths, status output format)

**Done when:**
- Find invocation has no `--status ready` filter
- Worker invocation has no stale flags
- `data.storyId` used instead of `data.slug`

### t6: Migrate /resolve-blocker skill for flat story paths

**Guidance:**
- Update `plugin/skills/resolve-blocker/SKILL.md`:
  - Step 1 "Check Resolution Result": uses `data.storyId` instead of `data.slug` and `data.epicSlug`
  - Step 2 "Locate Story Files": paths change to:
    - `WORKTREE="$SAGA_PROJECT_DIR/.saga/worktrees/$STORY_ID"`
    - Story files in worktree: `$WORKTREE/.saga/stories/$STORY_ID/story.json` and `$WORKTREE/.saga/stories/$STORY_ID/journal.md`
  - Step 3 "Read Story Context": reads `story.json` (JSON) instead of `story.md` (markdown)
  - Step 4: journal.md format unchanged (still markdown)
  - "No Unresolved Blocker" and "Blocker Already Resolved" messages: change `/implement $STORY_SLUG` to `/execute-story $STORY_ID`
  - Step 9 "Confirm Completion": same `/execute-story` update
- Remove all references to `EPIC_SLUG`, `data.epicSlug`, nested paths

**References:**
- `plugin/skills/resolve-blocker/SKILL.md` — current skill (old format: nested paths, `/implement` command)

**Avoid:**
- Changing the blocker/resolution markdown format in journal.md
- Changing the analysis and proposal process (steps 5-8)

**Done when:**
- All paths reference `.saga/stories/<storyId>/` and `.saga/worktrees/<storyId>/`
- Story context read from `story.json`
- Resume instructions point to `/execute-story`
- No references to `epicSlug` or nested paths

### t7: Migrate /list-sessions skill for new session naming

**Guidance:**
- Update `plugin/skills/list-sessions/SKILL.md`:
  - Session name format is now `saga-story-<storyId>-<timestamp>` (not `saga-<epic>-<story>-<timestamp>`)
  - Parsing: remove `saga-story-` prefix, last 13 digits are timestamp, remainder is storyId
  - Table columns: Story (not Epic + Story), Started, Session Name
  - Update example session names in documentation
  - Update commands shown to user

**References:**
- `plugin/skills/list-sessions/SKILL.md` — current skill (old format: `saga-<epic>-<story>-<timestamp>`)

**Avoid:**
- Assuming epic information is in the session name — it is not
- Breaking the elapsed time calculation from timestamp

**Done when:**
- Session name parsing extracts storyId from `saga-story-<storyId>-<timestamp>`
- Display table shows Story column (not Epic + Story)
- Example session names use new format

### t8: Build and verify compiled scripts

**Guidance:**
- Run `pnpm build` in `packages/plugin-scripts/` to compile updated TypeScript to `plugin/scripts/`
- Run `pnpm test` in `packages/plugin-scripts/` to verify all tests pass
- Run `pnpm typecheck` in `packages/plugin-scripts/` for type safety
- Run `pnpm test` in `packages/saga-types/` for type tests
- Verify the compiled `.js` files in `plugin/scripts/` reflect the worktree changes

**References:**
- `packages/plugin-scripts/esbuild.config.mjs` — build configuration
- `packages/plugin-scripts/package.json` — build scripts

**Avoid:**
- Manually editing files in `plugin/scripts/` — they are compiled output
- Skipping tests

**Done when:**
- `pnpm build` succeeds without errors
- `pnpm test` passes in both `packages/plugin-scripts/` and `packages/saga-types/`
- `pnpm typecheck` passes
- Compiled scripts in `plugin/scripts/` are up to date
