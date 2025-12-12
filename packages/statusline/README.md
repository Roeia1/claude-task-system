# @claude-task-system/statusline

Statusline integration script for Claude Task System - displays task context in terminal prompts.

## Installation

### Via npx (Recommended)

Run directly without installation:

```bash
npx @claude-task-system/statusline
```

### Via npm

Install globally:

```bash
npm install -g @claude-task-system/statusline
task-status
```

### Standalone Bash Script

Download and use the standalone script directly:

```bash
curl -o task-status https://raw.githubusercontent.com/Roeia1/claude-task-system/main/packages/statusline/scripts/claude-task-system-statusline.sh
chmod +x task-status
./task-status
```

## Usage

```bash
task-status [OPTIONS]
```

### Options

| Option | Description |
|--------|-------------|
| `--help` | Show help message and exit |
| `--no-icons` | Use ASCII characters instead of Unicode icons |
| `--origin` | Show only the origin indicator (main repo vs worktree) |
| `--task` | Show only the current task ID |
| `--counts` | Show only task counts |

If no section flags are specified, all sections are shown.

### Examples

```bash
# Show all sections with icons
task-status

# Show all sections with ASCII
task-status --no-icons

# Show only origin indicator
task-status --origin

# Show origin and task sections
task-status --origin --task
```

## Environment

The script reads context from `$CLAUDE_ENV_FILE` which should contain:

```bash
export TASK_CONTEXT="worktree"  # or "main"
export CURRENT_TASK_ID="042"
```

## Origin Indicators

| Context | Unicode | ASCII |
|---------|---------|-------|
| Main repo | ⎇ | [M] |
| Worktree | ⌂ | [W] |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Invalid arguments |

## License

MIT
