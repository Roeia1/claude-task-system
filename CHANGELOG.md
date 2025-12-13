# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
