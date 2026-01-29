# @saga-ai/cli

Command-line interface for SAGA (Structured Autonomous Goal Achievement) - a structured development workflow that combines human-guided epic planning with autonomous story execution.

## Requirements

- Node.js >= 18.0.0
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (for `implement` command)

## Usage

Run commands using npx (no global installation required):

```bash
npx @saga-ai/cli init
npx @saga-ai/cli find <query>
npx @saga-ai/cli worktree <epic-slug> <story-slug>
npx @saga-ai/cli implement <story-slug>
npx @saga-ai/cli sessions list
npx @saga-ai/cli dashboard
```

## Commands

### `saga init`

Initialize a new SAGA project structure.

```bash
saga init
saga init --path /path/to/project
```

Creates the `.saga/` directory structure:
- `.saga/epics/` - Epic definitions and stories
- `.saga/archive/` - Completed story archives
- `.saga/worktrees/` - Git worktrees for story isolation

Also updates `.gitignore` to ignore worktrees.

### `saga find <query>`

Find an epic or story by slug or title using fuzzy search.

```bash
saga find my-story
saga find "login feature"
saga find auth --type epic
```

Options:
- `--type <type>` - Type to search for: `epic` or `story` (default: story)
- `--status <status>` - Filter stories by status: `ready`, `completed`, `blocked`, etc.

Returns JSON with:
- `found: true` + `data` - Single match found
- `found: false` + `matches` - Multiple matches for disambiguation
- `found: false` + `error` - No matches found

Supports typo tolerance (e.g., "implment" matches "implement").

### `saga worktree <epic-slug> <story-slug>`

Create a git worktree and branch for story isolation.

```bash
saga worktree my-epic my-story
saga worktree auth-system login-form --path /path/to/project
```

Creates:
- Branch: `story-<story-slug>-epic-<epic-slug>`
- Worktree: `.saga/worktrees/<epic-slug>/<story-slug>/`

Returns JSON with:
- `success: true` + `worktreePath`, `branch` - Worktree created
- `success: false` + `error` - Creation failed (branch exists, directory exists, etc.)

### `saga implement <story-slug>`

Run autonomous story implementation using Claude workers.

```bash
saga implement my-story
saga implement my-story --max-cycles 5
saga implement my-story --max-time 30
saga implement my-story --model sonnet
```

Options:
- `--max-cycles <n>` - Maximum number of worker cycles (default: 10)
- `--max-time <n>` - Maximum time in minutes (default: 60)
- `--model <name>` - Model to use (default: opus)

By default, `implement` runs in **detached mode** using a tmux session. This allows the worker to continue running even if your terminal disconnects. Use `saga sessions` to monitor detached sessions.

**Note:** Requires `SAGA_PLUGIN_ROOT` environment variable to be set. This is automatically configured when running via the SAGA plugin.

### `saga sessions`

Manage tmux sessions created by detached `implement` runs.

```bash
saga sessions list              # List all SAGA sessions
saga sessions status <name>     # Check if session is running
saga sessions logs <name>       # Stream session output
saga sessions kill <name>       # Terminate a session
```

Subcommands:
- `list` - Returns JSON array of all SAGA sessions with name, status, and output file
- `status <name>` - Returns JSON `{running: boolean}` for the session
- `logs <name>` - Streams the session output file via `tail -f`
- `kill <name>` - Terminates the session, returns JSON `{killed: boolean}`

### `saga dashboard`

Start the SAGA dashboard server for viewing epics, stories, and progress.

```bash
saga dashboard
saga dashboard --port 8080
```

Options:
- `--port <n>` - Port to run the server on (default: 3847)

## Global Options

- `-p, --path <dir>` - Path to SAGA project directory (overrides auto-discovery)
- `-V, --version` - Output the version number
- `-h, --help` - Display help for command

## Project Discovery

The CLI automatically discovers SAGA projects by looking for a `.saga/` directory in the current directory or any parent directory. Use `--path` to override this behavior.

## License

MIT
