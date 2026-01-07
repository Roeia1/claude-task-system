# Technical Plan: Task Implementation Orchestration

**Feature**: [007-task-implementation-orchestration](./feature.md)
**Created**: 2026-01-07
**Status**: Draft

## Executive Summary

Build an autonomous task execution system where the main Claude agent orchestrates work by running a background Python script that spawns worker Claude instances (`claude -p`) in a loop. Workers read task.json, implement objectives with TDD, and report status via JSON. The loop continues until all objectives complete (FINISH) or human input is needed (BLOCKED).

## Technical Approach

- **Architectural Pattern**: Orchestrator-worker pattern with state machine
- **Integration Points**: Claude CLI (`claude -p`), existing git worktree structure, task-builder agent
- **Development Strategy**: Incremental - foundation first, then script, then commands, then integration

## System Architecture

### Components

1. **Implement Command** (`plugin/commands/implement.md`)
   - **Purpose**: Entry point for starting/resuming task implementation
   - **Responsibilities**: Parse identifier, resolve to task, validate context, spawn background script
   - **Interfaces**: User-facing slash command, interacts with Python script

2. **Implementation Script** (`plugin/scripts/implement.py`)
   - **Purpose**: Orchestration engine that spawns workers in a loop
   - **Responsibilities**: Build worker prompts, spawn `claude -p`, parse JSON output, enforce limits
   - **Interfaces**: CLI arguments, reads task files, writes stdout for main agent

3. **Worker Prompt Template** (`plugin/instructions/orchestration/worker-prompt.md`)
   - **Purpose**: Instructions injected into each worker spawn
   - **Responsibilities**: Define session startup, implementation workflow, exit protocol
   - **Interfaces**: Template that script reads and injects into `claude -p`

4. **Resolve Command** (`plugin/commands/resolve.md`)
   - **Purpose**: Human-assisted blocker resolution
   - **Responsibilities**: Read blocker from journal.md, propose solutions, append resolution to journal.md
   - **Interfaces**: User-facing slash command, runs from worktree context

5. **Task Builder Integration** (existing, modified)
   - **Purpose**: Generate task.json instead of task.md
   - **Responsibilities**: Distill feature/plan/ADRs into self-contained task.json
   - **Interfaces**: Reads feature files, writes task.json

### Component Diagram

```
                          ┌─────────────────────────┐
                          │       Human User        │
                          └───────────┬─────────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
             ▼                        │                        ▼
┌────────────────────┐                │          ┌────────────────────┐
│  /implement <id>   │                │          │    /resolve        │
│  (from main repo)  │                │          │ (from worktree)    │
└─────────┬──────────┘                │          └─────────┬──────────┘
          │                           │                    │
          ▼                           │                    ▼
┌────────────────────┐                │          ┌────────────────────┐
│  Identifier        │                │          │  Main Agent        │
│  Resolver          │                │          │  (codebase access) │
├────────────────────┤                │          ├────────────────────┤
│ • Task ID lookup   │                │          │ • Read journal.md  │
│ • Task name search │                │          │ • Find blocker     │
│ • Feature→Task     │                │          │ • Propose solution │
└─────────┬──────────┘                │          │ • Append resolution│
          │                           │          └─────────┬──────────┘
          ▼                           │                    │
┌────────────────────┐                │                    ▼
│  implement.py      │                │          ┌────────────────────┐
│  (background)      │◄───────────────┘          │  journal.md        │
├────────────────────┤                           │  (resolution added)│
│ • Build prompts    │                           └────────────────────┘
│ • Spawn workers    │
│ • Parse JSON out   │
│ • Enforce limits   │
└─────────┬──────────┘
          │
          │  Loop until FINISH/BLOCKED
          ▼
┌────────────────────┐       ┌────────────────────┐
│  claude -p         │◄─────►│  Task Worktree     │
│  (Worker Instance) │       ├────────────────────┤
├────────────────────┤       │ • task.json        │
│ • Read task state  │       │ • journal.md       │
│ • Select objective │       │ • [project files]  │
│ • Write tests      │       └────────────────────┘
│ • Implement code   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  JSON Status       │
│  (stdout)          │
├────────────────────┤
│ ONGOING → re-spawn │
│ FINISH → done      │
│ BLOCKED → exit     │
└────────────────────┘
```

### Data Flow

1. Human runs `/implement 015` from main repo
2. Command resolves identifier → finds task worktree
3. Validates task.json exists, worktree is valid
4. Spawns `implement.py` in background with task path
5. Script builds prompt: task.json + journal.md + worker instructions
6. Spawns `claude -p --json-schema ...`
7. Worker reads files, selects objective, implements with TDD
8. Worker outputs JSON status to stdout
9. Script parses status:
   - ONGOING → increment cycle, re-spawn
   - FINISH → exit with success summary
   - BLOCKED → exit with blocker details
10. Main agent receives final status, reports to human
11. If BLOCKED: human navigates to worktree, runs `/resolve`
12. Main agent reads blocker from journal.md, proposes solution, appends resolution to journal.md
13. Human runs `/implement 015` again to resume

## Technology Choices

### Core Technologies

| Technology | Choice | Rationale |
|------------|--------|-----------|
| **Script Language** | Python 3.x | Better for complex orchestration logic (loops, JSON parsing, subprocess management) than bash |
| **CLI Integration** | `claude -p` | Native Claude Code CLI with `--json-schema` for validated output |
| **State Format** | JSON | Machine-readable task.json; schema-validated worker output |
| **State Persistence** | Git | Commits preserve recoverable state; existing worktree structure |
| **Process Management** | Python `subprocess` | Standard library; spawn claude CLI, capture stdout |

### Libraries & Dependencies

| Library | Purpose | Version | Rationale |
|---------|---------|---------|-----------|
| `subprocess` | Spawn claude CLI | stdlib | No external deps needed for process management |
| `json` | Parse task.json, worker output | stdlib | Standard JSON handling |
| `argparse` | CLI argument parsing | stdlib | Standard CLI interface |
| `pathlib` | Path manipulation | stdlib | Cross-platform path handling (Windows/Unix) |
| `time` | Timing for max_time limit | stdlib | Track execution duration |
| `typing` | Type hints | stdlib | Code clarity and IDE support |

### File Locations

| Component | Location | Format |
|-----------|----------|--------|
| Implement command | `plugin/commands/implement.md` | Markdown (skill trigger) |
| Resolve command | `plugin/commands/resolve.md` | Markdown (skill trigger) |
| Implementation script | `plugin/scripts/implement.py` | Python |
| Worker prompt | `plugin/instructions/orchestration/worker-prompt.md` | Markdown template |
| Task definition | `task-system/task-{id}/task.json` | JSON |
| Journal | `task-system/task-{id}/journal.md` | Markdown (includes blockers and resolutions) |

## Data Models

### Entity: task.json

The core task state machine that workers read and update:

```json
{
  "meta": {
    "id": "string (task ID, e.g., '015')",
    "title": "string (human-readable task title)",
    "type": "enum: feature | bugfix | refactor | performance | deployment",
    "priority": "enum: P1 | P2 | P3",
    "created": "string (ISO date: YYYY-MM-DD)",
    "feature": "string (optional: feature ID, e.g., '007')"
  },

  "overview": "string (distilled context from feature/plan/ADRs)",

  "objectives": [
    {
      "id": "string (unique within task, e.g., 'obj-1')",
      "description": "string (required: what needs to be done)",
      "steps": ["string (optional: ordered implementation steps)"],
      "notes": ["string (optional: hints, constraints, context)"],
      "status": "enum: pending | in_progress | done"
    }
  ]
}
```

### Entity: Worker Output (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["ONGOING", "FINISH", "BLOCKED"]
    },
    "summary": {
      "type": "string",
      "description": "What was accomplished this session"
    },
    "blocker": {
      "type": ["string", "null"],
      "description": "Brief description if BLOCKED, null otherwise"
    }
  },
  "required": ["status", "summary"]
}
```

### Entity: journal.md

Append-only log with consistent entry structure. Contains regular progress entries, blocker entries, and resolution entries:

```markdown
# Task Journal

---

## Entry: [ISO timestamp]

**Objective:** [obj-id] - [description]
**Status at exit:** [in_progress | done]

### What Was Done

- [Bullet points of actions taken]
- [Decisions made and why]
- [Progress achieved]

### Commits

- `[hash]` [commit message]

### Notes

[Context for next session or observations]

---

## Blocker: [Brief title]

**Objective**: [Which objective is blocked]
**What I'm trying to do**: [Description]
**What I tried**: [Approaches attempted and why they didn't work]
**What I need**: [Specific decision or information required]
**Suggested options**: [If you have ideas, list them with pros/cons]

---

## Resolution: [Reference to blocker title]

**Decision**: [Clear statement of the chosen approach]
**Implementation guidance**: [Specific steps or guidance for the worker]
**Rationale**: [Why this approach was chosen over alternatives]
**Approved**: [ISO timestamp]

---
```

## API Contracts

### Command: `/implement <identifier>`

**Purpose:** Start or resume autonomous task implementation

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `identifier` | Yes | Task ID (`015`), task name (`user-auth`), or feature name (`007-user-auth`) |

**Identifier Resolution:**
1. Try exact match as task ID in `task-system/tasks/{identifier}/`
2. Try match as task name (search task.json meta.title)
3. Try match as feature name → prompt user to select task

**Error Responses:**
- Identifier not found: "No task found for '{identifier}'. Available tasks: ..."
- Worktree missing: "Task {id} worktree not found. Run task-resume first."
- task.json missing: "task.json not found in task {id}."
- Already blocked: "Task {id} is BLOCKED. Navigate to worktree and run /resolve."

### Command: `/resolve`

**Purpose:** Analyze blocker from journal.md and append resolution with human approval

**Arguments:** None (context derived from current directory)

**Prerequisites:**
- Must run from within task worktree
- Unresolved blocker must exist in journal.md

**Error Responses:**
- Not in worktree: "Must run /resolve from within a task worktree"
- No blocker: "No unresolved blocker found in journal.md. Task is not blocked."
- Already resolved: "Blocker already has a resolution in journal.md. Run /implement to resume."

### Script: `implement.py`

```
usage: implement.py [-h] [--max-cycles N] [--max-time MINUTES]
                    [--model MODEL] [--mcp-config PATH] [--tools TOOLS]
                    task_path

positional arguments:
  task_path             Path to task worktree

optional arguments:
  --max-cycles N        Maximum worker spawns (default: 10)
  --max-time MINUTES    Maximum execution time (default: 60)
  --model MODEL         Model for workers (default: sonnet)
  --mcp-config PATH     Path to MCP server config
  --tools TOOLS         Comma-separated allowed tools
```

**Output (JSON):**
```json
{
  "status": "FINISH | BLOCKED | TIMEOUT | MAX_CYCLES",
  "summary": "Final summary of all work done",
  "cycles": 5,
  "elapsed_minutes": 23,
  "blocker": null
}
```

## Implementation Strategy

### Phase 1: Foundation - Worker Prompt & Data Structures

**Tasks:**
1. Create worker prompt template (`plugin/instructions/orchestration/worker-prompt.md`)
2. Create task.json schema documentation
3. Create journal entry template/guidelines

**Success Criteria:**
- Worker prompt template complete and reviewed
- task.json schema documented with examples
- Journal entry format documented

### Phase 2: Core - Implementation Script

**Tasks:**
1. Create `plugin/scripts/implement.py` with CLI, prompt building, spawning, parsing
2. Add helper functions for task discovery and worker management

**Dependencies:** Phase 1

**Success Criteria:**
- Script runs standalone
- Successfully spawns claude -p with correct arguments
- Parses JSON output correctly
- Respects limits, returns structured result

### Phase 3: Commands - /implement and /resolve

**Tasks:**
1. Create `/implement` command with identifier resolution
2. Create `/resolve` command with resolution workflow
3. Create INSTRUCTIONS.md and SKILL.md files

**Dependencies:** Phase 2

**Success Criteria:**
- Commands work end-to-end
- Identifier resolution handles all formats
- Resolution workflow appends valid resolution to journal.md

### Phase 4: Task Builder Integration

**Tasks:**
1. Create task.json template
2. Modify task-builder to generate task.json instead of task.md
3. Update related files referencing task.md

**Dependencies:** Phase 1

**Success Criteria:**
- Task builder generates valid task.json
- Objectives properly structured
- Context distilled (worker doesn't need feature files)

### Phase 5: Polish - Integration & Documentation

**Tasks:**
1. End-to-end testing (happy path and blocker flow)
2. Update CLAUDE.md documentation
3. Migration notes for existing tasks

**Dependencies:** Phases 1-4

**Success Criteria:**
- Complete flows work end-to-end
- Documentation updated
- No breaking changes

### Parallelization

Phases 2 and 4 can be developed in parallel after Phase 1.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|-----------|--------|---------------------|
| Worker context exhaustion before commit | Medium | High | Worker prompt emphasizes early commits; self-monitoring instructions |
| JSON schema validation failures | Low | Medium | Test schema with claude CLI upfront; handle parsing errors gracefully |
| Cross-platform path issues (Windows/Unix) | Medium | Medium | Use `pathlib.Path` throughout; test on both platforms |
| Worker gets stuck in infinite loop | Low | High | `--max-turns 50` limits worker; script enforces max_cycles and max_time |
| Blocker.md format inconsistent | Medium | Low | Provide clear template in worker prompt; resolution workflow handles variations |
| Task builder distillation loses context | Medium | High | Review generated task.json during task generation; human approves |
| Git conflicts from concurrent workers | Low | Medium | Single worker at a time (sequential spawning); commits are atomic |
| Claude CLI API changes | Low | Medium | Pin to known CLI version; isolate CLI interaction in single function |

## Dependencies

### External Services
- **Claude CLI**: `claude -p` with `--json-schema` flag

### Internal Dependencies
- **Task Builder Agent**: Modified to generate task.json
- **Git Worktree Structure**: Existing infrastructure reused
- **Feature/Plan/ADR Documents**: Read by task builder (not workers)

## Open Questions

All resolved - see feature.md for decision rationale.

## Architecture Decisions

No ADRs created for this feature.

## Future Considerations

- **Parallel worker spawning**: Run multiple workers on independent objectives
- **Progress streaming**: Real-time progress updates during execution
- **Retry logic**: Automatic retry on transient failures
- **Worker specialization**: Different worker prompts for different task types

---

**Note**: This document describes HOW to build the feature. It should be reviewed and approved before generating tasks.
