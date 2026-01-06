# Feature: Task Implementation Orchestration

**Created:** 2026-01-06
**Status:** Draft
**Feature ID:** 007

## Overview

An autonomous task execution system where the main Claude agent orchestrates work by running a background Python script that spawns worker Claude instances (`claude -p`) in a loop. Each worker reads a `task.json` state machine, picks objectives to work on, implements with a test-per-objective approach, and reports status. The loop continues until all objectives are complete (FINISH) or human input is needed (BLOCKED).

## Motivation

The current task system requires continuous human presence - watching phases, granting permissions, guiding execution. For well-defined tasks, this is unnecessary overhead.

This orchestration system enables:

- Autonomous task execution with minimal human intervention
- Human-in-the-loop only when genuinely blocked
- Clear state machine representation of tasks
- Efficient multi-spawn execution with context preservation

## Architecture

```
Human runs: /implement <identifier>
    │
    ▼
Main Claude Agent
    │
    └─▶ Resolves identifier → runs background Python script for task
            │
            └─▶ Loop:
                  1. Build prompt (task.json + journal.md + worker instructions)
                  2. Spawn: claude -p --json-schema '{...}' ...
                  3. Parse status from stdout JSON
                  4. ONGOING → continue loop
                  5. FINISH/BLOCKED → exit loop
                        │
                        ▼
            Script returns ─▶ Main agent reads result
                                  │
                                  ├─▶ FINISH: Report completion
                                  └─▶ BLOCKED: Report blocker, await human command

Human navigates to worktree, starts new Claude session
    │
    ▼
Human runs: /resolve (only if BLOCKED)
    │
    ▼
Main Agent (in worktree context)
    │
    ├─▶ Reads blocker.md, explores codebase
    ├─▶ Proposes solution(s)
    └─▶ Human approves → resolution.md written

Human runs: /implement <identifier> (to resume, from main repo)
```

**Commands:**
- `/implement <identifier>` - Start or resume the implementation loop for a task (run from main repo)
- `/resolve` - Handle a blocker for a task (run from within task worktree)

**Identifier formats (for /implement):**
- Task ID: `015`, `42`
- Task name: `user-authentication`, `jwt-utils`
- Feature name: `001-user-auth` → prompts user to select task from feature


## Task Representation

Tasks are represented as a JSON state machine (`task.json`):

```json
{
  "meta": {
    "title": "Implement user authentication",
    "type": "feature",
    "priority": "P1",
    "created": "2026-01-06"
  },

  "overview": "Implement JWT-based authentication for the user management feature. Users need secure login/logout with token-based session management.",

  "objectives": [
    {
      "description": "JWT utility functions that sign and verify tokens",
      "notes": [
        "Use 15 min expiry for access tokens",
        "Include user ID and role in payload"
      ],
      "status": "pending"
    },
    {
      "description": "Login endpoint that validates credentials and returns tokens",
      "steps": [
        "Validate email/password input",
        "Check credentials against database",
        "Generate JWT tokens",
        "Set httpOnly cookie"
      ],
      "notes": ["Use bcrypt for password comparison"],
      "status": "pending"
    },
    {
      "description": "Logout endpoint that invalidates the session",
      "status": "pending"
    },
    {
      "description": "Auth middleware that protects routes",
      "steps": [
        "Extract token from cookie/header",
        "Verify token signature",
        "Attach user to request context"
      ],
      "notes": ["Return 401 for invalid/expired tokens"],
      "status": "pending"
    }
  ]
}
```

### Objective Structure

Each objective has a flat, flexible structure optimized for AI understanding:

```json
{
  "description": "Required - what needs to be done",
  "steps": ["Optional - ordered implementation steps"],
  "notes": ["Optional - hints, constraints, or context"],
  "status": "pending"
}
```

- **description** (required): Clear statement of what to accomplish
- **steps** (optional): Ordered list for procedural objectives (UI flows, multi-step processes)
- **notes** (optional): Implementation hints, constraints, or context the worker should know
- **status**: pending | in_progress | done

This allows objectives to be tailored to their domain - UI objectives can have detailed steps, backend objectives can have technical notes, simple objectives need only a description.

### Key Design Decisions

| Decision                         | Rationale                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Self-contained task.json         | Worker doesn't read feature/plan/ADR files; task builder distills all context |
| No execution/config in task.json | Runtime state and parameters belong to script, not task definition            |
| Schema-validated stdout          | Status via --json-schema flag; no status files needed                         |
| Worker self-monitors context     | No token counting; worker exits proactively when context feels long           |
| Flexible objective structure     | Different objectives need different context (steps vs notes)                  |
| No approach section              | Implementation details belong in objectives, not separate section             |
| Autonomous objective selection   | Agent picks based on task state and context, not array order                  |
| Continue in_progress objective   | Session continuity - pick up where last session left off                      |
| Read last commits at startup     | Context continuity even for completed work                                    |
| Complete objective before switch | Finish current objective before starting another (no mid-objective switching) |
| Multi-test per objective         | Write all failing tests that describe requirements, then implement            |
| No phases                        | Removed refactor/verification/reflection as separate phases                   |
| Commit + journal paired          | Always done together, not part of implementation flow                         |
| Blocker at execution level       | Simpler than per-objective blockers                                           |
| Run all tests                    | No per-objective test tracking needed                                         |
| Direct journal writes            | No subagent/skills - workers write journal.md directly (simpler, less context)|
| `blocked` objective status       | Clear state for objectives needing human input; enables resolution workflow   |
| File-based blocker/resolution    | blocker.md and resolution.md for clear, structured communication              |
| Main agent handles resolution    | No subagent - main agent executes `/resolve` with full codebase access        |
| Human-triggered resumption       | No auto-resume; human reviews resolution and triggers next run explicitly     |
| Flexible identifier resolution   | `/implement` accepts task ID, name, or feature; `/resolve` runs from worktree |

## Worker Behavior

The worker prompt (see Functional Requirements §4) instructs each spawned worker on:

1. **Session Startup**: Read task.json, journal.md, read last commits (for context continuity), run existing tests, select objective to work on
2. **Objective Selection**: If `in_progress` exists, continue it. Otherwise, autonomously select based on task state and context understanding (not array order).
3. **Implementation**: Test-first development - write failing tests that describe requirements, implement until all pass
4. **One-at-a-Time**: Complete current objective before selecting another. If blocked, exit with BLOCKED status rather than switching mid-objective.
5. **Context Awareness**: Self-monitor context usage, exit proactively before exhaustion
6. **Commit & Journal Discipline**: Always together - commit and journal update are paired operations (not part of implementation flow)
7. **Exit Protocol**: Update files, output schema-validated status JSON

The `--json-schema` flag shapes the worker's **final output**, not its task goal. The worker prompt clarifies this: "Your exit JSON is validated by schema - ensure it's valid."

## Task Status Values

Task status is derived from filesystem state and objective progress:

```
PENDING      → Worktree exists, no journal.md, all objectives pending
IN_PROGRESS  → journal.md exists, work in progress, no blocker
BLOCKED      → blocker.md exists, awaiting /resolve
COMPLETED    → All objectives done, PR merged
```

## Objective Status Values

```
pending      → Not started
in_progress  → Currently working on
blocked      → Stuck, needs human input (blocker.md created)
done         → Completed, tests pass
```

## Worker Exit Status Values

```
ONGOING  → Made progress, more objectives remain
FINISH   → All objectives done, tests pass
BLOCKED  → Need human decision (blocker field has details)
```

## User Stories

### Story 1: Autonomous Task Execution

**As a** developer with a well-defined task
**I want** the orchestrator to run until completion or blocker
**So that** I can work on other things while the task progresses

**Acceptance Criteria:**

- [ ] Main agent spawns background implementation script
- [ ] Worker reads task.json, journal.md, and last commits at startup
- [ ] Worker continues in_progress objective if one exists, otherwise selects based on context
- [ ] Worker writes all failing tests for an objective, then implements until all pass
- [ ] Worker completes current objective before starting another (no mid-switching)
- [ ] Worker commits and updates journal together (paired discipline)
- [ ] ONGOING triggers automatic re-spawn
- [ ] FINISH terminates with success summary
- [ ] BLOCKED terminates with blocker details (when worker can't proceed)

### Story 2: Human-in-the-Loop for Blockers

**As a** developer
**I want** the system to pause when human input is needed
**So that** I can make decisions and resume execution

**Acceptance Criteria:**

- [ ] Worker creates `blocker.md` with detailed description when stuck
- [ ] Worker marks objective as `blocked` in task.json
- [ ] Worker exits with BLOCKED status
- [ ] Implementation exits and reports blocker to human
- [ ] Human navigates to worktree, runs `/resolve` (main agent handles directly)
- [ ] Main agent has full codebase access for resolution
- [ ] Main agent proposes solution, human approves/modifies
- [ ] Resolution written to `resolution.md`
- [ ] Human runs `/implement <identifier>` again to resume
- [ ] Next worker reads resolution.md and continues blocked objective
- [ ] Journal captures blocker and resolution

### Story 3: Progress Preservation

**As a** developer
**I want** progress preserved across spawns and crashes
**So that** no work is lost

**Acceptance Criteria:**

- [ ] Worker commits before context exhaustion
- [ ] Commit and journal update always happen together (paired)
- [ ] task.json updated with objective statuses
- [ ] Last commits readable at next session startup for context continuity
- [ ] Git commits preserve recoverable state

### Story 4: Command-Driven Control

**As a** developer
**I want** explicit commands to control implementation and resolution
**So that** I have full control over when automation runs

**Acceptance Criteria:**

- [ ] `/implement <identifier>` accepts task ID, task name, or feature name
- [ ] `/implement` with feature name prompts user to select task from feature
- [ ] `/implement` validates task context before running (task.json exists, worktree valid)
- [ ] `/implement` can resume after BLOCKED (with resolution.md)
- [ ] `/resolve` validates it's running from a task worktree
- [ ] `/resolve` executed by main agent directly (no subagent)
- [ ] `/resolve` only available when blocker.md exists for the task
- [ ] Neither command auto-triggers the other

### Story 5: Configurable Execution

**As a** developer
**I want** to configure implementation parameters via script/CLI
**So that** I can control resource usage and tooling

**Acceptance Criteria:**

- [ ] Script accepts max_cycles parameter (default: 10)
- [ ] Script accepts max_time parameter (default: 60 min)
- [ ] Script accepts model parameter (default: sonnet)
- [ ] Script accepts mcp_config path for custom servers
- [ ] Script accepts tools list for custom tool access

## Blocker Resolution Workflow

When an implementation worker encounters a situation where it cannot proceed, it enters the blocker resolution workflow:

```
Human runs: /implement <identifier>
    │
    ▼
Command resolves identifier to task
(if feature name → prompt user to select task)
    │
    ▼
Implementation Script (background)
    │
    └─▶ Loop: spawn workers until FINISH or BLOCKED
            │
            ▼
Implementation Worker (encounters blocker)
    │
    ├─▶ Creates blocker.md with detailed description
    ├─▶ Marks objective as `blocked` in task.json
    ├─▶ Updates journal.md with context
    ├─▶ Commits and pushes all changes
    └─▶ Exits with BLOCKED status
            │
            ▼
Script exits, returns to Main Agent
    │
    └─▶ Reports: "BLOCKED - see blocker.md for details"
            │
            ▼
Human navigates to worktree, starts new Claude session
    │
    ▼
Human runs: /resolve
    │
    ▼
Main Agent (in worktree context)
    │
    ├─▶ Validates worktree and blocker.md exist
    ├─▶ Reads blocker.md, task.json, journal.md
    ├─▶ Explores codebase for context
    ├─▶ Analyzes root cause
    ├─▶ Proposes solution(s) to human
    │
    └─▶ Human reviews and approves/modifies
            │
            ▼
    Resolution written to resolution.md
            │
            ▼
Human runs: /implement <identifier> again (from main repo)
    │
    ▼
Next Worker spawns
    │
    ├─▶ Reads resolution.md at startup
    ├─▶ Applies resolution to blocked objective
    ├─▶ Marks objective back to `in_progress`
    ├─▶ Deletes blocker.md and resolution.md
    └─▶ Continues implementation
```

**Key principle**: Both implementation and resolution are explicit human commands. `/implement` runs from the main repo, `/resolve` runs from the task worktree. The main agent handles resolution directly (no subagent). Nothing runs automatically after BLOCKED - the human decides when to resolve and when to resume.


### Blocker File Structure (`blocker.md`)

```markdown
# Blocker Report

**Objective:** [Description of blocked objective]
**Created:** [timestamp]

## Problem Description

[Clear description of what's blocking progress]

## What I Tried

1. [Approach 1 and why it didn't work]
2. [Approach 2 and why it didn't work]

## What I Need

[Specific question or decision needed from human]

## Context

[Relevant code snippets, file locations, error messages]

## Suggested Options (if any)

1. [Option A with pros/cons]
2. [Option B with pros/cons]
```

### Resolution File Structure (`resolution.md`)

```markdown
# Resolution

**For Blocker:** [reference to original blocker]
**Approved:** [timestamp]
**Approved By:** [human/resolver]

## Decision

[Clear statement of the chosen approach]

## Implementation Guidance

[Specific steps or guidance for the implementation worker]

## Rationale

[Why this approach was chosen over alternatives]
```

### Resolution Behavior (Main Agent)

When the main agent executes `/resolve`:

1. **Reads context**: blocker.md, task.json, journal.md
2. **Explores codebase**: Full access to read files, understand architecture
3. **Analyzes root cause**: Determines why the worker got stuck
4. **Proposes solutions**: Offers one or more approaches with trade-offs
5. **Seeks approval**: Presents proposal to human for approval/modification
6. **Documents resolution**: Writes approved solution to resolution.md

The main agent does NOT:

- Implement the solution (that's the worker's job)
- Modify code files
- Make final decisions without human approval

### Worker Startup with Resolution

When a worker starts and finds `resolution.md`:

1. Read the resolution
2. Find the `blocked` objective in task.json
3. Mark it as `in_progress`
4. Apply the resolution guidance
5. Delete `blocker.md` and `resolution.md`
6. Continue normal implementation workflow

## Functional Requirements

### 1. Task File Generation

- Task builder creates task.json from feature/plan/ADRs
- **Distills** all context into overview and objectives (worker never reads source files)
- Objectives use flexible structure (description required, steps/notes optional)
- Generates minimal task.json: meta, overview, objectives only
- Replaces current task.md generation

### 2. Implementation Command

Command: `/implement <identifier>`
Location: `plugin/commands/implement.md`

Triggered explicitly by the human to start or resume task implementation.

**Arguments:**
- `<identifier>` - Required. Can be:
  - Task ID: `015`, `42`
  - Task name: `user-authentication`, `jwt-utils`
  - Feature name: `001-user-auth`, `user-auth`

**Identifier Resolution:**
1. Try to match as task ID in `task-system/tasks/<id>/`
2. Try to match as task name (search task.json files for matching title)
3. Try to match as feature name in `task-system/features/`
   - If feature found: list all tasks for that feature, prompt user to select
   - Show task status (PENDING, IN_PROGRESS, BLOCKED, COMPLETED) to help selection

**Behavior:**
- Resolves identifier to specific task worktree
- Validates task context (task.json exists, worktree is valid)
- Runs the implementation script in background
- Reports progress and final status to human
- On BLOCKED: displays blocker summary, suggests running `/resolve`

### 3. Implementation Script (Python)

Location: `plugin/scripts/implement.py`

- Accepts CLI parameters: max_cycles, max_time, model, mcp_config, tools
- Navigates to task worktree
- Manages execution state (cycle count, timing) internally
- Builds worker prompt from task.json + journal.md + instructions
- Spawns `claude -p` with --json-schema for validated output
- Parses status from stdout JSON after each spawn
- Enforces max_cycles and max_time limits
- Returns final status and summary

### 4. Worker Prompt

Location: `plugin/instructions/orchestration/worker-prompt.md`

The worker prompt is injected each spawn and contains:

````markdown
# Task Worker Instructions

You are a worker agent in a multi-session task execution system. Your context
will be refreshed between sessions - this is normal. Work autonomously until
you complete objectives or encounter a blocker.

## Session Startup

1. Read `task.json` to understand objectives and their status
2. Read `journal.md` to understand what previous sessions accomplished
3. Read last commits (`git log -5 --oneline`) for context continuity
4. **Check for `resolution.md`**:
   - If exists: read it, find the `blocked` objective, apply resolution guidance
   - Delete `blocker.md` and `resolution.md` after reading
5. Run existing tests to verify current state
6. Select objective to work on:
   - If any objective is `blocked` AND resolution exists: continue that one with resolution guidance
   - If any objective is `in_progress`: continue that one
   - Otherwise: pick based on task state and your context understanding (not array order)
   - Mark selected objective as `in_progress` in task.json

## Implementation Workflow

For your selected objective:

1. Write failing tests that describe all requirements the objective should achieve
   - Write as many tests as needed to fully specify the objective
   - All tests should fail initially (TDD red phase)
2. Implement until all tests pass
3. Run all tests to ensure no regressions
4. Mark objective as `done` in task.json
5. If context allows, select next objective and repeat

**Important**: Complete your current objective before starting another. If blocked
(unclear requirements, external dependency, design question):

1. Create `blocker.md` with detailed description:
   - What you're trying to do
   - What you tried and why it didn't work
   - What specific decision or information you need
   - Suggested options if you have any
2. Mark the objective as `blocked` in task.json
3. Update journal.md with context about the blocker
4. Commit and push all changes
5. Exit with BLOCKED status

The main agent will analyze your blocker (via `/resolve`), propose solutions,
and after human approval, write `resolution.md`. When you (or the next worker)
resume, you'll find `resolution.md` with the guidance to proceed.

## Commit & Journal Discipline

Commit and journal update are **paired operations** - always do them together:

- After completing an objective
- After making significant progress worth preserving
- Before exiting for any reason

### What Goes Where

**Commits** capture the CODE STATE:

- What files changed
- Brief description of the change
- Atomic, recoverable checkpoints
- Example: `feat(task-015): add JWT sign/verify utilities`

**Journal** captures the NARRATIVE CONTEXT:

- Why you made certain decisions
- What approach you tried and why
- What's working, what's not
- Where you got stuck (for blockers)
- Session summary for next worker
- Example: "Chose RS256 over HS256 for asymmetric key support. Tests passing for sign/verify. Next: integrate with login endpoint."

The next worker reads BOTH:

- Commits → see what code exists, what was done
- Journal → understand reasoning, context, current state

```bash
# Always together
git add . && git commit -m "feat(task-XXX): <description>" && git push
# Then immediately update journal.md with corresponding entry
```
````

Use commit format: `feat(task-XXX): <description>`

## Context Awareness

You have a limited context window. Be aware of these signals:

- If you've been working for a while and made significant progress
- If you're about to start something that might not fit in remaining context
- If you feel the conversation getting long

When approaching context limits:

- STOP and commit your current work (even if incomplete)
- Update task.json with current objective statuses
- Update journal.md with session summary
- Exit with ONGOING status

NEVER let uncommitted work be lost to context exhaustion.

## Exit Protocol

When you're ready to exit (objectives done, blocked, or context concerns):

1. Ensure all work is committed and pushed
2. Ensure journal.md is updated (paired with last commit)
3. Update task.json with final objective statuses
4. Output your final status as JSON:

{
"status": "ONGOING" | "FINISH" | "BLOCKED",
"summary": "what you accomplished this session",
"blocker": null or "description of what's blocking"
}

Exit conditions:

- ONGOING: Made progress, more objectives remain
- FINISH: All objectives done, all tests pass
- BLOCKED: Need human decision (unclear requirements, external dependency, etc.)

## Important Rules

- Select objectives based on task state and context, not array order
- Complete current objective before starting another (no mid-objective switching)
- Write all tests that describe an objective's requirements before implementing
- Commit + journal update always together
- If blocked: create blocker.md, mark objective as `blocked`, journal context, exit BLOCKED
- Check for resolution.md at startup - it contains guidance for blocked objectives
- Delete blocker.md and resolution.md after applying resolution
- Never remove or modify existing tests without explicit approval
- Leave the codebase in a clean, working state
- Your exit JSON is validated by schema - ensure it's valid

````

### 5. Resolve Command

Command: `/resolve`
Location: `plugin/commands/resolve.md`

Triggered explicitly by the human after implementation exits with BLOCKED status. Must be run from within the task's worktree directory.

**Prerequisites:**
- Human must navigate to the task worktree (`task-system/tasks/{id}/`)
- Start a new Claude Code session in that directory
- Run `/resolve` from there

**Inputs (read from current worktree):**
- `blocker.md` - the worker's detailed blocker report
- `task.json` - current task state and objectives
- `journal.md` - execution history and context
- Full codebase access (worktree contains complete project)

**Behavior:**
1. Validate running from a task worktree (check for `task-system/task-{id}/` structure)
2. Validate `blocker.md` exists
3. Read blocker.md, task.json, journal.md
4. Explore codebase to understand architecture and constraints
5. Analyze root cause of the blocker
6. Propose one or more solutions with trade-offs
7. Present proposal to human for approval/modification
8. Write approved solution to `resolution.md`

**Constraints:**
- Does NOT implement the solution (worker's job)
- Does NOT modify code files
- Does NOT make decisions without human approval
- Does NOT auto-trigger implementation (human runs `/implement` to resume)

**Output:**
- `resolution.md` written to task directory
- Summary presented to human

### 6. Status Communication

Worker output is validated against a JSON schema via `--json-schema` flag. No status file needed - script reads structured output directly from stdout.

**Status Schema:**
```json
{
  "type": "object",
  "properties": {
    "status": {"enum": ["ONGOING", "FINISH", "BLOCKED"]},
    "summary": {"type": "string"},
    "blocker": {"type": ["string", "null"]}
  },
  "required": ["status", "summary"]
}
````

**Example Output:**

```json
{
  "status": "ONGOING",
  "summary": "Completed JWT utility functions. 1/4 objectives done.",
  "blocker": null
}
```

### 7. CLI Integration

Spawn command with schema-validated output:

```bash
claude -p "worker prompt" \
  --max-turns 50 \
  --json-schema '{"type":"object","properties":{"status":{"enum":["ONGOING","FINISH","BLOCKED"]},"summary":{"type":"string"},"blocker":{"type":["string","null"]}},"required":["status","summary"]}'
```

Note: `--json-schema` implies JSON output format.

Optional flags:

- `--mcp-config ./mcp.json` - custom MCP servers
- `--fallback-model sonnet` - handle model overload

## Non-Functional Requirements

### Reliability

- Graceful crash handling
- State preserved via git commits
- Limits prevent runaway execution

### Observability

- Journal as execution history
- Cycle count and timing tracked
- Final summary of all work

## Migration Impact

### Deprecated

- `task.md` → replaced by `task.json`
- `feature-workflow.md` and other workflow files → embedded in worker prompt
- Phase-based execution → objective-based execution
- Permission gates → automatic progression
- Context file references → distilled into task.json by task builder
- Execution state in task file → managed by implementation script
- Journaling subagent + skills → workers write directly to `journal.md`

### Kept

- `journal.md` → detailed narrative log (but written directly by workers, not via subagent)
- Git worktree structure
- Feature/plan/ADR documents (read by task builder, not worker)

## Dependencies

- **Claude CLI**: `claude -p` with JSON output
- **Python 3.x**: Orchestration script
- **Git**: State preservation
- **Existing structure**: worktrees, features, plans

## Open Questions

- [x] Status communication: **Schema-validated stdout JSON (--json-schema)**
- [x] Default limits: **10 cycles, 60 minutes**
- [x] Script language: **Python**
- [x] Test approach: **Test-per-objective**
- [x] Phases: **Removed (objectives only)**
- [x] Interactive mode: **Deprecated**
- [x] Context exhaustion detection: **Worker self-awareness via prompt instructions** (worker monitors own context usage and exits proactively)
- [x] Worker prompt location: **`plugin/instructions/orchestration/worker-prompt.md`**
- [x] Blocker handling: **File-based (blocker.md/resolution.md) with `blocked` objective status**
- [x] Blocker resolution: **Main agent handles `/resolve` directly (no subagent), human approves solution**
- [x] Resumption after blocker: **Human-triggered (no auto-resume)**
- [x] Command interface: **`/implement <identifier>` from main repo; `/resolve` from task worktree (no identifier needed)**
- [x] Feature selection: **If feature name provided, prompt user to select task from feature**

## References

- [Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Claude CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Agent SDK Structured Outputs](https://platform.claude.com/docs/en/agent-sdk/structured-outputs)

---

**Note**: This document describes WHAT to build. Technical implementation details belong in plan.md.
