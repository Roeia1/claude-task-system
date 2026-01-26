# @saga-ai/cli

Command-line interface for SAGA (Structured Autonomous Goal Achievement) - a structured development workflow that combines human-guided epic planning with autonomous story execution.

## Requirements

- Node.js >= 18.0.0
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (for `implement` command)

## Usage

Run commands using npx (no global installation required):

```bash
npx @saga-ai/cli init
npx @saga-ai/cli implement <story-slug>
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

**Note:** Requires `SAGA_PLUGIN_ROOT` environment variable to be set. This is automatically configured when running via the SAGA plugin.

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
