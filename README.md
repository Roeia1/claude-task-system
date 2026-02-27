# SAGA

[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-blueviolet)](https://claude.ai/code)
[![Version](https://img.shields.io/badge/version-4.8.0-blue)](CHANGELOG.md)
[![npm](https://img.shields.io/npm/v/@saga-ai/dashboard)](https://www.npmjs.com/package/@saga-ai/dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Skills](https://img.shields.io/badge/skills-5-green)](https://github.com/Roeia1/saga)
[![Scripts](https://img.shields.io/badge/scripts-deterministic-blue)](https://github.com/Roeia1/saga)

> **S**tructured **A**utonomous **G**oal **A**chievement - Transform epic ideas into shipped code through structured planning, autonomous execution, and continuous journaling.

A complete development lifecycle from collaborative planning through story breakdown and rigorous implementation. Plans become stories. Workers execute autonomously. Everything is documented.

```mermaid
flowchart LR
    A[📝 Epic] -->|VISION| B[📋 Stories]
    B -->|BREAKDOWN| C[⚡ Implement]
    C -->|TDD| D((✅))

    A -.- A1[epic.json]
    B -.- B1[story.json]
    C -.- C1[journal.md]
```

## Table of Contents

- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Key Features](#key-features)
- [Skills Reference](#skills-reference)
- [Workflow Examples](#workflow-examples)
- [Directory Structure](#directory-structure)
- [Non-Negotiable Rules](#non-negotiable-rules)
- [Plugin Architecture](#plugin-architecture)
- [CLI Package](#cli-package)
- [Requirements](#requirements)
- [Contributing](#contributing)

---

## Quick Start

### Installation

**Option 1: From GitHub (Latest)**

```bash
# Add the marketplace
/plugin marketplace add Roeia1/saga

# Install latest version
/plugin install saga@saga-core
```

**Option 2: Specific Version**

```bash
# Install a specific version
/plugin install saga@saga-core@1.0.0
```

**Option 3: Interactive**

```bash
# Browse and install via menu
/plugin
# Select "Browse Plugins" → find saga → install
```

See [CHANGELOG.md](CHANGELOG.md) for version history.

### Initialize Your Project

```bash
# Navigate to your project
cd your-project

# Start Claude Code
claude

# Initialize SAGA
> /init
```

This creates the `.saga/` directory structure:

```
.saga/
├── epics/        # Epic definitions (JSON)
├── stories/      # Story definitions, tasks, and journals
├── archive/      # Completed story archives
└── worktrees/    # Git worktrees for story isolation (gitignored)
```

### Your First Plan

```bash
# 1. Plan your work (collaborative discussion → stories)
> /plan user authentication with OAuth

# 2. Implement a story autonomously
> /execute-story login-flow

# 3. If blocked, resolve and continue
> /resolve-blocker login-flow
> /execute-story login-flow
```

---

## How It Works

### Development Lifecycle

| Phase | Focus | Output |
|-------|-------|--------|
| **Planning** | WHAT + HOW | Collaborative discussion → stories (standalone or epic-based) |
| **Story Execution** | DO the work | Tested, documented, reviewed code |

### Planning

Tell Claude what you want to build in natural language:

```
> /plan real-time notifications for order updates
```

Claude will:
- Explore the codebase for relevant context
- Collaborate with you through a deep discussion about goals, scope, approach, and tradeoffs
- Propose the right structure: a single story for cohesive goals, or an epic with multiple stories for larger goals
- Create stories with git branches, worktrees, and draft PRs

**Output**: Stories in `.saga/stories/` (and optionally `.saga/epics/` for multi-story plans)

### Story Execution

Stories are executed autonomously using the `/execute-story` command:

```
> /execute-story websocket-setup
```

The orchestrator spawns worker Claude instances that complete tasks incrementally. Workers exit with:
- **FINISH** - All tasks complete
- **BLOCKED** - Needs human decision (use `/resolve-blocker` to unblock)
- **TIMEOUT** - Max time exceeded

---

## Key Features

### Test-Driven Development (Non-Negotiable)

Tests are written **before** implementation. After test creation, they can only be modified with explicit user approval. This isn't optional—it's enforced.

### Continuous Journaling

Workers document progress throughout execution:
- Tasks completed and their outcomes
- Technical decisions and their reasoning
- Blockers and resolutions
- Key learnings and insights

**Output**: `journal.md` alongside each story

### Parallel Execution with Git Worktrees

Work on multiple stories simultaneously:

```
.saga/worktrees/
├── websocket-setup/    # Full project checkout
├── event-handlers/     # Full project checkout
└── ui-components/      # Full project checkout
```

Each worktree is isolated. Commit, push, and test independently.

### Dynamic Story Status

No manual status updates. Status is derived from filesystem and git state:

| Status | Signal |
|--------|--------|
| `PENDING` | Worktree exists, no `journal.md` |
| `IN_PROGRESS` | Worktree exists, `journal.md` present |
| `BLOCKED` | IN_PROGRESS with unresolved blocker in journal |
| `REMOTE` | Open PR, no local worktree |
| `COMPLETED` | PR merged, files archived |

---

## Skills Reference

All functionality is accessed through skills (slash commands):

| Skill | Command | Description |
|-------|---------|-------------|
| Initialize | `/init` | Create `.saga/` directory structure |
| Plan | `/plan <goal>` | Collaboratively plan a goal, then create stories |
| Execute Story | `/execute-story [story-slug]` | Execute story autonomously |
| Resolve Blocker | `/resolve-blocker [story-slug]` | Analyze and resolve blockers |
| List Sessions | `/list-sessions` | List all running SAGA sessions |

---

## Workflow Examples

### Complete Development Workflow

```bash
# Session 1: Plan and create stories
> /plan shopping cart with guest checkout
# Collaborate on goals, scope, architecture
# Approve proposed stories

# Session 2: Execute stories autonomously
> /execute-story cart-api
# Workers complete tasks, document in journal.md
# If blocked, use /resolve-blocker to provide resolution
# When complete, PR is ready for review and merge

> /execute-story checkout-flow
# Continue with next story
```

### Handling Blockers

```bash
# Worker exits with BLOCKED status
> /resolve-blocker cart-api
# Analyze blocker from journal.md
# Review proposed solutions
# Approve resolution

# Continue implementation
> /execute-story cart-api
```

---

## Directory Structure

```
your-project/
└── .saga/
    ├── epics/
    │   └── shopping-cart.json        # Epic definition (JSON)
    ├── stories/
    │   ├── cart-api/
    │   │   ├── story.json            # Story metadata (JSON)
    │   │   ├── task-1.json           # Individual task (JSON)
    │   │   ├── task-2.json
    │   │   └── journal.md            # Execution log
    │   └── checkout-flow/
    │       ├── story.json
    │       ├── task-1.json
    │       └── journal.md
    ├── archive/                       # Completed stories (tracked)
    │   └── shopping-cart/
    │       └── cart-api/
    │           └── story.json
    └── worktrees/                     # Git worktrees (gitignored)
        └── cart-api/                  # Full project checkout
```

---

## Non-Negotiable Rules

1. **Test-Driven Development** - Tests before implementation, always
2. **No Test Tampering** - Tests locked after creation without approval
3. **Continuous Journaling** - Every decision documented
4. **Commit Discipline** - Commit and push at logical milestones

---

## Git Commit Convention

```bash
# Story-based commits
git commit -m "test(cart-api): add shopping cart endpoint tests"
git commit -m "feat(cart-api): implement add-to-cart functionality"
git commit -m "fix(cart-api): handle empty cart edge case"
```

---

## Plugin Architecture

```
plugin/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── scripts/                   # Built scripts (from saga-utils)
│   └── create-story.js       # Deterministic story creation
├── skills/                    # Core skills
│   ├── init/                 # /init - Initialize structure
│   ├── plan/                 # /plan - Collaborative planning
│   ├── execute-story/        # /execute-story - Autonomous execution
│   ├── resolve-blocker/      # /resolve-blocker - Handle blockers
│   └── list-sessions/        # /list-sessions - List running sessions
├── hooks/
│   └── session-init.sh       # Session startup & context detection
└── docs/
    └── ENVIRONMENT.md        # Environment variable reference
```

---

## Dashboard Package

The `@saga-ai/dashboard` npm package provides a dashboard UI and session monitoring for SAGA workflows.

### Installation

```bash
# Run directly with npx (no install required)
npx @saga-ai/dashboard start

# Or install globally
npm install -g @saga-ai/dashboard
```

### Commands

| Command | Description |
|---------|-------------|
| `saga start` | Start HTTP server for dashboard UI |
| `saga sessions list` | List all SAGA tmux sessions |
| `saga sessions status <name>` | Show session status |
| `saga sessions logs <name>` | Stream session output |
| `saga help` | Display help information |

For full documentation, see [`packages/dashboard/README.md`](packages/dashboard/README.md).

---

## Requirements

- [Claude Code CLI](https://github.com/anthropics/claude-code) installed
- Git repository initialized
- GitHub CLI (`gh`) for PR operations

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow the existing code patterns
4. Submit a pull request

For maintainers: use `/publish` to release new versions.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Author

**Roei Avrahami** - [GitHub](https://github.com/Roeia1)

---

<p align="center">
  <b>Stop the chaos. Ship with discipline.</b>
  <br><br>
  <a href="https://github.com/Roeia1/saga">GitHub</a> ·
  <a href="https://github.com/Roeia1/saga/issues">Issues</a>
</p>
