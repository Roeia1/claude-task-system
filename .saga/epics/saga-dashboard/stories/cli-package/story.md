---
id: cli-package
title: CLI Package with Commands and Script Migration
status: ready
epic: saga-dashboard
tasks:
  - id: t1
    title: Initialize npm package structure
    status: pending
  - id: t2
    title: Implement project discovery utility
    status: completed
  - id: t3
    title: Implement CLI entry point with argument parsing
    status: completed
  - id: t4
    title: Implement saga init command
    status: completed
  - id: t5
    title: Implement saga implement command
    status: completed
  - id: t6
    title: Implement saga dashboard command
    status: pending
  - id: t7
    title: Migrate scripts from plugin to CLI package
    status: pending
  - id: t8
    title: Update plugin skills to call CLI commands
    status: pending
---

## Context

This story creates the `@saga/cli` npm package - a unified command-line interface for all SAGA operations. The CLI provides three commands: `saga init` (initialize .saga/ directory), `saga implement <story-slug>` (run story implementation), and `saga dashboard` (start the web dashboard server).

A key requirement is that the CLI works from any subdirectory of a SAGA project, similar to how git commands work. The CLI walks up from the current working directory to find the `.saga/` directory, with an optional `--path` override for explicit project specification.

This story also migrates the Python scripts (`init_structure.py` and `implement.py`) from the plugin to the CLI package, making the CLI self-contained. The plugin skills (`/init` and `/implement`) are updated to call the CLI commands instead of invoking scripts directly.

The CLI serves as the foundation for the SAGA dashboard system. While this story focuses on the CLI infrastructure and commands, the actual dashboard server implementation (Express.js, file watching, WebSocket) is handled by the "Backend Server with API and Real-time Updates" sibling story. The `saga dashboard` command in this story will simply invoke the server module that story creates.

## Scope Boundaries

**In scope:**
- npm package structure at `packages/cli/`
- Project discovery utility (walk up to find `.saga/`)
- CLI entry point with argument parsing (commander or yargs)
- `saga init` command implementation
- `saga implement <story-slug>` command implementation
- `saga dashboard` command (placeholder that calls server module)
- Migration of `init_structure.py` and `implement.py` scripts to `packages/cli/scripts/`
- Update `/init` and `/implement` plugin skills to call CLI commands
- TypeScript source in `src/` compiled to `dist/` via esbuild
- Basic error handling and user-friendly output

**Out of scope:**
- Express.js server implementation (Backend Server story)
- File watching with chokidar (Backend Server story)
- WebSocket server (Backend Server story)
- REST API endpoints (Backend Server story)
- React frontend (React Dashboard story)
- Vite build configuration (React Dashboard story)
- XState state management (React Dashboard story)
- Unit tests for server functionality
- Publishing to npm registry
- Global installation support (focus on npx usage)

## Interface

### Inputs

- Current working directory (for project discovery)
- Command-line arguments:
  - `saga init [--path <dir>]`
  - `saga implement <story-slug> [--path <dir>] [--max-cycles N] [--max-time N] [--model M]`
  - `saga dashboard [--path <dir>] [--port N]`
- Environment variables (inherited from plugin when called by skills):
  - `SAGA_PLUGIN_ROOT` - Used by implement.py
  - `SAGA_PROJECT_DIR` - Used by implement.py

### Outputs

- `@saga/cli` npm package with:
  - `bin/saga` entry point
  - `dist/cli.js` - Compiled CLI code
  - `scripts/init_structure.py` - Migrated from plugin
  - `scripts/implement.py` - Migrated from plugin
- Updated plugin skills that call CLI commands
- Console output for user feedback

## Acceptance Criteria

- [ ] Running `npx @saga/cli init` from a project root creates the `.saga/` directory structure
- [ ] Running `npx @saga/cli init` from a subdirectory discovers the project root and initializes there
- [ ] Running `npx @saga/cli implement <slug>` invokes the implementation orchestrator
- [ ] Running `npx @saga/cli dashboard` starts the dashboard server (placeholder until Backend story completes)
- [ ] The `--path` flag overrides automatic project discovery for all commands
- [ ] Plugin skill `/init` successfully calls `saga init` and works as before
- [ ] Plugin skill `/implement` successfully calls `saga implement` and works as before
- [ ] Scripts are bundled in the npm package at `scripts/` directory
- [ ] CLI provides helpful error messages when `.saga/` directory is not found

## Tasks

### t1: Initialize npm package structure

**Guidance:**
- Create `packages/cli/` directory at project root
- Initialize with `npm init` or create package.json manually
- Configure package.json with:
  - name: `@saga/cli`
  - bin: `{ "saga": "./dist/cli.js" }`
  - main: `./dist/cli.js`
  - type: `module` (use ES modules)
  - scripts: `{ "build": "esbuild src/cli.ts --bundle --platform=node --outfile=dist/cli.js --format=esm" }`
- Install dev dependencies: `typescript`, `esbuild`, `@types/node`
- Install dependencies: `commander` (for argument parsing)
- Create `tsconfig.json` with ES module settings
- Create `src/` directory for TypeScript source files

**References:**
- Epic section: Package Structure shows the expected layout
- `packages/cli/dist/cli.js` is the entry point

**Avoid:**
- Using tsup or other bundlers - stick with esbuild as specified in epic
- Creating a monorepo configuration - just the single CLI package for now
- Adding unnecessary dependencies

**Done when:**
- `packages/cli/package.json` exists with correct configuration
- `packages/cli/tsconfig.json` exists
- `packages/cli/src/` directory exists
- Running `npm install` in `packages/cli/` succeeds

### t2: Implement project discovery utility

**Guidance:**
- Create `src/utils/project-discovery.ts`
- Implement `findProjectRoot(startDir?: string): string | null` function
- Walk up from `startDir` (default: `process.cwd()`) looking for `.saga/` directory
- Return the directory containing `.saga/`, or null if not found
- Also implement `resolveProjectPath(explicitPath?: string): string` that:
  - Uses explicit path if provided
  - Falls back to discovery from cwd
  - Throws descriptive error if project not found

**References:**
- Epic Key Decision: "CLI Project Discovery: Walk up from CWD to find `.saga/`, with `--path` override"
- Git's own directory discovery as conceptual model

**Avoid:**
- Following symlinks that could lead outside the project
- Searching beyond reasonable depth (e.g., filesystem root)
- Complex caching - simple implementation is fine

**Done when:**
- `findProjectRoot()` returns correct path when called from subdirectory of SAGA project
- `findProjectRoot()` returns null when no `.saga/` exists in parent chain
- `resolveProjectPath()` throws helpful error when project not found
- `resolveProjectPath()` uses explicit path when provided

### t3: Implement CLI entry point with argument parsing

**Guidance:**
- Create `src/cli.ts` as the main entry point
- Add shebang: `#!/usr/bin/env node`
- Use `commander` for argument parsing
- Define program with version from package.json
- Register subcommands: `init`, `implement`, `dashboard`
- Add global `--path <dir>` option for project override
- Parse arguments and dispatch to command handlers

**References:**
- Epic section "CLI Commands" lists the three commands
- Commander.js documentation for subcommand patterns

**Avoid:**
- Implementing command logic in cli.ts - keep it thin
- Using positional arguments for the project path (use --path flag)
- Hardcoding version - read from package.json

**Done when:**
- `saga --help` shows all commands and global options
- `saga init --help` shows init-specific options
- `saga implement --help` shows implement-specific options
- `saga dashboard --help` shows dashboard-specific options
- Unknown commands show error with usage hint

### t4: Implement saga init command

**Guidance:**
- Create `src/commands/init.ts`
- Export handler function that:
  - Resolves project path (from --path or discovery)
  - Calls the `init_structure.py` script with resolved path
  - Captures and displays script output
  - Handles errors gracefully
- The Python script is at `scripts/init_structure.py` relative to CLI package
- Use `path.dirname(fileURLToPath(import.meta.url))` to find script location

**References:**
- `plugin/skills/init/scripts/init_structure.py` - script to migrate
- `plugin/skills/init/SKILL.md` - current invocation pattern

**Avoid:**
- Reimplementing the Python script in TypeScript (keep the Python script)
- Swallowing script errors - propagate them with context
- Assuming fixed paths - compute relative to dist/cli.js

**Done when:**
- `saga init` creates `.saga/` structure when run from project root
- `saga init` works from subdirectory (discovers project root)
- `saga init --path /some/dir` initializes at specified path
- Script output is displayed to user
- Errors are reported with helpful messages

### t5: Implement saga implement command

**Guidance:**
- Create `src/commands/implement.ts`
- Accept positional argument: `<story-slug>`
- Accept options: `--max-cycles`, `--max-time`, `--model`
- Handler function should:
  - Resolve project path
  - Set up environment variables (SAGA_PROJECT_DIR, SAGA_PLUGIN_ROOT)
  - Call `scripts/implement.py` with appropriate arguments
  - Stream script output to console
  - Parse and display final JSON result
- Note: SAGA_PLUGIN_ROOT still needs to point to the plugin for worker-prompt.md

**References:**
- `plugin/skills/execute-story/scripts/implement.py` - script to migrate
- `plugin/skills/execute-story/SKILL.md` - current invocation and options

**Avoid:**
- Breaking the existing worker spawning mechanism
- Changing the implement.py script behavior
- Blocking on script output - stream it in real-time if possible

**Done when:**
- `saga implement <slug>` invokes the implementation script
- `saga implement <slug> --max-cycles 5` passes option to script
- Environment variables are correctly set for the script
- Script output (JSON result) is displayed
- Errors from script are reported

### t6: Implement saga dashboard command

**Guidance:**
- Create `src/commands/dashboard.ts`
- Accept options: `--port` (default: 3847)
- For now, create a placeholder that:
  - Resolves project path
  - Prints "Starting dashboard server on port <port>..."
  - Prints "Dashboard will be available at http://localhost:<port>"
  - Prints "Note: Dashboard server implementation pending (Backend Server story)"
- The actual server module will be implemented in the Backend Server story
- This placeholder allows the CLI structure to be complete and testable

**References:**
- Epic section: "Default Port: 3847" and "saga dashboard" command description
- Backend Server story will provide the actual server implementation

**Avoid:**
- Implementing actual server logic (that's Backend Server story's scope)
- Blocking indefinitely - just print placeholder message and exit
- Complex configuration - keep it simple for now

**Done when:**
- `saga dashboard` prints placeholder message and exits
- `saga dashboard --port 4000` uses custom port in message
- `saga dashboard --path /some/dir` resolves project path
- Exit code is 0 for placeholder success

### t7: Migrate scripts from plugin to CLI package

**Guidance:**
- Create `packages/cli/scripts/` directory
- Copy `plugin/skills/init/scripts/init_structure.py` to `packages/cli/scripts/`
- Copy `plugin/skills/execute-story/scripts/implement.py` to `packages/cli/scripts/`
- Update implement.py to work with new location:
  - The script references worker-prompt.md relative to SAGA_PLUGIN_ROOT
  - This dependency remains - worker prompt stays in plugin
  - Script location changes but environment variable handling stays same
- Ensure scripts have correct shebang and are executable
- Keep original scripts in plugin for now (backwards compatibility)

**References:**
- `plugin/skills/init/scripts/init_structure.py` - current location
- `plugin/skills/execute-story/scripts/implement.py` - current location
- Epic section: "Script Location: CLI Package"

**Avoid:**
- Modifying script logic during migration
- Breaking existing plugin functionality before skills are updated
- Removing original scripts until skills are updated (t8)

**Done when:**
- `packages/cli/scripts/init_structure.py` exists and is executable
- `packages/cli/scripts/implement.py` exists and is executable
- Scripts work when called directly with Python
- No logic changes from originals

### t8: Update plugin skills to call CLI commands

**Guidance:**
- Update `plugin/skills/init/SKILL.md`:
  - Change from calling Python script directly to calling `npx @saga/cli init`
  - Use `--path "$SAGA_PROJECT_DIR"` for explicit path
  - Keep the post-initialization user guidance text
- Update `plugin/skills/execute-story/SKILL.md`:
  - Change from calling Python script to calling `npx @saga/cli implement`
  - Pass through all options: `--max-cycles`, `--max-time`, `--model`
  - Use `--path "$SAGA_PROJECT_DIR"` for explicit path
  - Keep the identifier resolution step (it still runs first)
- The CLI package must be built and accessible via npx

**References:**
- `plugin/skills/init/SKILL.md` - current skill definition
- `plugin/skills/execute-story/SKILL.md` - current skill definition

**Avoid:**
- Changing the skill's user-facing behavior
- Removing the identifier resolver step from /implement
- Breaking backwards compatibility during transition

**Done when:**
- `/init` skill calls `saga init` and works correctly
- `/implement` skill calls `saga implement` and works correctly
- Both skills produce same user-facing output as before
- Error handling works correctly through CLI layer
