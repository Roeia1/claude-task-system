# SAGA Skill System

This document describes how SAGA skills work end-to-end, from discovery and loading through task execution, argument substitution, and hook lifecycle.

## Overview

SAGA skills are Claude Code plugin skills defined as `SKILL.md` files. Each skill is a markdown document with YAML frontmatter that tells Claude Code how to discover, configure, and execute the skill. Skills are the primary user interface for SAGA workflows.

**Skill directory**: `plugin/skills/<skill-name>/SKILL.md`

## SKILL.md Frontmatter Format

Every skill begins with a YAML frontmatter block delimited by `---`. The supported fields are:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Skill identifier. Becomes the slash command (e.g., `name: plan` -> `/plan`) |
| `description` | string | Yes | Human-readable description shown in skill discovery/help |
| `argument-hint` | string | No | Hint text for the argument (e.g., `"<goal>"`, `"<story-id>"`, `"[epic-id]"`) |
| `user-invocable` | boolean | Yes | Whether users can invoke via slash command. `false` hides it from user discovery |
| `disable-model-invocation` | boolean | No | When `true`, prevents Claude from auto-invoking the skill |
| `allowed-tools` | list/string | No | Restricts which tools the skill can use during execution |

### Example Frontmatter

```yaml
---
name: plan
description: Collaboratively plan a goal, then create stories (standalone or epic-based)
argument-hint: "<goal>"
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git:*), Bash(gh:*), Bash(ls:*), Read, Write, Glob, Grep, AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TaskGet
---
```

### allowed-tools Syntax

The `allowed-tools` field supports both inline comma-separated and YAML list syntax:

- **Inline**: `allowed-tools: Bash, Read, AskUserQuestion`
- **YAML list**:
  ```yaml
  allowed-tools:
    - Bash
    - Read
    - AskUserQuestion
  ```
- **Glob patterns for Bash**: `Bash(node:*)` allows only Bash commands starting with `node`. `Bash(git:*)` allows only git commands. `Bash` (no pattern) allows all Bash commands.

## Skill Discovery and Loading

Skills are discovered by Claude Code through the plugin's directory structure:

1. **Plugin registration**: The plugin is installed at `~/.claude/plugins/cache/saga/saga-core/<version>/`
2. **Skill directory scanning**: Claude Code scans `plugin/skills/*/SKILL.md`
3. **Frontmatter parsing**: The YAML frontmatter determines visibility and behavior
4. **Slash command registration**: Skills with `user-invocable: true` become available as `/name` commands

### Current Skills

| Skill | Command | User-Invocable | Purpose |
|-------|---------|----------------|---------|
| `init` | `/init` | Yes | Initialize `.saga/` directory structure |
| `plan` | `/plan` | Yes | Collaboratively plan and create stories |
| `execute-story` | `/execute-story` | Yes | Start autonomous story implementation |
| `resolve-blocker` | `/resolve-blocker` | Yes | Resolve a blocker for a blocked story |
| `list-sessions` | `/list-sessions` | Yes | List running SAGA sessions |
| `dashboard` | `/dashboard` | Yes | Open the SAGA dashboard |
| `create-epic` | `/create-epic` | No (deprecated) | Create an epic definition |
| `generate-stories` | `/generate-stories` | No (deprecated) | Generate stories from an epic |

## The Task Table Format

Most skills define their execution flow as a **task table** in markdown. This is a structured table that Claude Code parses into a sequence of tasks with dependencies.

### Table Structure

```markdown
## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Task A  | What to do  | Doing A     | -          | Task B |
| Task B  | What to do  | Doing B     | Task A     | -      |
```

### Column Definitions

| Column | Purpose |
|--------|---------|
| **Subject** | Task name/title (used for dependency references) |
| **Description** | Detailed instructions for what the task should accomplish |
| **Active Form** | Present-continuous text shown in the UI spinner while the task runs |
| **Blocked By** | Comma-separated list of Subject names that must complete first. `-` means no blockers |
| **Blocks** | Comma-separated list of Subject names that depend on this task. `-` means nothing blocked |

### Dependency Resolution

Tasks form a directed acyclic graph (DAG) via `Blocked By` and `Blocks` columns:

- A task cannot start until all its `Blocked By` dependencies are completed
- When a task completes, it unblocks any tasks that list it in their `Blocked By`
- Tasks with no blockers (`-`) can start immediately
- Multiple unblocked tasks could theoretically run in parallel (though skills typically execute sequentially)

### Example: `/plan` Skill Task Flow

```
Validate goal
    -> Explore the codebase
        -> Collaborate on the goal
            -> Check existing items
                -> Propose work structure
                    -> Generate story content
                        -> Create artifacts
                            -> Report completion
```

Each task in the chain depends on the previous one, forming a linear pipeline.

## `$0` Argument Substitution

Skills accept arguments via the `$0` placeholder. When a user invokes `/plan "build authentication"`, the string `"build authentication"` replaces every occurrence of `$0` in the SKILL.md body.

### How It Works

1. User types: `/plan "user authentication with OAuth"`
2. Claude Code captures `"user authentication with OAuth"` as the argument
3. Every `$0` in the skill body is replaced with the argument value
4. The skill sees: `**Goal**: user authentication with OAuth`

### Usage Patterns

- **Direct inline**: `**Goal**: $0` (plan skill)
- **As script argument**: `node $SAGA_PLUGIN_ROOT/scripts/find.js "$0" --type story` (execute-story, resolve-blocker)
- **Validation**: Skills typically have an early task that validates `$0` is not empty

### Argument Hints

The `argument-hint` frontmatter field provides user guidance:
- `<goal>` — required argument (angle brackets)
- `[epic-id]` — optional argument (square brackets)
- `<story-id>` — required argument

## `!` Bang Commands — Embedded Script Output

The `!` syntax embeds the output of a shell command directly into the skill's body at parse time. This runs **before** the skill starts executing tasks.

### Syntax

```markdown
!`command here`
```

### How It Works

1. Claude Code encounters `!` followed by a backtick-quoted command
2. The command is executed immediately (before task execution begins)
3. The command's stdout replaces the `!`command`` line in the skill body
4. Claude then sees the output as part of the skill instructions

### Examples in SAGA

**execute-story SKILL.md**:
```markdown
!`node $SAGA_PLUGIN_ROOT/scripts/find.js "$0" --type story`
```

This runs the `find.js` script with the user's argument, which outputs a JSON result like:
```json
{"found": true, "data": {"storyId": "my-story", "worktreePath": "/path/to/worktree", "title": "My Story", "status": "in-progress"}}
```

The JSON becomes part of the skill body, and the first task ("Resolve story") processes it.

**list-sessions SKILL.md**:
```markdown
!`npx @saga-ai/dashboard sessions list`
```

Runs the dashboard CLI to get session data, which the skill then formats for display.

**generate-stories SKILL.md**:
```markdown
!`node $SAGA_PLUGIN_ROOT/scripts/find.js "$0" --type epic`
```

Finds an epic by ID, outputting JSON for the skill to process.

### Key Properties

- Bang commands run **synchronously** before task execution
- They have access to environment variables (`$SAGA_PLUGIN_ROOT`, `$0`)
- Output is inserted inline, becoming part of the LLM's context
- Used primarily to bridge between deterministic scripts and LLM-driven task execution

## The Collaboration Pattern (AskUserQuestion Loops)

Several skills use `AskUserQuestion` for interactive multi-turn dialogs with the user. This is a core pattern for skills that need human input or approval.

### Usage Patterns

#### 1. Disambiguation (execute-story, resolve-blocker, generate-stories)

When a `find.js` result returns multiple matches, the skill presents options:

```
AskUserQuestion:
  question: "Which story do you want to implement?"
  header: "Story"
  multiSelect: false
  options: [
    {label: "auth-login", description: "Login Flow (Status: in-progress)"},
    {label: "auth-signup", description: "Signup Flow (Status: pending)"}
  ]
```

#### 2. Multi-Turn Collaborative Discussion (plan)

The `/plan` skill uses extended dialog for goal refinement:
- Probes goals, scope, technical approach, data models
- Challenges vague assumptions
- Surfaces risks and tradeoffs
- Continues until thorough understanding is achieved

#### 3. Approval Gates (plan, generate-stories, resolve-blocker)

Before creating artifacts, skills present proposals and ask for approval:
- **plan**: "Approve / Break down further / Consolidate"
- **generate-stories**: "Approve all / Modify / Cancel"
- **resolve-blocker**: "Option 1 / Option 2 / Other"

If the user requests modifications, the skill loops back, adjusts, and re-presents.

#### 4. Iterative Refinement (create-epic)

The deprecated `/create-epic` skill walks through sections one at a time, drafting content and refining through Q&A for each section (vision, architecture, etc.).

## Hook Lifecycle

SAGA defines hooks via `plugin/hooks/hooks.json`. Hooks run at specific lifecycle events in Claude Code sessions.

### hooks.json Structure

```json
{
  "description": "SAGA plugin hooks",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-init.sh"
          }
        ]
      }
    ]
  }
}
```

### Hook Types

| Event | Trigger | SAGA Usage |
|-------|---------|------------|
| **SessionStart** | When a Claude Code session begins | `session-init.sh` — context detection and env setup |

### session-init.sh — The SessionStart Hook

This is the only hook defined in `hooks.json`. It runs at session startup and:

1. **Detects context**: Determines if the session is in the main repo or a story worktree
   - Checks if `.git` is a file (worktree) or directory (main repo)
   - If in a worktree under `.saga/worktrees/<storyId>/`, sets `SAGA_TASK_CONTEXT=story-worktree` and extracts `SAGA_STORY_ID`
   - Otherwise sets `SAGA_TASK_CONTEXT=main`

2. **Persists environment variables** to `CLAUDE_ENV_FILE`:
   - `SAGA_PROJECT_DIR` — the project root
   - `SAGA_PLUGIN_ROOT` — the plugin installation path
   - `SAGA_TASK_CONTEXT` — `"main"` or `"story-worktree"`
   - `SAGA_SESSION_DIR` — `/tmp/saga-sessions`
   - `SAGA_STORY_ID` — the story ID (only in worktree context)

3. **Outputs context summary** to stdout (which Claude sees as the session start message):
   ```
   # Session Context
   SAGA_PROJECT_DIR: /path/to/project
   SAGA_PLUGIN_ROOT: /path/to/plugin
   SAGA_TASK_CONTEXT: story-worktree
   SAGA_STORY_ID: my-story
   ```

### Worker Hooks (PreToolUse / PostToolUse)

While not defined in `hooks.json`, the worker script (`worker.js`) configures additional hooks for headless runs. These are passed as CLI arguments to the Claude Code headless process:

| Hook | Type | Script | Purpose |
|------|------|--------|---------|
| Scope Validator | PreToolUse | `scope-validator-hook.js` | Restricts file access to the story's worktree |
| Journal Gate | PostToolUse | `journal-gate-hook.js` | Reminds workers to write journal entries before completing tasks |
| Sync | PostToolUse | `sync-hook.js` | Syncs task state between Claude Code tasks and SAGA's JSON files |
| Auto-Commit | PostToolUse | `auto-commit-hook.js` | Automatically commits and pushes changes at intervals |
| Task Pacing | PostToolUse | `task-pacing-hook.js` | Enforces one-task-per-session discipline |
| Token Limit | PostToolUse | `token-limit-hook.js` | Tracks token usage and enforces budget limits |

These hooks are not part of the skill system per se, but are part of the worker execution environment. See [worker-architecture.md](worker-architecture.md) for details.

## How Skills Invoke Sub-Scripts

Skills bridge LLM-driven execution with deterministic Node.js scripts. The invocation patterns are:

### 1. Bang Command Pre-Execution (`!`)

Scripts that provide input data before the skill's tasks run:

- **`find.js`** — Resolves a story or epic by ID/partial match
  - Used by: execute-story, resolve-blocker, generate-stories
  - Invoked as: `!`node $SAGA_PLUGIN_ROOT/scripts/find.js "$0" --type story``
  - Returns JSON: `{found, data}` or `{found, matches}` or `{found, error}`

- **`npx @saga-ai/dashboard sessions list`** — Lists running tmux sessions
  - Used by: list-sessions

### 2. Task-Driven Script Execution

Scripts called during task execution via the Bash tool:

- **`schemas.js`** — Generates schema documentation for the LLM
  - Used by: plan (task "Generate story content")
  - Invoked as: `node $SAGA_PLUGIN_ROOT/scripts/schemas.js create-story-input`
  - Outputs: Schema definitions, field descriptions, examples, and writing guides
  - Purpose: Teaches the LLM the exact JSON format to produce

- **`create-story.js`** — Creates story artifacts (branch, worktree, files, PR)
  - Used by: plan (task "Create artifacts")
  - Invoked as: `node $SAGA_PLUGIN_ROOT/scripts/create-story.js --input story-<id>.json`
  - Creates: git branch, worktree, story.json, task JSONs, commits, pushes, draft PR
  - Returns JSON: `{storyId, storyTitle, branch, worktreePath, prUrl}`

- **`worker.js`** — The headless worker process
  - Used by: execute-story (task "Run worker")
  - Invoked inside tmux: `node $SAGA_PLUGIN_ROOT/scripts/worker.js <storyId> --messages-file <path>`
  - Runs: Full autonomous execution pipeline (worktree setup, PR, task loop, hooks)

### 3. Sub-Agent Spawning

The deprecated `/generate-stories` skill spawns sub-agents via the `Task` tool:
- Each story gets a `generate-story` agent
- All agents are spawned in a single message for parallelism
- Each agent receives epic context and sibling story info

## Skill Design Patterns

### Pattern 1: Find-Resolve-Execute (execute-story, resolve-blocker, generate-stories)

```
1. !`find.js "$0"` → JSON result pre-injected
2. Task: Parse JSON, handle found/not-found/ambiguous
3. Task: If ambiguous, AskUserQuestion to disambiguate
4. Tasks: Execute the main workflow with resolved ID
```

### Pattern 2: Validate-Explore-Collaborate-Generate (plan)

```
1. Task: Validate $0 argument
2. Task: Read codebase for context
3. Task: Multi-turn AskUserQuestion dialog
4. Task: Check existing items for uniqueness
5. Task: Propose structure, get approval (with revision loop)
6. Task: Generate content using schema docs
7. Task: Run deterministic scripts to create artifacts
8. Task: Report results
```

### Pattern 3: Check-Create-Report (init)

```
1. Task: Check if already initialized
2. Task: Create directory structure
3. Task: Update .gitignore
4. Task: Report completion with next steps
```

### Pattern 4: Read-Analyze-Approve-Write (resolve-blocker)

```
1. Task: Find and read story context
2. Task: Read journal, find unresolved blocker
3. Task: Present blocker to human
4. Task: Analyze codebase, propose solutions
5. Task: Get human approval (mandatory)
6. Task: Write resolution to journal
7. Task: Report completion
```

## Environment Variable Usage in Skills

Skills reference environment variables that are set by the session-init hook:

| Variable | Usage in Skills |
|----------|----------------|
| `$SAGA_PLUGIN_ROOT` | Path to scripts: `node $SAGA_PLUGIN_ROOT/scripts/find.js` |
| `$SAGA_PROJECT_DIR` | Project root: `${SAGA_PROJECT_DIR}/.saga/epics/` |
| `$SAGA_SESSION_DIR` | Session output: `${SAGA_SESSION_DIR}/<session>.jsonl` |
| `$SAGA_STORY_ID` | Story context (used by worker hooks, not directly in skills) |
| `$SAGA_TASK_CONTEXT` | Context type: `"main"` or `"story-worktree"` |

## Worker Prompt (execute-story)

The execute-story skill includes a `worker-prompt.md` file that serves as the system prompt for headless worker sessions. Key aspects:

- **One task per session**: Workers complete exactly one task, then exit
- **TDD workflow**: Write failing tests first, then implement
- **Task tools**: Uses `TaskList`, `TaskGet`, `TaskUpdate` for task management
- **Commit discipline**: Commit and push at milestones, never leave uncommitted work
- **Scope enforcement**: Can only access files in the worktree and story directory
- **Blocker handling**: If blocked, update task status, commit, and exit
- **Context awareness**: Monitor context window usage, exit early rather than lose work

## Summary

The SAGA skill system is built on Claude Code's plugin skill infrastructure:

1. **SKILL.md files** define skills with frontmatter (name, tools, visibility) and markdown body (instructions, task tables)
2. **Task tables** structure execution as dependency-ordered steps
3. **`$0` substitution** passes user arguments into skill bodies
4. **`!` bang commands** pre-execute scripts and inject output before task execution
5. **AskUserQuestion** enables collaboration, disambiguation, and approval gates
6. **Session-init hook** sets up environment variables for all subsequent tool calls
7. **Sub-scripts** (`find.js`, `schemas.js`, `create-story.js`, `worker.js`) handle deterministic operations that don't need LLM reasoning
