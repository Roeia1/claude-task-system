# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.2] - 2026-02-04

### Changed

- **dashboard**: Rename CLI subcommand from `saga dashboard` to `saga start`

## [3.0.1] - 2026-02-04

### Fixed

- **publish**: Add build plugin-scripts step to publish workflow
- **dashboard**: Move `@saga-ai/types` to devDependencies to fix npm install E404 when types package is not published

## [3.0.0] - 2026-02-04

### Breaking Changes

- **Package rename**: `@saga-ai/cli` is replaced by `@saga-ai/dashboard` — the CLI package is deprecated and removed from npm
- **Plugin skills**: All skills now invoke `node $SAGA_PLUGIN_ROOT/scripts/<name>.js` instead of `npx @saga-ai/cli <command>` — existing plugin installations must update to v3.0.0
- **Dashboard standalone**: `@saga-ai/dashboard` no longer depends on `SAGA_PLUGIN_ROOT` or other plugin environment variables — it reads `.saga/` directory directly

### Added

- **plugin-scripts**: New `packages/plugin-scripts/` package containing TypeScript source for all orchestration commands
  - `implement.ts` — story execution orchestrator (refactored from monolithic 32KB file into focused modules)
  - `find.ts` — fuzzy epic/story search
  - `worktree.ts` — git worktree creation for story isolation
  - `scope-validator.ts` — tool call scope enforcement
  - `sessions-kill.ts` — tmux session termination
- **plugin/scripts/**: Pre-built JavaScript artifacts committed to the plugin for direct execution (`node $SAGA_PLUGIN_ROOT/scripts/<name>.js`)
- **saga-types**: New `packages/saga-types/` package with shared Zod schemas and inferred TypeScript types for the `.saga/` directory contract (Epic, Story, Session, StoryStatus, etc.)
- **dashboard package**: New `packages/dashboard/` package (`@saga-ai/dashboard`) — standalone dashboard and session viewer that only reads `.saga/` directory

### Changed

- **Architecture**: Clear separation of concerns — plugin handles orchestration, dashboard handles monitoring
  - Plugin skills call internal scripts instead of shelling out to an npm package
  - Dashboard operates independently with no plugin dependency
  - `.saga/` directory structure is the only interface contract between components
- **Session management split**: Plugin handles session creation/killing (orchestration), dashboard handles session viewing (monitoring)
- **Plugin skills**: All `npx @saga-ai/cli` invocations replaced with `node $SAGA_PLUGIN_ROOT/scripts/<name>.js`
- **generate-story agent**: Uses `node $SAGA_PLUGIN_ROOT/scripts/worktree.js` instead of `npx @saga-ai/cli worktree`
- **list-sessions skill**: Uses `npx @saga-ai/dashboard sessions list` instead of `npx @saga-ai/cli sessions list`
- **dashboard skill**: Uses `npx @saga-ai/dashboard@latest` instead of `npx @saga-ai/cli@latest dashboard`
- **Publish workflow**: Updated to publish `@saga-ai/dashboard` instead of `@saga-ai/cli`

### Removed

- **@saga-ai/cli**: Package deprecated and deleted from npm — replaced by `@saga-ai/dashboard` for monitoring and `plugin/scripts/` for orchestration
- **CLI orchestration commands**: `implement`, `find`, `worktree`, `scope-validator`, `sessions kill` removed from dashboard package — these now live in plugin scripts
- **SAGA_PLUGIN_ROOT dependency**: Dashboard no longer requires any SAGA environment variables

## [2.17.1] - 2026-02-02

### Fixed

- **dashboard**: Story detail page now renders correctly for stories without journal.md files

## [2.17.0] - 2026-02-02

### Added

- **dashboard**: Sessions tab on story detail page for viewing and managing tmux sessions
- **cli**: Improved tool usage display during story execution with curated details (file paths, commands, patterns)

### Fixed

- **cli**: Resolved lint errors in dashboard components (magic numbers, hook dependencies, formatting)

## [2.16.0] - 2026-02-01

### Added

- **storybook**: Mock data factories (`mock-factories.ts`) for generating consistent test data across all component stories
- **storybook**: PageWrapper component for proper Layout context in page stories
- **storybook**: New component stories for EpicCard, StoryCard, TaskItem, and JournalEntry
- **cli**: Comprehensive testing strategy documentation (`TESTING.md`)

### Changed

- **storybook**: Restructured all stories to Showcase + Playground pattern (reduced from 40+ stories to 2 per component)
- **storybook**: Reorganized sidebar hierarchy to Foundation/Atoms/Components/Pages
- **storybook**: Centralized snapshots under `snapshots/dom/` and `snapshots/pixel/` directories
- **cli**: Improved LogViewer component with better auto-scroll toggle (removed confusing pause button)
- **cli**: Changed progress bar colors for clearer visual feedback (green for progress, clearer empty state)
- **cli**: Clarified DOM vs pixel snapshot terminology in documentation

### Fixed

- **cli**: Resolved flaky WebSocket file watcher e2e test
- **cli**: Corrected snapshot directory name in docs

## [2.15.1] - 2026-02-01

### Fixed

- **sessions**: Use double-underscore naming for dashboard compatibility
- **dashboard**: Include story content in API response

## [2.15.0] - 2026-01-31

### Added

- **dashboard**: Active sessions display on home page with real-time WebSocket updates
- **dashboard**: SessionCard and ActiveSessions components for session monitoring
- **dashboard**: Storybook stories for session components
- **scope-validator**: Error message output for scope violations

### Changed

- **cli**: Upgraded to React 19 and React Router v7
- **cli**: Upgraded to Tailwind v4 with Biome linter
- **cli**: Upgraded vite, vitest, esbuild, and related packages
- **cli**: Improved test patterns with model-based testing using xstate/graph
- **build**: Split vendor chunks to reduce main bundle size

### Fixed

- **cli**: WebSocket session broadcast and ping/pong reliability
- **cli**: WebSocket reconnection and subscription restoration
- **cli**: Sequential ports in WebSocket tests to prevent EADDRINUSE
- **cli**: Biome lint errors across codebase (300+ fixes)
- **storybook**: Removed component exports and unused MDX patterns
- **lint**: Resolved barrel file and magic number warnings

## [2.14.0] - 2026-01-30

### Added

- **dashboard**: Log viewer component for real-time tmux session log display
- **dashboard**: WebSocket log streaming for live session output
- **dashboard**: Story content rendered as markdown in StoryDetail view

### Changed

- **build**: Parallelized build and test scripts using concurrently for faster CI

### Fixed

- **cli**: E2E test setup now resets fixtures before each test for clean state

## [2.13.0] - 2026-01-30

### Added

- **dashboard**: Epic.md content display with collapsible markdown rendering using react-markdown and remark-gfm
- **dashboard**: Visual snapshot testing infrastructure with Storybook-based DOM snapshots
- **dashboard**: Backend session API with REST endpoints (GET /api/sessions, GET /api/sessions/:sessionName)
- **dashboard**: WebSocket broadcasts for real-time session updates (sessions:updated event)
- **dashboard**: Session polling service with change detection for new, completed, and removed sessions

## [2.12.1] - 2026-01-29

### Fixed

- **cli**: Dashboard CPU usage reduced from 400%+ to near zero by watching only epics/archive directories instead of entire .saga/ (which includes worktrees with 79K+ files)

## [2.12.0] - 2026-01-29

### Added

- **dashboard**: Epic.md content display in epic detail view
- **dashboard**: Playwright E2E tests with real backend (happy paths + error paths)
- **dashboard**: Test fixtures for E2E testing (sample epics, stories, journals)

### Changed

- **skills**: Consolidated `/publish-cli` and `/publish-plugin` into single `/publish` skill

### Fixed

- **dashboard**: SPA routing for direct URL navigation (Express 5 sendFile fix)

## [2.11.2] - 2026-01-29

### Fixed

- **/dashboard skill**: Use `/tasks` to stop dashboard server instead of pkill
- **/dashboard skill**: Use Bash `run_in_background` parameter for cleaner background process handling
- **/dashboard skill**: Use `npx @saga-ai/cli@latest` to ensure CLI availability without global installation

## [2.11.1] - 2026-01-28

### Added

- **task-pattern skill**: New skill (renamed from author-agent) for writing structured agents and skills using task table pattern
- **generate-story agent**: Added Blocks column to task dependencies for better workflow management
- **generate-story agent**: Added dependency install step for projects with package.json

### Changed

- **skills**: Converted all skills to task table pattern for improved structure and consistency
  - execute-story, generate-stories, create-epic, publish-plugin, publish-cli, pr-review
- **branding**: Renamed remaining "Claude Task System" references to "SAGA"
- **cli**: Replaced `--attached` flag with `SAGA_INTERNAL_SESSION` environment variable
- **cli**: Removed `--stream` option, always use streaming in attached mode

### Fixed

- **execute-story**: Corrected `/resolve-blocker` command reference in notes
- **pr-review**: Restored full details in task descriptions
- **skills**: Made task descriptions self-contained without internal references
- **publish-cli**: Merged prerequisites into first task
- **cli**: Extract structured output from tool call as fallback

## [2.11.0] - 2026-01-28

### Added

- **list-sessions**: New skill to display running tmux sessions
  - Shows session status (running/stopped) and output file locations
  - Uses `saga sessions list` CLI command

### Fixed

- **worker-prompt**: Remove JSON output instructions that confused workers
  - The `--json-schema` flag handles structured output automatically
  - Workers no longer try to call non-existent `StructuredOutput` tool

## [2.10.1] - 2026-01-28

### Changed

- **execute-story**: Filter out completed stories when searching
  - Uses `--status ready` flag to exclude already-completed stories
- **cli**: Updated to v0.7.0 with tmux session management and detached execution

## [2.10.0] - 2026-01-28

### Added

- **execute-story**: Merge origin/master step before implementation
  - Ensures stories start with latest main branch changes
  - Reduces merge conflicts during PR review

### Fixed

- **execute-story**: Return to project root after merge step
  - Fixes working directory issues when merge step was added

### Changed

- **cli**: Updated to v0.6.0 with dashboard features (server API + React UI)

## [2.9.2] - 2026-01-27

### Fixed

- **plugin**: Remove explicit hooks reference that caused duplicate load error
  - Claude Code auto-loads `hooks/hooks.json` from plugin root
  - v2.9.1 incorrectly added explicit reference causing "Duplicate hooks file detected" error

## [2.9.1] - 2026-01-27 [YANKED]

### Fixed

- ~~**plugin**: Add missing `hooks` field to plugin manifest~~ (caused duplicate hooks error)

## [2.9.0] - 2026-01-27

### Changed

- **execute-story**: Skill now uses `--stream` flag by default for real-time worker output
  - Worker activity streams to background task output file
  - Enables monitoring progress by reading task output directly
- **cli**: Updated to v0.5.0 with streaming support

## [2.8.0] - 2026-01-27

### Changed

- **cli**: Scope validator now enforces worktree-level restriction (v0.4.0)
  - Blocks file access outside the worktree directory using `SAGA_PROJECT_DIR`
  - Extended PreToolUse hook to cover `Glob` and `Grep` tools
  - Fixed hook input parsing for nested `tool_input` structure

## [2.7.0] - 2026-01-26

### Added

- **cli**: New `saga worktree <epic> <story>` command (v0.3.0)
  - Creates git branch and worktree for story isolation
  - Returns JSON with `worktreePath` and `branch` on success

### Changed

- **generate-story**: Agent now uses `saga worktree` CLI instead of Python script

### Removed

- **Python scripts**: Removed all Python scripts (`identifier_resolver_v2.py`, `create_worktree.py`) - replaced by CLI commands (`saga find`, `saga worktree`)
- **Python config**: Removed `pyproject.toml`, `uv.lock`, and Python entries from `.gitignore`

## [2.6.0] - 2026-01-26

### Changed

- **skills**: Migrated execute-story, resolve-blocker, generate-stories from Python `identifier_resolver_v2.py` to `saga find` CLI command
  - Fuzzy search with typo tolerance powered by Fuse.js
  - Field names updated from snake_case to camelCase (epicSlug, etc.)

### Added

- **cli**: New `saga find <query>` command (v0.2.0)
  - Find epics or stories by slug/title with fuzzy matching
  - `--type epic|story` option (default: story)
  - Returns JSON with match data or multiple matches for disambiguation

## [2.5.0] - 2026-01-26

### Added

- **cli**: New `@saga-ai/cli` npm package - standalone CLI for SAGA workflows
  - `saga init` - Initialize `.saga/` directory structure
  - `saga implement <story>` - Orchestrate autonomous story execution
  - `saga dashboard` - Start HTTP server for dashboard UI
  - `saga help` - Display help information
- **skills**: `/publish-cli` skill for npm package releases
- **release-skill**: Step to update documentation content during releases

### Changed

- **cli**: Converted Python orchestration scripts to TypeScript
- **cli**: Switched to pnpm package manager with Node 23
- **docs**: Refactored CLAUDE.md to index-style with progressive discovery pattern
- **skills**: Renamed `/release` skill to `/publish-plugin`

### Fixed

- **gitignore**: Added `.saga/worktrees/` to prevent accidental commits
- **cleanup**: Removed accidentally committed worktrees

## [2.4.0] - 2026-01-26

### Changed

- **skills**: Rename skill names to match folder names for consistency
  - `implement` → `execute-story` (invoke with `/execute-story`)
  - `resolve` → `resolve-blocker` (invoke with `/resolve-blocker`)

## [2.3.2] - 2026-01-26

### Changed

- **worker**: Enforce one task per session for improved focus and reliability

## [2.3.1] - 2026-01-26

### Fixed

- **resolver**: Search for stories in worktrees instead of epics folder

## [2.3.0] - 2026-01-26

### Changed

- **generate-stories**: Story.md files are now written directly to worktree branches instead of main working directory. Worktree is created first, then story.md is written and committed there, enabling draft PR creation with actual content.

## [2.2.2] - 2026-01-26

### Fixed

- **plugin-manifest**: Use array format for agents field - changed from directory path `"./agents/"` to array `["./agents/generate-story.md"]` to fix "agents: Invalid input" validation error during plugin install

## [2.2.1] - 2026-01-26

### Fixed

- **plugin-agents**: Update agent frontmatter format to match Claude Code schema - removed unsupported fields (`name`, `tools`, `model`) that caused "agents: Invalid input" validation error during plugin install

## [2.2.0] - 2026-01-26

### Added

- **agents**: New `plugin/agents/` directory for Claude Code agents
- **generate-story agent**: Story generation now uses a proper Claude Code agent with `model: opus`

### Changed

- **generate-stories**: Now spawns `generate-story` agents via Task tool instead of using Skill tool with fork context
- **plugin.json**: Added `agents` directory registration

### Removed

- **generate-story skill**: Replaced by `generate-story` agent (better parallelism and isolation)

## [2.1.2] - 2026-01-25

### Reverted

- **skill-config**: Restore `disable-model-invocation: true` to skills - the autocomplete issue is a Claude Code bug ([#17271](https://github.com/anthropics/claude-code/issues/17271)), not related to this setting

## [2.1.1] - 2026-01-25

### Fixed

- **skill-autocomplete**: Remove `disable-model-invocation: true` from skills which was preventing them from appearing in the `/` autocomplete menu due to a Claude Code bug

## [2.1.0] - 2026-01-25

### Changed

- **branding**: Rename "Claude Task System" to "SAGA" (Structured Autonomous Goal Achievement)
- **environment-variables**: Add `SAGA_` prefix to all environment variables for clear namespacing
  - `CLAUDE_PROJECT_DIR` → `SAGA_PROJECT_DIR`
  - `CLAUDE_PLUGIN_ROOT` → `SAGA_PLUGIN_ROOT`
  - `TASK_CONTEXT` → `SAGA_TASK_CONTEXT`
  - `EPIC_SLUG` → `SAGA_EPIC_SLUG`
  - `STORY_SLUG` → `SAGA_STORY_SLUG`
  - `STORY_DIR` → `SAGA_STORY_DIR`

## [2.0.0] - 2026-01-25

### Added

- **V2 Epic/Story workflow**: Complete new architecture replacing V1 task system
  - `/init` - Initialize `.saga/` directory structure
  - `/create-epic` - Define epics with vision, goals, and architecture
  - `/generate-stories` - Break epics into implementable stories with worktrees
  - `/implement` - Autonomous story execution with worker spawning
  - `/resolve` - Analyze and resolve blocked stories

### Changed

- **Directory structure**: Now uses `.saga/` instead of `task-system/`
  - `epics/` - Epic definitions with nested stories
  - `archive/` - Completed story archives
  - `worktrees/` - Git worktrees for story isolation
- **README**: Completely rewritten for V2 epic/story workflow

### Removed

- **V1 task workflow**: All V1 components removed (breaking change)
  - Commands: feature-definition, feature-planning, task-generation, task-list, task-cleanup, task-resume, architecture-decisions
  - Skills: task-builder, task-merge, task-cleanup
  - Agents: task-builder
  - Instructions: All V1 instruction directories
- **ADR functionality**: Architecture decision records removed (decisions now captured in epic.md)

## [1.4.2] - 2026-01-17

### Changed

- **environment-variables**: Rename `CLAUDE_SPAWN_DIR` to `CLAUDE_PROJECT_DIR` for clarity
- **session-init-hook**: Export `CLAUDE_PLUGIN_ROOT` environment variable in session initialization

## [1.4.1] - 2026-01-10

### Changed

- **implement**: Use `--plugin-root` argument instead of environment variable for plugin path resolution
- **implement**: Replace `nohup` with Bash tool's `run_in_background` for worker spawning
- **context-detection**: Use `$TASK_CONTEXT` environment variable for consistent context detection across skills

### Fixed

- **plugin-manifest**: Remove duplicate hooks reference that caused "Duplicate hooks file detected" error on plugin load

## [1.4.0] - 2026-01-10

### Added

- **implement-command**: New `/implement` command for autonomous task execution
  - Orchestrator spawns worker Claude instances in a loop
  - Workers complete objectives incrementally from `task.json`
  - Exit statuses: FINISH (done), BLOCKED (needs human), TIMEOUT
  - Supports identifier resolution by task ID, name, or feature
- **resolve-command**: New `/resolve` command to handle blocked workers
  - Analyzes blocker context from `journal.md`
  - Proposes solutions with pros/cons
  - Documents resolution for continuation
- **task-json-schema**: Structured `task.json` format for machine-readable task definitions
  - Replaces markdown-based `task.md` for autonomous execution
  - Objectives with id, description, steps, notes, and status tracking
  - Meta section with task ID, title, creation date, and feature link
- **worker-prompts**: Worker prompt templates for autonomous execution
- **identifier-resolution**: Utilities to find tasks by ID, name, or feature name
- **implement-script**: `implement.py` Python orchestration script

### Changed

- **task-builder**: Now generates `task.json` format instead of `task.md`
- **hooks-structure**: Plugin hooks moved to separate `hooks.json` file

### Removed

- **tmux-infrastructure**: TMUX session management replaced by autonomous worker model
- **task-start-skill**: Replaced by `/implement` command
- **journaling-subagent**: Simplified to direct `journal.md` writes by workers
- **deprecated-skill-files**: Cleaned up old SKILL.md files

## [1.3.1] - 2026-01-03

### Fixed

- **plugin-paths**: Use `${CLAUDE_PLUGIN_ROOT}` for all instruction file references to ensure paths resolve correctly when plugin is installed in other projects
- **plugin-paths**: Fix remaining path references in skills and commands to use plugin root variable

### Documentation

- **CLAUDE.md**: Add guidance on using `${CLAUDE_PLUGIN_ROOT}` for plugin path references

## [1.3.0] - 2026-01-03

### Added

- **slash-commands**: 8 new slash commands for direct skill invocation
  - `/task-system:task-list` - List all tasks with status
  - `/task-system:task-start [task-id]` - Start working on a task
  - `/task-system:task-cleanup [task-id]` - Cleanup completed task worktree
  - `/task-system:task-resume [task-id]` - Resume a remote task locally
  - `/task-system:feature-definition [description]` - Define a new feature
  - `/task-system:feature-planning [feature-id]` - Create technical plan for feature
  - `/task-system:architecture-decisions [topic]` - Create an architecture decision record
  - `/task-system:task-generation [feature-id]` - Generate tasks from feature plan

### Changed

- **plugin-structure**: Refactored to centralized `plugin/instructions/` directory
  - Skills and commands now share instruction content (single source of truth)
  - All 12 SKILL.md files converted to thin wrappers with `Content:` references
  - Supporting artifacts (templates, workflows, scripts) moved to `instructions/` subdirectories
  - Cleaner separation between registration metadata and execution instructions

## [1.2.1] - 2025-12-22

### Changed

- **task-cleanup**: Unified to use shared `claude-spawn.sh` instead of separate `spawn-cleanup.sh` script
  - Removed redundant `spawn-cleanup.sh` from `plugin/scripts/`
  - Simplified codebase with single spawn utility

### Fixed

- **task-start**: Corrected `detect-context.sh` path reference (was `scripts/detect-context.sh`, now `skills/task-start/scripts/detect-context.sh`)
- **claude-spawn**: Fixed session handoff to use `tmux split-window` instead of `run-shell` for proper interactive sessions

## [1.2.0] - 2025-12-22

### Added

- **claude-spawn**: New utility script for seamless session handoff between directories
  - `plugin/scripts/claude-spawn.sh` - Generic script to spawn Claude in a different directory via tmux
  - Kills current Claude session after scheduling new one (no pane proliferation)
  - Distinct exit codes for debugging: 1=no tmux, 2=bad args, 3=bad path
  - Proper shell escaping for paths with spaces and prompts with special characters

- **task-start auto-navigation**: Starting a task from the wrong location now auto-navigates
  - Running "start task NNN" from master branch or wrong worktree automatically spawns Claude in the correct worktree
  - Falls back to manual instructions when not running in tmux
  - Uses `detect-context.sh` to resolve worktree path for any task ID

### Changed

- **detect-context.sh**: Enhanced to return worktree path for any requested task ID
  - Supports both padded (010) and unpadded (10) task ID formats
  - Returns `worktree_path` in JSON output for spawn integration

## [1.1.0] - 2025-12-21

### Added

- **automatic-cleanup**: Task cleanup is now automatic when running in TMUX
  - After PR merge, system prompts: "Spawn cleanup pane at main repo? [Y/n]"
  - If confirmed, spawns new TMUX pane at main repo with Claude cleanup session
  - Falls back to manual instructions when not in TMUX

### Changed

- **task-cleanup**: Now location-aware - detects worktree vs main repo context
- **task-completer**: Simplified to orchestrate task-merge then task-cleanup sequentially
- **worktree-flow**: Simplified task completion step (delegates to task-completer)

## [1.0.4] - 2025-12-13

### Changed

- **journaling-guidelines**: Clarified that phase transitions require ONE journal entry (not two separate entries for phase end and phase start)
- **journaling-guidelines**: Added explicit instructions and examples showing that a single transition entry documents both the completed phase and the new phase being entered

## [1.0.3] - 2025-12-13

### Changed

- **task-completion**: Split into two-step flow to avoid agent running inside worktree it's deleting
  - New `task-merge` skill: Archives files and merges PR (runs in worktree)
  - New `task-cleanup` skill: Removes worktree after merge (runs from main repo)
  - User says "cleanup task NNN" from main repo after PR is merged

### Removed

- **task-completion**: Replaced by `task-merge` and `task-cleanup` skills

## [1.0.2] - 2025-12-13

### Changed

- **journaling**: Clarify that journaling subagent and journal-write skill should not read project files to verify content - accept content as-is from main agent

## [1.0.1] - 2025-12-13

### Changed

- **task-start**: Simplified main repo handling - clearer detection and messaging when starting tasks from the main repository vs worktree

### Fixed

- **journaling**: Require worktree_path parameter for absolute file paths to ensure journal files are written to correct location

## [1.0.0] - 2024-12-12

### Added

- **Feature Definition Skill** - Define WHAT to build with user stories and acceptance criteria
- **Feature Planning Skill** - Design HOW to build with 7-phase technical planning
- **Task Generation Skill** - Break features into executable tasks with git worktrees
- **Task Start Skill** - Execute tasks with type-specific workflows (feature, bugfix, refactor, performance, deployment)
- **Task List Skill** - Dynamic task status derived from filesystem and git state
- **Task Resume Skill** - Continue remote tasks locally from any machine
- **Architecture Decisions Skill** - Document ADRs with comprehensive analysis
- **Journaling Subagent** - Continuous documentation throughout task execution
- **Task Builder Subagent** - Parallel task creation with git branches and PRs
- **Task Completer Subagent** - Automated PR merge and cleanup
- **Test-Driven Development** - Enforced tests-first workflow
- **Phase Gates** - Explicit permission required between phases
- **Git Worktree Support** - Parallel task execution with isolated checkouts
