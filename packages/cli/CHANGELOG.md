# Changelog

All notable changes to the `@saga-ai/cli` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-01-27

### Added
- **implement**: New `--stream` flag for real-time worker output
  - Streams worker activity to stdout as it happens
  - Uses Claude Code's `--output-format stream-json --verbose` mode
  - Parses streaming JSON to display readable progress updates
  - Enables monitoring worker progress via background task output file

## [0.4.0] - 2026-01-27

### Added
- **scope-validator**: Worktree-level restriction to block file access outside the worktree directory
  - Uses `SAGA_PROJECT_DIR` to enforce worktree boundary
  - Extended PreToolUse hook to cover `Glob` and `Grep` tools (in addition to `Read`, `Write`, `Edit`)
  - Fixed hook input parsing to correctly extract path from nested `tool_input` structure

## [0.3.0] - 2026-01-26

### Added
- **worktree**: New `saga worktree <epic-slug> <story-slug>` command to create git worktrees for story isolation
  - Creates branch: `story-<story-slug>-epic-<epic-slug>`
  - Creates worktree at: `.saga/worktrees/<epic-slug>/<story-slug>/`
  - Returns JSON with `worktreePath` and `branch` on success

### Removed
- **Python scripts**: Removed `identifier_resolver_v2.py` and `create_worktree.py` (replaced by `saga find` and `saga worktree`)

## [0.2.0] - 2026-01-26

### Added
- **find**: New `saga find <query>` command to find epics or stories by slug/title
  - Fuzzy search powered by Fuse.js with typo tolerance
  - `--type epic|story` option (default: story)
  - Returns JSON with match data or multiple matches for disambiguation
- **finder**: Shared finder utility with `parseFrontmatter`, `extractContext`, `findEpic`, `findStory`

### Changed
- **implement**: Refactored to use shared finder utility instead of local implementation

### Dependencies
- Added `fuse.js` (^7.1.0) for fuzzy search

## [0.1.4] - 2026-01-26

### Fixed
- **implement**: Search for stories in worktrees instead of main epics directory, matching v2 resolver behavior

## [0.1.2-0.1.3] - 2026-01-26 (failed publish)

- Skipped due to npm registry propagation issues

## [0.1.1] - 2026-01-26

### Added
- **help**: New `saga help` command for displaying usage information

### Changed
- **scope-validator**: Converted from Python to TypeScript for better maintainability
- **docs**: Added CLAUDE.md development guide for contributors

## [0.1.0] - Initial Release

### Added
- **init**: `saga init` command to initialize .saga/ directory structure
- **implement**: `saga implement` command to orchestrate autonomous story execution
- **dashboard**: `saga dashboard` command to start HTTP server for dashboard UI
- Project discovery utility to find .saga/ in parent directories
