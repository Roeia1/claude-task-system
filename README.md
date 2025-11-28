# Claude Task System

A structured development workflow plugin for [Claude Code](https://claude.ai/code) that combines human-guided feature planning with disciplined task execution. The system provides a complete lifecycle from feature ideation through planning, task breakdown, and rigorous 8-phase execution.

## Features

- **Three-Phase Development Lifecycle**: Feature Definition → Technical Planning → Task Execution
- **8-Phase Task Execution Discipline**: Structured workflow with test-driven development (TDD)
- **Architecture Decision Records (ADRs)**: Document technical decisions and their rationale
- **Continuous Journaling**: Subagent documents decisions and learnings throughout execution
- **Parallel Task Execution**: Work on multiple tasks concurrently using git worktrees
- **Type-Specific Workflows**: Specialized workflows for features, bugfixes, refactors, performance, and deployment

## Installation

Install the plugin in your Claude Code project:

```bash
claude mcp add-plugin claude-task-system --from github:Roeia1/claude-task-system
```

Or add it manually to your `.claude/plugins.json`:

```json
{
  "plugins": [
    {
      "name": "claude-task-system",
      "source": {
        "source": "github",
        "repo": "Roeia1/claude-task-system"
      }
    }
  ]
}
```

## Quick Start

### 1. Initialize Project Documentation

```bash
/project:init
```

Creates the `docs/` structure with templates for coding standards, architecture principles, quality gates, and tech stack documentation.

### 2. Define a Feature

```bash
/project:define-feature "user authentication system"
```

Creates a feature definition capturing WHAT to build: user stories, requirements, and acceptance criteria.

### 3. Create Technical Plan

```bash
/project:plan-feature
```

Designs HOW to build the feature: architecture, data models, API contracts, and implementation strategy.

### 4. Generate Tasks

```bash
/project:generate-tasks
```

Breaks the plan into individual tasks with dependencies, priorities, and acceptance criteria.

### 5. Execute Tasks

Say "start task" or "work on task [ID]" to begin execution. Each task follows the 8-phase discipline:

1. **Task Analysis** - Understand requirements and dependencies
2. **Solution Design** - Plan technical approach
3. **Test Creation (TDD)** - Write tests before implementation
4. **Implementation** - Build functionality to pass tests
5. **Refactor** - Improve code quality
6. **Verification** - Validate acceptance criteria
7. **Reflection** - Document learnings
8. **Completion** - Merge PR and finalize

## Commands Reference

| Command | Description |
|---------|-------------|
| `/project:init` | Initialize project documentation structure |
| `/project:define-feature` | Create a new feature definition |
| `/project:plan-feature` | Create technical plan for a feature |
| `/project:generate-tasks` | Generate tasks from a feature plan |
| `/project:adr` | Create an Architecture Decision Record |
| `/project:new-task` | Create a standalone task |
| `/project:complete-task` | Finalize and merge a task |
| `/project:parallel-start-task` | Start a task in a git worktree |
| `/project:parallel-finalize-task` | Complete a parallel task |
| `/project:parallel-cleanup-worktree` | Clean up a worktree |
| `/project:worktree-maintenance` | Manage stale worktrees |

## Directory Structure

When the plugin is active, your project uses this structure:

```
docs/                           # Project documentation
├── coding-standards.md
├── architecture-principles.md
├── quality-gates.md
├── tech-stack.md
└── adr/                       # Architecture Decision Records

planning/                       # Feature planning
└── features/
    └── 001-feature-name/
        ├── feature.md         # What to build
        ├── plan.md            # How to build
        ├── tasks.md           # Task breakdown
        └── adr/               # Feature-specific ADRs

execution/                      # Task execution
├── TASK-LIST.md               # Single source of truth
└── tasks/###/
    ├── task.md                # Task definition
    └── journal.md             # Execution log
```

## Workflow Types

The system includes specialized workflows for different task types:

| Type | Use Case |
|------|----------|
| **feature** | Building new functionality or capabilities |
| **bugfix** | Fixing errors or incorrect behavior |
| **refactor** | Improving code quality without changing behavior |
| **performance** | Optimizing speed, memory, or resources |
| **deployment** | Infrastructure and deployment tasks |

## Key Principles

- **Test-Driven Development**: Tests are written before implementation (non-negotiable)
- **Phase Progression**: Each phase requires explicit permission to proceed
- **Human-Guided**: Every phase requires human review and approval
- **Document Decisions**: Use ADRs to capture architectural reasoning
- **Continuous Journaling**: Document decisions and insights throughout

## Parallel Execution

For concurrent task development, use git worktrees:

```bash
# Start a task in a worktree
/project:parallel-start-task [ID]

# Work in the worktree directory
# ...

# Complete the parallel task
/project:parallel-finalize-task [ID]

# Clean up from main repo
/project:parallel-cleanup-worktree [ID]
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Roei Avrahami

## Contributing

Contributions are welcome! Please ensure any changes follow the project's coding standards and include appropriate tests.
