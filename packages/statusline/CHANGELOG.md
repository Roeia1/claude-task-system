# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-13

### Changed

- **Icons**: Updated all icons to expressive emoji for better visual clarity and consistency
  - Origin: `⎇` → `🏠` (main), `⌂` → `🌿` (worktree)
  - Task counts: `●` → `🔄` (in-progress), `◐` → `⏸️` (pending), `○` → `☁️` (remote)
  - Feature counts: `◨` → `⭐` (active), `◧` → `📝` (draft)

### Improved

- **Documentation**: Comprehensive README rewrite
  - Added visual diagram showing all segments
  - Documented all three segments (origin, task info, counts) in detail
  - Added tables for all icons with descriptions
  - Generalized "Combining with Other Tools" section
  - Added claude-powerline integration example with link

## [1.0.0] - 2025-12-12

### Added

- Initial release
- **Origin segment**: Shows main repo (`⎇`) vs task worktree (`⌂`) with colored backgrounds
- **Task info segment**: Displays task type icon, title, and linked feature name
  - Task types: feature (`✨`), bugfix (`🐛`), refactor (`♻️`), performance (`⚡`), deployment (`🚀`)
  - Parses `task.md` for title and feature link
  - Parses `feature.md` for feature name
- **Counts segment**: Shows project-wide statistics
  - Task counts: in-progress, pending, remote (scans directories and git branches)
  - Feature counts: active, draft (scans feature.md status)
- **Powerline formatting**: ANSI colors with powerline separators (U+E0B0)
- **ASCII fallback**: `--no-icons` flag for terminals without Unicode support
- **Segment selection**: `--origin`, `--task`, `--counts` flags to show specific segments
- **Auto-detection**: Automatically detects worktree context from directory structure
- **Environment variables**: Reads from `CLAUDE_ENV_FILE` or falls back to environment

[1.1.0]: https://github.com/Roeia1/claude-task-system/compare/statusline-v1.0.0...statusline-v1.1.0
[1.0.0]: https://github.com/Roeia1/claude-task-system/releases/tag/statusline-v1.0.0
