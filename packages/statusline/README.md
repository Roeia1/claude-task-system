# @claude-task-system/statusline

A powerline-style statusline for [Claude Code](https://claude.ai/code) that displays **task system context** - always know which task you're working on, its type, linked feature, and project-wide task/feature counts.

Inspired by [claude-powerline](https://github.com/Owloops/claude-powerline). Can be used standalone or combined with other statusline tools.

## What It Shows

```
 🌿  ✨ Implement User Auth (Authentication)  🔄 2 ⏸️ 1 ☁️ 3 | ⭐ 1 📝 2
└──┘ └────────────────────────────────────────┘ └─────────────────────────┘
  │              Task Info Segment                    Counts Segment
  │
Origin Segment
```

**Full output example (in a task worktree):**
```
🌿 ✨ Add dark mode toggle (UI Redesign) 🔄 1 ⏸️ 2 ☁️ 0 | ⭐ 2 📝 1
```

**In main repository:**
```
🏠 🔄 1 ⏸️ 2 ☁️ 3 | ⭐ 2 📝 1
```

## Segments

### Origin Segment

Shows whether you're in the main repository or a task worktree.

| Context | Unicode | ASCII | Color |
|---------|---------|-------|-------|
| Main repo | `🏠` | `[M]` | Blue |
| Task worktree | `🌿` | `[W]` | Cyan |

### Task Info Segment

Displays detailed information about the current task (only shown in worktrees).

**Components:**
- **Task Type Icon** - Visual indicator of task category
- **Task Title** - Extracted from `task.md` (truncated to 30 chars)
- **Feature Name** - Linked feature name in parentheses (truncated to 20 chars)

| Task Type | Unicode | ASCII |
|-----------|---------|-------|
| feature | `✨` | `[F]` |
| bugfix | `🐛` | `[B]` |
| refactor | `♻️` | `[R]` |
| performance | `⚡` | `[P]` |
| deployment | `🚀` | `[D]` |
| other | `📝` | `[T]` |

**Example:** `✨ Implement User Auth (Authentication System)`

### Counts Segment

Shows project-wide task and feature statistics.

**Task Counts** (scans `task-system/tasks/` and git branches):

| Status | Unicode | ASCII | Description |
|--------|---------|-------|-------------|
| In Progress | `🔄` | `I:` | Tasks with `journal.md` present |
| Pending | `⏸️` | `P:` | Tasks without `journal.md` |
| Remote | `☁️` | `R:` | Remote branches without local worktrees |

**Feature Counts** (scans `task-system/features/`):

| Status | Unicode | ASCII | Description |
|--------|---------|-------|-------------|
| Active | `⭐` | `A:` | Features with status "In Progress" |
| Draft | `📝` | `D:` | Features with status "Draft" or "Planned" |

**Example:** `🔄 2 ⏸️ 1 ☁️ 3 | ⭐ 1 📝 2` (2 in-progress, 1 pending, 3 remote tasks; 1 active, 2 draft features)

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

### Global Install

```bash
npm install -g @claude-task-system/statusline
```

Then configure:

```json
{
  "statusLine": {
    "type": "command",
    "command": "task-status"
  }
}
```

### Standalone Script

```bash
curl -o task-status https://raw.githubusercontent.com/Roeia1/claude-task-system/main/packages/statusline/scripts/claude-task-system-statusline.sh
chmod +x task-status
./task-status
```

## Combining with Other Statusline Tools

This package reads from environment variables, not Claude's stdout. This makes it easy to combine with other statusline tools that do process Claude's output.

**General pattern:** Run stdout-dependent tools first, then this package last:

```bash
<other-statusline-tool>; npx -y @claude-task-system/statusline
```

Each command's output appears on its own line in the statusline.

### Example: Combining with claude-powerline

[claude-powerline](https://github.com/Owloops/claude-powerline) displays git info, usage costs, and session metrics. Combine them like this:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y @owloops/claude-powerline@latest 2>/dev/null; npx -y @claude-task-system/statusline"
  }
}
```

The `2>/dev/null` suppresses stderr from the first tool. claude-powerline runs first to capture Claude's stdout, then this package adds task context below it.

## Usage

```bash
task-status [OPTIONS]
```

### Options

| Flag | Description |
|------|-------------|
| `--help` | Show help message |
| `--no-icons` | Use ASCII instead of Unicode (no special fonts needed) |
| `--origin` | Show only the origin segment |
| `--task` | Show only the task info segment |
| `--counts` | Show only the counts segment |

Combine flags to show specific segments: `--origin --task` shows origin and task without counts.

### Examples

```bash
# Full output (all segments)
task-status
# Output: 🌿 ✨ Implement Auth (User System) 🔄 1 ⏸️ 2 ☁️ 0 | ⭐ 1 📝 1

# ASCII mode
task-status --no-icons
# Output: [W] [F] Implement Auth (User System) I:1 P:2 R:0 | A:1 D:1

# Origin only
task-status --origin
# Output: 🌿

# Task info only
task-status --task
# Output: ✨ Implement Auth (User System)

# Counts only
task-status --counts
# Output: 🔄 1 ⏸️ 2 ☁️ 0 | ⭐ 1 📝 1

# Origin and counts (skip task info)
task-status --origin --counts
# Output: 🌿 🔄 1 ⏸️ 2 ☁️ 0 | ⭐ 1 📝 1
```

## Environment Variables

The script reads context from `CLAUDE_ENV_FILE` or directly from environment:

| Variable | Description |
|----------|-------------|
| `CLAUDE_ENV_FILE` | Path to file containing environment variables |
| `TASK_CONTEXT` | `"main"` or `"worktree"` |
| `CURRENT_TASK_ID` | Current task ID (e.g., `"042"`) |
| `CLAUDE_SPAWN_DIR` | Directory to scan for task-system structure |

**Auto-detection:** If variables aren't set, the script auto-detects context by scanning for `task-system/task-NNN/` directories.

## How It Works

1. **Loads context** from `$CLAUDE_ENV_FILE` or environment variables
2. **Auto-detects** worktree context if not explicitly set
3. **Parses task.md** to extract title, type, and linked feature
4. **Parses feature.md** to resolve feature names
5. **Scans directories** to count tasks by status
6. **Queries git** for remote task branches
7. **Outputs formatted segments** with powerline styling and ANSI colors

**Performance:** Designed to complete in <100ms. File parsing is minimal (reads only necessary lines).

## Requirements

- Bash 4.0+
- Node.js 18+ (for npx installation)
- Git 2.0+ (for remote task counting)
- Optional: Nerd Font for powerline separators and Unicode icons

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Invalid arguments |

## Part of Claude Task System

This statusline is part of the [Claude Task System](https://github.com/Roeia1/claude-task-system) - a structured development workflow for Claude Code featuring:

- Feature definition and technical planning
- Task breakdown with git worktrees for parallel execution
- Phased task execution with journaling
- Architecture decision records (ADRs)

## License

MIT
