# @claude-task-system/statusline

A lightweight statusline script for [Claude Code](https://claude.ai/code) that displays **task system context** in your terminal prompt. Always know which task you're working on and whether you're in a worktree or main repo.

Inspired by [claude-powerline](https://github.com/Owloops/claude-powerline) - can be used standalone or combined with other statusline tools.

## What It Shows

```
⌂ 015                   # In task worktree 015
⎇                       # In main repository
⌂ 042                   # In task worktree 042
```

| Context | Unicode | ASCII |
|---------|---------|-------|
| Main repo | `⎇` | `[M]` |
| Task worktree | `⌂` | `[W]` |

## Installation

### Quick Start (Recommended)

Add to your Claude Code `settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y @claude-task-system/statusline@latest"
  }
}
```

The `npx -y` command automatically downloads and runs the latest version.

### Global Install

```bash
npm install -g @claude-task-system/statusline
```

Then configure Claude Code:

```json
{
  "statusLine": {
    "type": "command",
    "command": "task-status"
  }
}
```

### Standalone Script

Download and use directly:

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

| Flag | Description |
|------|-------------|
| `--help` | Show help message |
| `--no-icons` | Use ASCII instead of Unicode (`[M]`/`[W]` instead of `⎇`/`⌂`) |
| `--origin` | Show only the origin indicator |
| `--task` | Show only the current task ID |
| `--counts` | Show only task counts (coming soon) |

### Examples

```bash
# Full output with icons
task-status
# Output: ⌂ 015

# ASCII mode (no special fonts needed)
task-status --no-icons
# Output: [W] 015

# Just the origin indicator
task-status --origin
# Output: ⌂

# Origin and task only
task-status --origin --task
# Output: ⌂ 015
```

## Combining with claude-powerline

Chain multiple statusline tools together:

```json
{
  "statusLine": {
    "type": "command",
    "command": "echo \"$(npx -y @claude-task-system/statusline) | $(npx -y @owloops/claude-powerline --style=minimal)\""
  }
}
```

Output: `⌂ 015 | main ✓ | $0.42`

## Environment Variables

The script reads context from a file specified by `CLAUDE_ENV_FILE`:

```bash
# Example: ~/.claude/env
export TASK_CONTEXT="worktree"    # or "main"
export CURRENT_TASK_ID="015"
```

These variables are typically set automatically by the Claude Task System when you start or navigate to a task.

## Requirements

- Bash 4.0+
- Node.js 18+ (for npx installation)
- Optional: Nerd Font for Unicode icons (use `--no-icons` for ASCII fallback)

## How It Works

1. Reads environment variables from `$CLAUDE_ENV_FILE`
2. Detects if you're in a task worktree or main repository
3. Outputs formatted status for your terminal prompt

The script is designed to be fast (<50ms) and composable with other statusline tools.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Invalid arguments |

## Part of Claude Task System

This statusline is part of the [Claude Task System](https://github.com/Roeia1/claude-task-system) - a structured development workflow for Claude Code that provides:

- Feature definition and planning workflows
- Task breakdown and parallel execution via git worktrees
- Phased task execution with journaling
- Architecture decision records (ADRs)

## License

MIT
