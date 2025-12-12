# Task 001: Create npm package structure and foundation script

## Feature Context

**Feature**: [001-statusline-task-info](../../features/001-statusline-task-info/feature.md)
**Technical Plan**: [plan.md](../../features/001-statusline-task-info/plan.md)

## Overview

This task establishes the foundation for the statusline integration script by creating the npm package structure, implementing argument parsing, context detection from `$CLAUDE_ENV_FILE`, and outputting the origin indicator (main repo vs worktree). This is Phase 1 of the statusline feature implementation and enables all subsequent phases to build on a solid, tested foundation.

## Task Type

feature - New functionality implementing the script skeleton and foundation components.

## Priority

P1 - Foundation task that blocks all other statusline tasks. Critical path for feature delivery.

## Dependencies

None - This is the first task in the statusline feature.

## Objectives

- [ ] Create npm package skeleton in `packages/statusline/` with proper structure
- [ ] Implement command-line argument parsing (`--help`, `--no-icons`, `--origin`, `--task`, `--counts`)
- [ ] Source `$CLAUDE_ENV_FILE` to read pre-detected context variables
- [ ] Output origin indicator based on `TASK_CONTEXT` variable (main vs worktree)
- [ ] Write comprehensive unit tests for all implemented functionality
- [ ] Create basic package documentation (README.md)

## Sub-tasks

1. [ ] Create npm package directory structure (`packages/statusline/`, `bin/`, `scripts/`)
2. [ ] Create `package.json` with proper metadata and bin entry
3. [ ] Create main bash script `bin/task-status` with shebang and argument parsing
4. [ ] Implement `--help` flag showing usage information
5. [ ] Implement `--no-icons` flag setting ASCII fallback mode
6. [ ] Implement `--origin`, `--task`, `--counts` flags (section selectors)
7. [ ] Implement sourcing of `$CLAUDE_ENV_FILE` with fallback handling
8. [ ] Implement origin indicator output (using `TASK_CONTEXT` variable)
9. [ ] Write Jest tests for argument parsing logic
10. [ ] Write integration tests for origin detection and output
11. [ ] Create README.md with installation and usage instructions

## Technical Approach

### Files to Create/Modify

- `packages/statusline/package.json` - npm package configuration with bin entry pointing to `bin/task-status`
- `packages/statusline/bin/task-status` - Main executable bash script (chmod +x)
- `packages/statusline/scripts/claude-task-system-statusline.sh` - Standalone downloadable version (identical to bin/task-status)
- `packages/statusline/README.md` - Installation and usage documentation
- `packages/statusline/__tests__/task-status.test.js` - Jest unit and integration tests
- `packages/statusline/jest.config.js` - Jest configuration for testing bash scripts

### Implementation Steps

1. **Create directory structure**:
   ```
   packages/
   └── statusline/
       ├── package.json
       ├── bin/
       │   └── task-status
       ├── scripts/
       │   └── claude-task-system-statusline.sh
       ├── __tests__/
       │   └── task-status.test.js
       ├── jest.config.js
       └── README.md
   ```

2. **Implement `package.json`**:
   - Name: `@claude-task-system/statusline`
   - Bin entry: `task-status` -> `bin/task-status`
   - Scripts: `test`, `lint`
   - Dev dependencies: jest, shellcheck (via npm)

3. **Implement argument parsing in `bin/task-status`**:
   - Parse flags into variables: `SHOW_ORIGIN`, `SHOW_TASK`, `SHOW_COUNTS`, `USE_ICONS`
   - Default behavior (no flags) = all sections enabled
   - `--no-icons` sets `USE_ICONS=false` for ASCII fallback
   - `--help` prints usage and exits

4. **Implement `$CLAUDE_ENV_FILE` sourcing**:
   - Check if `$CLAUDE_ENV_FILE` is set and file exists
   - Source it to get `TASK_CONTEXT`, `CURRENT_TASK_ID`, `CLAUDE_SPAWN_DIR`
   - Fallback: If not available, attempt filesystem detection (future enhancement)

5. **Implement origin indicator output**:
   - If `TASK_CONTEXT="worktree"`: Output worktree indicator (icon or ASCII)
   - If `TASK_CONTEXT="main"` or unset: Output main repo indicator
   - Unicode icons: `⌂` (worktree), `⎇` (main)
   - ASCII fallback: `[W]` (worktree), `[M]` (main)

### Testing Strategy

- **Unit Tests**:
  - Argument parsing: Test each flag individually and in combinations
  - Icon selection: Test `--no-icons` produces ASCII output
  - Environment sourcing: Mock `$CLAUDE_ENV_FILE` with various contents

- **Integration Tests**:
  - Run script with mock env file pointing to worktree context
  - Run script with mock env file pointing to main context
  - Run script without env file (graceful fallback)

- **Edge Cases**:
  - `$CLAUDE_ENV_FILE` set but file doesn't exist
  - `$CLAUDE_ENV_FILE` file exists but malformed
  - Unknown flags passed to script
  - Multiple conflicting flags

### Edge Cases to Handle

- `$CLAUDE_ENV_FILE` not set: Output graceful fallback (assume main repo, output "--" or minimal indicator)
- `$CLAUDE_ENV_FILE` set but file missing: Same as not set, no error
- `$CLAUDE_ENV_FILE` exists but missing `TASK_CONTEXT`: Treat as main repo
- Invalid flags: Print error to stderr, show help, exit 1
- Running outside any git repo: Output minimal indicator, exit 0

## Risks & Concerns

- **Bash portability**: Different bash versions may behave differently; target Bash 4.0+ and test on Linux/macOS
- **npx overhead**: Node.js startup adds latency; this phase just creates structure, performance testing happens later
- **Icon rendering**: Users without Nerd Fonts won't see icons correctly; `--no-icons` mitigates this
- **Test complexity**: Testing bash scripts with Jest requires shell execution; may need shellcheck for static analysis

## Resources & Links

- [Claude Code Statusline Documentation](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [Bash argument parsing patterns](https://stackoverflow.com/questions/192249/how-do-i-parse-command-line-arguments-in-bash)
- [Jest documentation](https://jestjs.io/docs/getting-started)
- [npm package.json bin field](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#bin)

## Acceptance Criteria

- Script executes successfully via `npx @claude-task-system/statusline` (after npm link)
- `--help` displays usage information with all flags documented
- `--no-icons` produces ASCII output instead of Unicode icons
- Script correctly reads and sources `$CLAUDE_ENV_FILE` when available
- Origin indicator shows `⎇` / `[M]` when in main repo context
- Origin indicator shows `⌂` / `[W]` when in worktree context
- All unit tests pass with 80%+ coverage on implemented functionality
- Script exits with code 0 on success, code 1 on actual errors (not missing context)
- README.md documents installation via npx and standalone bash script download
