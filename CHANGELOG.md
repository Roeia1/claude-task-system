# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
