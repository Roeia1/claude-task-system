# Changelog

All notable changes to the `@saga-ai/cli` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
