# @saga-ai/dashboard

Dashboard and session monitoring for SAGA (Structured Autonomous Goal Achievement) - a structured development workflow that combines human-guided epic planning with autonomous story execution.

## Requirements

- Node.js >= 18.0.0

## Usage

Run commands using npx (no global installation required):

```bash
npx @saga-ai/dashboard start
npx @saga-ai/dashboard sessions list
npx @saga-ai/dashboard sessions status <name>
npx @saga-ai/dashboard sessions logs <name>
```

## Commands

### `saga start`

Start the SAGA dashboard server for viewing epics, stories, and progress.

```bash
saga start
saga start --port 8080
saga start --path /path/to/project
```

Options:
- `--port <n>` - Port to run the server on (default: 3847)

### `saga sessions`

Monitor tmux sessions created by SAGA worker runs.

```bash
saga sessions list              # List all SAGA sessions
saga sessions status <name>     # Check if session is running
saga sessions logs <name>       # Stream session output
```

Subcommands:
- `list` - Returns JSON array of all SAGA sessions with name, status, and output file
- `status <name>` - Returns JSON with session status details
- `logs <name>` - Streams the session output file via `tail -f`

## Global Options

- `-p, --path <dir>` - Path to SAGA project directory (overrides auto-discovery)
- `-V, --version` - Output the version number
- `-h, --help` - Display help for command

## Project Discovery

The CLI automatically discovers SAGA projects by looking for a `.saga/` directory in the current directory or any parent directory. Use `--path` to override this behavior.

## License

MIT
