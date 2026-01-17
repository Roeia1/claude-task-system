# Technical Plan: Task System V2 - Epic/Story Architecture

**Feature**: [feature.md](./feature.md)
**Created**: 2026-01-12
**Status**: Draft

## Executive Summary

Restructure the claude-task-system plugin to use a 4-level hierarchy (Epic → Spec → Stories → Tasks) with a new `.claude-tasks/` directory structure. Stories become self-contained JSON files with embedded tasks, canonical file locations replace worktree duplication, and Claude hooks enforce story scope during execution.

## Technical Approach

- **Architectural Pattern**: File-based state with git worktrees for code isolation
- **Plugin Architecture**: Two-layer (Commands + Skills) - commands accept arguments and gather context, skills do the actual work
- **Integration Points**: Plugin commands (`$ARGUMENTS`, `!` bash), plugin skills (SKILL.md, `user-invocable`), Skill tool, git worktrees, GitHub CLI
- **Development Strategy**: Incremental - new commands/skills alongside existing, phased migration

### Why Commands + Skills (Two-Layer Architecture)

**Problem**: Skills don't support argument placeholders (`$ARGUMENTS`, `$1`, `$2`) - only commands do. But skills provide better organization with co-located templates and scripts.

**Solution**: Use both:

| Layer | Purpose | Features Used |
|-------|---------|---------------|
| **Commands** (user-facing) | Accept arguments, run scripts, invoke skills | `$ARGUMENTS`, `$1`/`$2`, `!` bash execution, `argument-hint` |
| **Skills** (internal) | Receive context, do actual work | SKILL.md, templates/, scripts/, `user-invocable: false` |

### Flow Example

```
User: /create-spec auth-system

1. Command `create-spec.md` receives "auth-system" via $ARGUMENTS
2. Command runs: !`python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "auth-system" --type epic --project-root "$CLAUDE_PROJECT_DIR"`
3. Resolution result is injected into context
4. Command instructs: "Use the Skill tool to invoke create-spec"
5. Skill `create-spec` reads context, creates spec.md
```

**Key benefits**:
- Arguments handled by commands (which support them)
- Complex logic encapsulated in skills with co-located resources
- Scripts run once via `!` prefix, results shared with skill
- Skills hidden from user menu (`user-invocable: false`)

## System Architecture

### Components

The system uses a **two-layer architecture**: Commands (user-facing) invoke Skills (internal).

**Commands** (in `commands/`):
- Single .md file with frontmatter
- Accept arguments via `$ARGUMENTS`, `$1`, `$2`
- Run scripts with `!` prefix to gather context
- Invoke skills via the Skill tool

**Skills** (in `skills/`):
- Directory with `SKILL.md` + resources
- `templates/` - Associated template files
- `scripts/` - Utility scripts
- Marked `user-invocable: false` (hidden from menu)

### Command → Skill Mapping

| Command | Skill | Purpose |
|---------|-------|---------|
| `/init` | `init` | Initialize `.claude-tasks/` structure |
| `/create-epic` | `create-epic` | Create epic.md from description |
| `/create-spec` | `create-spec` | Create spec.md for epic |
| `/generate-stories` | `generate-stories` | Generate story.md files from spec |
| `/show-story` | `show-story` | Display story details |
| `/list` | `list-status` | Display epic/story status |
| `/implement` | `execute-story` | Orchestrate story implementation |
| `/resolve` | `resolve-blocker` | Resolve blocked stories |

### Component Details

1. **Directory Manager**
   - **Command**: `/init` (no arguments)
   - **Skill**: `init`
   - **Files**: `commands/init.md`, `skills/init/SKILL.md`, `skills/init/scripts/init_structure.sh`

2. **Epic Manager**
   - **Command**: `/create-epic <description>` (accepts description)
   - **Skill**: `create-epic` (receives description from command context)
   - **Files**: `commands/create-epic.md`, `skills/create-epic/SKILL.md`, `skills/create-epic/templates/epic-template.md`

3. **Spec Manager**
   - **Command**: `/create-spec <epic-slug>` (resolves epic)
   - **Skill**: `create-spec` (receives resolved epic from context)
   - **Files**: `commands/create-spec.md`, `skills/create-spec/SKILL.md`, `skills/create-spec/templates/spec-template.md`

4. **Story Generator**
   - **Command**: `/generate-stories [epic-slug]` (resolves epic)
   - **Skill**: `generate-stories` (receives resolved epic from context)
   - **Files**: `commands/generate-stories.md`, `skills/generate-stories/SKILL.md`, `skills/generate-stories/templates/story-template.md`, `skills/generate-stories/scripts/create_worktree.sh`

5. **Story Viewer**
   - **Command**: `/show-story <story-slug>` (resolves story)
   - **Skill**: `show-story` (receives resolved story from context)
   - **Files**: `commands/show-story.md`, `skills/show-story/SKILL.md`

6. **List Manager**
   - **Command**: `/list [epics|stories|all]` (runs list script)
   - **Skill**: `list-status` (formats output from script)
   - **Files**: `commands/list.md`, `skills/list-status/SKILL.md`, `skills/list-status/scripts/list_stories.py`

7. **Story Executor**
   - **Command**: `/implement <story-slug>` (resolves story)
   - **Skill**: `execute-story` (orchestrates implementation with hooks)
   - **Files**: `commands/implement.md`, `skills/execute-story/SKILL.md`, `skills/execute-story/scripts/implement.py`, `skills/execute-story/worker-prompt.md`, `skills/execute-story/scripts/scope_validator.sh`

8. **Blocker Resolver**
   - **Command**: `/resolve [story-slug]` (resolves story)
   - **Skill**: `resolve-blocker` (analyzes and resolves blockers)
   - **Files**: `commands/resolve.md`, `skills/resolve-blocker/SKILL.md`

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          User Invokes Commands                               │
├─────────┬─────────────┬─────────────┬─────────────────┬──────────┬──────────┤
│ /init   │/create-epic │/create-spec │/generate-stories│/implement│ /list    │
└────┬────┴──────┬──────┴──────┬──────┴────────┬────────┴────┬─────┴────┬─────┘
     │           │             │               │             │          │
     │      $ARGUMENTS    $ARGUMENTS      $ARGUMENTS    $ARGUMENTS  $ARGUMENTS
     │           │             │               │             │          │
     v           v             v               v             v          v
┌─────────────────────────────────────────────────────────────────────────────┐
│                         plugin/commands/                                     │
│  (Run scripts with ! prefix, then invoke Skill tool)                        │
└────┬────┴──────┬──────┴──────┬──────┴────────┬────────┴────┬─────┴────┬─────┘
     │           │             │               │             │          │
     │     Skill tool    Skill tool      Skill tool    Skill tool  Skill tool
     v           v             v               v             v          v
┌─────────────────────────────────────────────────────────────────────────────┐
│                         plugin/skills/ (user-invocable: false)               │
├─────────┬─────────────┬─────────────┬─────────────────┬──────────┬──────────┤
│  init/  │create-epic/ │create-spec/ │generate-stories/│execute-  │list-     │
│SKILL.md │SKILL.md     │SKILL.md     │SKILL.md         │story/    │status/   │
│scripts/ │templates/   │templates/   │templates/       │SKILL.md  │SKILL.md  │
│         │             │             │scripts/         │scripts/  │scripts/  │
└────┬────┴──────┬──────┴──────┬──────┴────────┬────────┴────┬─────┴────┬─────┘
     │           │             │               │             │          │
     └───────────┴─────────────┴───────┬───────┴─────────────┴──────────┘
                                       │
                                       v
                          ┌────────────────────────┐
                          │   .claude-tasks/       │
                          │   ├── epics/           │
                          │   ├── archive/         │
                          │   └── worktrees/       │
                          └────────────────────────┘
                                       │
                                       v
                          ┌────────────────────────┐
                          │   Scope Enforcer       │
                          │   (Dynamic worker hooks)│
                          └────────────────────────┘
```

### Data Flow

**Epic → Spec → Stories → Execution:**

1. User invokes `/create-epic <name>` → command passes to `create-epic` skill → epic.md created in `.claude-tasks/epics/<slug>/`
2. User invokes `/create-spec <slug>` → command resolves epic, invokes `create-spec` skill → spec.md created alongside epic.md
3. User invokes `/generate-stories` → command resolves epic, invokes `generate-stories` skill → story.md files created in `stories/<slug>/`
4. For each story, git worktree created in `.claude-tasks/worktrees/`
5. User invokes `/implement <story>` → command resolves story, invokes `execute-story` skill → orchestrator spawns workers
6. Workers read story.md, write to journal.md (canonical location)
7. Scope enforcer (dynamic worker hooks via --settings) blocks writes to other stories' files
8. On completion, story archived to `.claude-tasks/archive/`

## Technology Choices

### Core Technologies

- **Language/Runtime**: Python 3.x for scripts, Markdown for commands/instructions
- **State Management**: Filesystem-based (JSON, Markdown files)
- **Version Control**: Git worktrees for story isolation

### Libraries & Dependencies

| Library | Purpose | Version | Rationale |
|---------|---------|---------|-----------|
| Python json | JSON parsing/validation | stdlib | No external deps |
| Python subprocess | Git operations | stdlib | Shell command execution |
| Python pathlib | Path manipulation | stdlib | Cross-platform paths |

### Tools & Infrastructure

- **Git Worktrees**: Story branch isolation
- **Claude Hooks**: Scope enforcement via PreToolUse
- **GitHub CLI**: PR creation for stories

## Data Models

### Entity: Epic (epic.md)

```markdown
# <Epic Title>

## Overview
<description>

## Goals
- Goal 1
- Goal 2

## Success Metrics
- Metric 1

## Scope
### In Scope
- Item 1

### Out of Scope
- Item 1

## Non-Functional Requirements
- NFR 1
```

### Entity: Spec (spec.md)

```markdown
# <Epic Title> - Technical Spec

## Architecture Overview
<high-level approach>

## Key Decisions
### <Decision Title>
- **Choice**: <what>
- **Rationale**: <why>
- **Alternatives Considered**: <options>

## Data Models
<schemas>

## Interface Contracts
<APIs between stories>

## Tech Stack
- Choice 1

## Open Questions
- Question 1
```

### Entity: Story (story.md)

Stories use YAML front matter compatible with the `python-frontmatter` package (and similar libraries like `PyYAML`).

**Parsing example:**
```python
import frontmatter

with open('story.md') as f:
    story = frontmatter.load(f)

# Access metadata
print(story['id'])        # "user-login"
print(story['status'])    # "ready"
print(story['tasks'])     # List of task dicts

# Access markdown content
print(story.content)      # The markdown body
```

**Front matter schema:**

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `id` | string | slug format | Unique story identifier |
| `title` | string | - | Human-readable title |
| `status` | enum | `ready`, `in-progress`, `review`, `done` | Story status |
| `epic` | string | slug format | Parent epic identifier |
| `tasks` | object[] | - | List of task objects |
| `tasks[].id` | string | e.g., `t1`, `t2` | Task identifier within story |
| `tasks[].title` | string | - | Task title |
| `tasks[].status` | enum | `pending`, `in-progress`, `done` | Task status |

**Template:**
```markdown
---
id: user-login
title: Implement User Login Flow
status: ready                        # ready | in-progress | review | done
epic: auth-system
tasks:
  - id: t1
    title: Create login form component
    status: pending                  # pending | in-progress | done
  - id: t2
    title: Add form validation
    status: pending
---

## Context

<self-contained description - what this story accomplishes and why>

## Interface

### Inputs
- <dependencies>

### Outputs
- <what this produces>

## Acceptance Criteria

- [ ] <verifiable condition>
- [ ] <another condition>

## Tasks

### t1: <task title>

**Guidance:**
- <implementation detail>

**References:**
- <file path>

**Avoid:**
- <anti-pattern>

**Done when:**
- <verification>

### t2: <task title>

...
```

**Relationships**:
- Story belongs to Epic (via `epic` field in front matter and directory structure)
- Story has many Tasks (listed in front matter for status, detailed in body)

### Entity: Journal (journal.md)

```markdown
# Story Journal: <story-slug>

## Session: <timestamp>

### Task: t1 - <title>
**Status**: in-progress → done
**Duration**: <time>

#### Work Done
- <description>

#### Decisions
- <decision and reasoning>

#### Blockers
- <if any>
```

## Implementation Strategy

### Phase 1: Foundation (Infrastructure)

1. Create `plugin/commands/` and `plugin/skills/` directory structure
2. Create `plugin/scripts/` for shared scripts (identifier_resolver.py)
3. Create `/init` command and `init` skill with init_structure.sh
4. Update .gitignore for worktrees path
5. Create front matter schema documentation for story.md validation

**Success Criteria**: `/init` command creates valid `.claude-tasks/` directory structure

### Phase 2: Epic & Spec (Commands + Skills)

1. Create `/create-epic` command and `create-epic` skill with epic-template.md
2. Create `/create-spec` command and `create-spec` skill with spec-template.md
3. Create shared `identifier_resolver.py` in `plugin/scripts/`
4. Implement epic slug generation in skill instructions

**Success Criteria**: Can create epic and spec documents via commands

### Phase 3: Story Generation

1. Create `/generate-stories` command and `generate-stories` skill
2. Add story-template.md and create_worktree.sh to skill
3. Implement story.md generation from spec
4. Create git worktree for each story via script
5. Create PR for each story branch via script
6. Create `/show-story` command and `show-story` skill

**Success Criteria**: Can generate stories with worktrees and PRs via commands

### Phase 4: Execution & Scope Enforcement

1. Create `/implement` command and `execute-story` skill
2. Add implement.py, worker-prompt.md, scope_validator.sh to skill
3. Implement dynamic worker hooks via --settings flag in implement.py
4. Update orchestrator for story.md format
5. Update worker prompt for task-based execution

**Success Criteria**: Can execute stories autonomously via `/implement` command

### Phase 5: List & Status

1. Create `/list` command and `list-status` skill with list_stories.py
2. Implement status derivation from filesystem/git in script
3. Add formatting logic in skill

**Success Criteria**: `/list` command shows accurate status for all epics and stories

### Phase 6: Resolve & Cleanup

1. Create `/resolve` command and `resolve-blocker` skill
2. Update archive workflow for story completion
3. Update task-merge skill for stories

**Success Criteria**: Blocked stories can be resolved via `/resolve` command

## Security Considerations

- **Scope Enforcement**: Claude hooks prevent agents from modifying other stories' files
- **Git Safety**: Inherit existing git safety rules (no force push, no amend without checks)
- **File Access**: Hooks only restrict task files, full codebase access preserved

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|-----------|--------|---------------------|
| Hook bypass by agent | Low | Med | Clear error messages, instruction reinforcement |
| Story.json schema evolution | Med | Med | Version field in schema, migration scripts |
| Worktree conflicts during parallel work | Low | High | Clear documentation, PR-based merge |
| Canonical path confusion for agents | Med | Med | Clear worker prompt, explicit paths |

## Performance Considerations

- **Expected Load**: Typical project has 1-5 active stories
- **Response Time Targets**: All commands complete in <5 seconds
- **Optimization Strategies**: Lazy loading of story status, cached git operations

## Dependencies

### External Services
- **GitHub API**: PR creation via `gh` CLI
- **Git**: Worktree management

### Internal Dependencies
- **Plugin commands infrastructure**: Command .md format, `$ARGUMENTS`, `argument-hint`, `!` bash execution
- **Plugin skills infrastructure**: SKILL.md format, skill frontmatter, `user-invocable`
- **Environment variables**: `CLAUDE_PLUGIN_ROOT` (plugin installation path) and `CLAUDE_PROJECT_DIR` (user's project root) are available in all Bash tool invocations
- **Skill tool**: For commands to invoke internal skills programmatically
- **implement.py**: Orchestration script (to be created in `skills/execute-story/scripts/`)
- **worker-prompt.md**: Worker instructions (to be created in `skills/execute-story/`)

### Infrastructure Requirements
- **Compute**: Local machine (CLI tool)
- **Storage**: Filesystem for `.claude-tasks/`
- **Network**: GitHub API for PR operations

## Identifier Resolution

The `/implement`, `/create-spec`, and `/generate-stories` **commands** use `identifier_resolver.py` to resolve user input to a specific story or epic. The script runs in the command via bash execution (`!` prefix) and injects results into context before invoking the skill.

### identifier_resolver.py

**Location**: `scripts/identifier_resolver.py` (shared by all commands)

**Purpose**: Resolve flexible identifiers to story or epic metadata.

**Input**:
```bash
# For stories (default)
python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "<query>" --project-root "$CLAUDE_PROJECT_DIR"
python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "<query>" --type story --project-root "$CLAUDE_PROJECT_DIR"

# For epics
python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "<query>" --type epic --project-root "$CLAUDE_PROJECT_DIR"
```

**Flags**:
- `--type`: Either `story` (default) or `epic`
- `--project-root`: Path to project root containing `.claude-tasks/`

### Story Resolution (`--type story`)

**Matching Logic** (priority order):
1. **Exact match on `id`** → immediate single result
2. **Fuzzy match** (if no exact):
   - Normalize: lowercase, replace `-`/`_` with spaces
   - Check if query is substring of `id` or `title`
   - Check if `id` or `title` is substring of query
   - Collect all matches

**Output Scenarios**:

Single match (resolved):
```json
{
  "resolved": true,
  "story": {
    "id": "user-login",
    "title": "Implement User Login Flow",
    "status": "ready",
    "context": "<truncated to 300 chars>",
    "epic_slug": "auth-system"
  }
}
```

Multiple matches (disambiguation needed):
```json
{
  "resolved": false,
  "stories": [
    {"epic_slug": "auth-system", "id": "user-login", "title": "...", "status": "...", "context": "..."},
    {"epic_slug": "payments", "id": "user-login", "title": "...", "status": "...", "context": "..."}
  ]
}
```

No match (error):
```json
{
  "resolved": false,
  "error": "No story found matching 'xyz'"
}
```

### Epic Resolution (`--type epic`)

**Matching Logic**: Slug-based only (no file reading required)
1. **Exact match on slug** → immediate single result
2. **Partial match**: Check if query is substring of slug or vice versa
3. List all epic folder names from `.claude-tasks/epics/`

**Output Scenarios**:

Single match (resolved):
```json
{
  "resolved": true,
  "epic": {
    "slug": "auth-system"
  }
}
```

Multiple matches (disambiguation needed):
```json
{
  "resolved": false,
  "epics": [
    {"slug": "auth-system"},
    {"slug": "auth-v2"}
  ]
}
```

No match (error):
```json
{
  "resolved": false,
  "error": "No epic found matching 'xyz'"
}
```

**Design Decisions**:
- Epic resolution only uses folder names (slugs), never reads epic.md
- Story context field truncated to 300 characters max
- No paths in output - command computes paths from `epic_slug` + `id`
- Returns JSON with `error` field on no match (exit 0, not throw)
- Only supports V2 story.md format (no V1 task.json support)

### Multiple Match Handling

When `identifier_resolver.py` returns multiple matches, **commands** use `AskUserQuestion` to disambiguate before invoking the skill:

For stories (in `/implement`, `/show-story`, `/resolve` commands):
```
question: "Which story do you want to implement?"
header: "Story"
multiSelect: false
options: [
  {label: "<epic-slug>/<story-id>", description: "<title> - <status>: <context>"}
]
```

For epics (in `/create-spec`, `/generate-stories` commands):
```
question: "Which epic do you want to create a spec for?"
header: "Epic"
multiSelect: false
options: [
  {label: "<slug>"}
]
```
Note: Epic options have no description field since only folder names (slugs) are available.

## File Structure Changes

### New Plugin Structure

The plugin uses a **two-layer architecture**: Commands (user-facing) invoke Skills (internal).

```
plugin/
├── commands/                        # User-facing commands (accept arguments)
│   ├── init.md                      # /init - no args, invokes init skill
│   ├── create-epic.md               # /create-epic <desc> - invokes create-epic skill
│   ├── create-spec.md               # /create-spec <slug> - resolves epic, invokes create-spec skill
│   ├── generate-stories.md          # /generate-stories [slug] - resolves epic, invokes generate-stories skill
│   ├── show-story.md                # /show-story <slug> - resolves story, invokes show-story skill
│   ├── list.md                      # /list [filter] - runs script, invokes list-status skill
│   ├── implement.md                 # /implement <slug> - resolves story, invokes execute-story skill
│   └── resolve.md                   # /resolve [slug] - resolves story, invokes resolve-blocker skill
├── skills/                          # Internal skills (user-invocable: false)
│   ├── init/
│   │   ├── SKILL.md                 # Skill definition (user-invocable: false)
│   │   └── scripts/
│   │       └── init_structure.sh    # Directory creation script
│   ├── create-epic/
│   │   ├── SKILL.md                 # Epic creation logic
│   │   └── templates/
│   │       └── epic-template.md     # Epic markdown template
│   ├── create-spec/
│   │   ├── SKILL.md                 # Spec creation logic
│   │   └── templates/
│   │       └── spec-template.md     # Spec markdown template
│   ├── generate-stories/
│   │   ├── SKILL.md                 # Story generation logic
│   │   ├── templates/
│   │   │   └── story-template.md    # Story markdown template
│   │   └── scripts/
│   │       └── create_worktree.sh   # Worktree + PR creation
│   ├── show-story/
│   │   └── SKILL.md                 # Story display logic
│   ├── list-status/
│   │   ├── SKILL.md                 # List formatting logic
│   │   └── scripts/
│   │       └── list_stories.py      # Status derivation script
│   ├── execute-story/
│   │   ├── SKILL.md                 # Orchestration logic (with hooks)
│   │   ├── worker-prompt.md         # Worker agent instructions
│   │   └── scripts/
│   │       ├── implement.py         # Orchestrator script
│   │       └── scope_validator.sh   # Scope enforcement
│   └── resolve-blocker/
│       └── SKILL.md                 # Blocker resolution logic
├── scripts/                         # Shared scripts (used by commands)
│   └── identifier_resolver.py       # Epic/story resolution (shared)
└── .claude-plugin/
    └── plugin.json                  # Plugin manifest
```

**Key architecture points:**
- `commands/` folder contains user-facing .md files that accept `$ARGUMENTS`
- `skills/` folder contains internal skills with co-located templates and scripts
- `scripts/` folder contains shared scripts used by multiple commands
- Commands run scripts with `!` prefix, then invoke skills via Skill tool
- All skills marked `user-invocable: false` (hidden from slash menu)

### User Project Structure

```
project/
├── .claude-tasks/
│   ├── epics/
│   │   └── <epic-slug>/
│   │       ├── epic.md
│   │       ├── spec.md
│   │       └── stories/
│   │           └── <story-slug>/
│   │               ├── story.md
│   │               └── journal.md
│   ├── archive/
│   │   └── <epic-slug>/
│   │       └── <story-slug>/
│   │           ├── story.md
│   │           └── journal.md
│   └── worktrees/           # gitignored
│       └── <epic-slug>/
│           └── <story-slug>/
│               └── [full code checkout]
└── .gitignore               # includes .claude-tasks/worktrees/
```

## Command and Skill Specifications

The system uses a two-layer architecture: **Commands** accept arguments and gather context, then invoke **Skills** via the Skill tool.

### Command Specifications

Commands are single .md files with frontmatter. They use `$ARGUMENTS` for user input and `!` prefix for script execution.

#### /init Command

**File**: `commands/init.md`

```yaml
---
description: Initialize .claude-tasks/ directory structure
allowed-tools: Bash(bash:*), Skill(init)
---

# Initialize Task System

!`bash ${CLAUDE_PLUGIN_ROOT}/skills/init/scripts/init_structure.sh "$CLAUDE_PROJECT_DIR"`

The initialization script has run. Use the Skill tool to invoke `init` to report results to the user.
```

#### /create-epic Command

**File**: `commands/create-epic.md`

```yaml
---
argument-hint: <description>
description: Create a new epic document
allowed-tools: Skill(create-epic)
---

# Create Epic

**Epic description**: $ARGUMENTS

Use the Skill tool to invoke `create-epic`. The skill will:
1. Generate a slug from the description
2. Create the epic directory
3. Generate epic.md using the template
```

#### /create-spec Command

**File**: `commands/create-spec.md`

```yaml
---
argument-hint: <epic-slug>
description: Create a technical specification for an epic
allowed-tools: Bash(python:*), Skill(create-spec), AskUserQuestion
---

# Create Technical Spec

**User input**: $ARGUMENTS

## Epic Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "$ARGUMENTS" --type epic --project-root "$CLAUDE_PROJECT_DIR"`

## Instructions

Based on the resolution above:

1. **If resolved=true**: Use the Skill tool to invoke `create-spec`

2. **If resolved=false with epics array**: Multiple matches found
   - Use AskUserQuestion to let user choose:
     - question: "Which epic do you want to create a spec for?"
     - header: "Epic"
     - options: [{label: "<slug>"}]
   - After selection, use Skill tool to invoke `create-spec`

3. **If resolved=false with error**: Display error and suggest `/list`
```

#### /generate-stories Command

**File**: `commands/generate-stories.md`

```yaml
---
argument-hint: [epic-slug]
description: Generate stories from a technical spec
allowed-tools: Bash(python:*), Skill(generate-stories), AskUserQuestion
---

# Generate Stories

**User input**: $ARGUMENTS

## Epic Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "$ARGUMENTS" --type epic --project-root "$CLAUDE_PROJECT_DIR"`

## Instructions

Based on the resolution above:

1. **If resolved=true**: Use the Skill tool to invoke `generate-stories`

2. **If resolved=false with epics array**: Use AskUserQuestion to disambiguate, then invoke skill

3. **If resolved=false with error**: Display error and suggest `/list`
```

#### /show-story Command

**File**: `commands/show-story.md`

```yaml
---
argument-hint: <story-slug>
description: Show story details and status
allowed-tools: Bash(python:*), Skill(show-story), AskUserQuestion
---

# Show Story

**User input**: $ARGUMENTS

## Story Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "$ARGUMENTS" --project-root "$CLAUDE_PROJECT_DIR"`

## Instructions

Based on the resolution above:

1. **If resolved=true**: Use the Skill tool to invoke `show-story`

2. **If resolved=false with stories array**: Use AskUserQuestion to disambiguate, then invoke skill

3. **If resolved=false with error**: Display error and suggest `/list`
```

#### /list Command

**File**: `commands/list.md`

```yaml
---
argument-hint: [epics|stories|all]
description: List epics and stories with their status
allowed-tools: Bash(python:*), Skill(list-status)
---

# List Epics and Stories

**Filter**: $ARGUMENTS (default: all)

## Get Status

!`python ${CLAUDE_PLUGIN_ROOT}/skills/list-status/scripts/list_stories.py "$CLAUDE_PROJECT_DIR" "$ARGUMENTS"`

## Instructions

Use the Skill tool to invoke `list-status` to format and display the results.
```

#### /implement Command

**File**: `commands/implement.md`

```yaml
---
argument-hint: <story-slug>
description: Execute a story autonomously
allowed-tools: Bash(python:*), Skill(execute-story), AskUserQuestion
---

# Implement Story

**User input**: $ARGUMENTS

## Story Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "$ARGUMENTS" --project-root "$CLAUDE_PROJECT_DIR"`

## Instructions

Based on the resolution above:

1. **If resolved=true**: Use the Skill tool to invoke `execute-story`

2. **If resolved=false with stories array**: Use AskUserQuestion to disambiguate, then invoke skill

3. **If resolved=false with error**: Display error and suggest `/list`
```

#### /resolve Command

**File**: `commands/resolve.md`

```yaml
---
argument-hint: [story-slug]
description: Resolve a blocker for a blocked story
allowed-tools: Bash(python:*), Skill(resolve-blocker), AskUserQuestion
---

# Resolve Blocker

**User input**: $ARGUMENTS

## Story Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "$ARGUMENTS" --project-root "$CLAUDE_PROJECT_DIR"`

## Instructions

Based on the resolution above:

1. **If resolved=true**: Use the Skill tool to invoke `resolve-blocker`

2. **If resolved=false with stories array**: Use AskUserQuestion to disambiguate, then invoke skill

3. **If resolved=false with error**: Display error and suggest `/list`
```

### Skill Specifications

Skills are directories with `SKILL.md` + resources. All marked `user-invocable: false` since they're invoked by commands.

#### init Skill

**File**: `skills/init/SKILL.md`

```yaml
---
name: init
description: Initialize .claude-tasks/ directory structure
user-invocable: false
---

# Initialize Task System

The initialization script has already run (via the command). Report the results to the user:
- Created `.claude-tasks/epics/`
- Created `.claude-tasks/archive/`
- Created `.claude-tasks/worktrees/`
- Updated .gitignore
```

#### create-epic Skill

**File**: `skills/create-epic/SKILL.md`

```yaml
---
name: create-epic
description: Create a new epic document from description in context
user-invocable: false
allowed-tools: Read, Write, AskUserQuestion
---

# Create Epic

The epic description is in the conversation context (passed from the command).

## Instructions

1. Extract epic description from context
2. Generate slug from description (AI-assisted for meaningful slug)
3. Create `.claude-tasks/epics/<slug>/`
4. Read the template: [epic-template.md](templates/epic-template.md)
5. Generate epic.md with AI assistance, clarifying ambiguities with user
6. Save epic.md
```

#### create-spec Skill

**File**: `skills/create-spec/SKILL.md`

```yaml
---
name: create-spec
description: Create a technical specification for a resolved epic
user-invocable: false
allowed-tools: Read, Write, AskUserQuestion
---

# Create Technical Spec

The resolved epic is in the conversation context (passed from the command).

## Instructions

1. Extract epic_slug from resolution context
2. Compute path: `.claude-tasks/epics/<epic_slug>/`
3. Read epic.md
4. Read the template: [spec-template.md](templates/spec-template.md)
5. Generate spec.md with 7-phase planning process
6. Create ADRs for significant decisions
7. Save spec.md
```

#### generate-stories Skill

**File**: `skills/generate-stories/SKILL.md`

```yaml
---
name: generate-stories
description: Generate stories from a resolved epic's spec
user-invocable: false
allowed-tools: Bash(git:*), Bash(gh:*), Read, Write, AskUserQuestion
---

# Generate Stories

The resolved epic is in the conversation context (passed from the command).

## Instructions

1. Extract epic_slug from resolution context
2. Read epic.md and spec.md
3. Read the template: [story-template.md](templates/story-template.md)
4. Generate story breakdown (AI-assisted)
5. For each story:
   - Create `stories/<slug>/story.md`
   - Run: `bash ${CLAUDE_PLUGIN_ROOT}/skills/generate-stories/scripts/create_worktree.sh <epic-slug> <story-slug>`
6. Report created stories with their PR links
```

#### show-story Skill

**File**: `skills/show-story/SKILL.md`

```yaml
---
name: show-story
description: Display story details from resolved story context
user-invocable: false
allowed-tools: Read
---

# Show Story Details

The resolved story is in the conversation context (passed from the command).

## Instructions

Display the story's details including:
- Title and status
- Context and acceptance criteria
- Task progress
- Journal entries (if any)
```

#### list-status Skill

**File**: `skills/list-status/SKILL.md`

```yaml
---
name: list-status
description: Format and display epic/story status
user-invocable: false
---

# List Status

The list output is in the conversation context (from the command's script execution).

## Instructions

Format and display the output in a readable format, grouped by epic.
```

#### execute-story Skill

**File**: `skills/execute-story/SKILL.md`

```yaml
---
name: execute-story
description: Orchestrate autonomous story implementation
user-invocable: false
allowed-tools: Bash(python:*), Task(*)
---

# Execute Story

The resolved story is in the conversation context (passed from the command).

## Instructions

1. Extract epic_slug and story_slug from resolution context
2. Compute paths:
   - worktree: `$CLAUDE_PROJECT_DIR/.claude-tasks/worktrees/<epic_slug>/<story_slug>/`
   - story_md (inside worktree): `<worktree>/.claude-tasks/epics/<epic_slug>/stories/<story_slug>/story.md`
   - journal_md (inside worktree): `<worktree>/.claude-tasks/epics/<epic_slug>/stories/<story_slug>/journal.md`
3. Validate worktree and story.md exist
4. Spawn orchestrator: `python ${CLAUDE_PLUGIN_ROOT}/skills/execute-story/scripts/implement.py <epic_slug> <story_slug>`
5. Worker instructions: [worker-prompt.md](worker-prompt.md)
```

### Worker Prompt Template

**File**: `skills/execute-story/worker-prompt.md`

The worker prompt is a template that receives context variables prepended by implement.py:

```markdown
WORKTREE_ROOT=<path to worktree>
CLAUDE_PLUGIN_ROOT=<plugin installation path>
CLAUDE_PROJECT_DIR=<user's project root>
EPIC_SLUG=<epic slug>
STORY_SLUG=<story slug>

# Task Worker Instructions

You are a worker agent executing a story. Your files are located at:

- **Story**: `$WORKTREE_ROOT/.claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/story.md`
- **Journal**: `$WORKTREE_ROOT/.claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/journal.md`

## Session Startup

1. **Read story.md** to understand tasks and their current status
2. **Read journal.md** to understand what previous sessions accomplished
3. **Run `git log -5 --oneline`** for code context continuity
4. **Select a task** to work on (continue `in-progress` or pick next `pending`)

## Implementation Workflow

For your selected task, follow the guidance in story.md:
- Read the **Guidance** section for implementation approach
- Check **References** for relevant files
- Avoid patterns listed in **Avoid**
- Verify completion using **Done when** criteria

... (TDD workflow, commit discipline, exit protocol as in V1)
```

**Key points:**
- Worker runs with `cwd` set to worktree root
- All file paths reference the worktree's copy of `.claude-tasks/`
- Worker commits/pushes to sync changes to the story branch
- Changes merge to main repo when PR is merged

#### resolve-blocker Skill

**File**: `skills/resolve-blocker/SKILL.md`

```yaml
---
name: resolve-blocker
description: Analyze and resolve story blockers
user-invocable: false
allowed-tools: Read, Write, AskUserQuestion
---

# Resolve Story Blocker

The resolved story is in the conversation context (passed from the command).

## Instructions

1. Read the story's journal.md to understand the blocker
2. Analyze the blocker and propose solutions with pros/cons
3. Use AskUserQuestion to get human decision
4. Document resolution in journal.md
5. Update story status to allow resumption with `/implement`
```

## Skill Visibility Controls

Skills support visibility controls via SKILL.md frontmatter:

| Field | Default | Effect |
|-------|---------|--------|
| `user-invocable` | `true` | Controls slash menu visibility |
| `disable-model-invocation` | `false` | Blocks programmatic invocation via Skill tool |

### Visibility Scenarios

| Setting | Slash Menu | Skill Tool | Auto-Discovery |
|---------|------------|------------|----------------|
| Default | Visible | Allowed | Yes |
| `user-invocable: false` | Hidden | Allowed | Yes |
| `disable-model-invocation: true` | Visible | Blocked | Yes |

### Task System V2 Visibility Strategy

For Task System V2, all skills are marked `user-invocable: false` because:
- **Commands are user-facing**: Users invoke `/create-epic`, `/create-spec`, etc.
- **Skills are internal**: Commands invoke skills via the Skill tool
- **Skills receive context from commands**: They don't accept arguments directly

| Component | Visibility | Reason |
|-----------|------------|--------|
| `/create-epic` command | Visible in menu | User entry point |
| `create-epic` skill | `user-invocable: false` | Invoked by command via Skill tool |
| `/implement` command | Visible in menu | User entry point |
| `execute-story` skill | `user-invocable: false` | Invoked by command via Skill tool |

## Scope Enforcement

Scope enforcement uses **worker dynamic hooks** passed via the `--settings` flag when spawning worker agents. This approach ensures each worker has its own scope context without requiring skill-level hook definitions.

### Worker Dynamic Hooks (--settings)

When the orchestrator (implement.py) spawns worker agents, it passes scope enforcement hooks via `--settings`:

```python
# In skills/execute-story/scripts/implement.py
import os
import json
import subprocess

plugin_root = os.environ["CLAUDE_PLUGIN_ROOT"]
project_dir = os.environ["CLAUDE_PROJECT_DIR"]
worktree_root = f"{project_dir}/.claude-tasks/worktrees/{epic_slug}/{story_slug}"

# Load worker prompt template
with open(f"{plugin_root}/skills/execute-story/worker-prompt.md") as f:
    worker_prompt_template = f.read()

# Build prompt with context variables prepended
prompt = f"""WORKTREE_ROOT={worktree_root}
CLAUDE_PLUGIN_ROOT={plugin_root}
CLAUDE_PROJECT_DIR={project_dir}
EPIC_SLUG={epic_slug}
STORY_SLUG={story_slug}

{worker_prompt_template}
"""

# Scope enforcement hooks
settings = {
    "hooks": {
        "PreToolUse": [
            {
                "matcher": "Read|Write|Edit",
                "hooks": [
                    {
                        "type": "command",
                        "command": f"{plugin_root}/skills/execute-story/scripts/scope_validator.sh {epic_slug} {story_slug}"
                    }
                ]
            }
        ]
    }
}

subprocess.run([
    "claude", "-p", prompt,
    "--settings", json.dumps(settings),
    "--model", model,
    "--output-format", "json",
    "--json-schema", json.dumps(WORKER_OUTPUT_SCHEMA),
    "--dangerously-skip-permissions"
], cwd=worktree_root)
```

### scope_validator.sh

**File**: `skills/execute-story/scripts/scope_validator.sh`

```bash
#!/bin/bash
# Validates that file operations (Read/Write/Edit) are within allowed story scope
# Receives epic_slug and story_slug as command-line arguments

EPIC_SLUG="$1"
STORY_SLUG="$2"

if [[ -z "$EPIC_SLUG" || -z "$STORY_SLUG" ]]; then
    # No scope defined, allow all writes
    exit 0
fi

ALLOWED_PATH=".claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/"

# Hook receives tool input as JSON on stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('file_path', d.get('path', '')))" 2>/dev/null)

# If no file path found, allow (not a file operation)
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Block access to archive folder
if [[ "$FILE_PATH" == *".claude-tasks/archive/"* ]]; then
    echo "Scope violation: Cannot access .claude-tasks/archive/ - this folder contains completed stories and should not be modified. Attempted: $FILE_PATH" >&2
    exit 2
fi

# Block access to other epics/stories (not the current one)
if [[ "$FILE_PATH" == *".claude-tasks/epics/"*"/stories/"* ]]; then
    if [[ "$FILE_PATH" != *"$ALLOWED_PATH"* ]]; then
        echo "Scope violation: Cannot access other stories in .claude-tasks/epics/. You are scoped to: $ALLOWED_PATH. Attempted: $FILE_PATH" >&2
        exit 2
    fi
fi

# Allow all other file operations (code files, etc.)
exit 0
```

### Benefits of Dynamic Worker Hooks

1. **Per-worker scope**: Each worker receives its own scope via `--settings`
2. **Auto-cleanup**: Hooks are scoped to the worker process
3. **No global state**: No hooks.json or .active-story files needed
4. **Parallel-safe**: Multiple workers with different scopes can run concurrently

## implement.py Specification

**File**: `skills/execute-story/scripts/implement.py`

The orchestration script that spawns worker Claude instances in a loop.

### Arguments

```bash
python implement.py <epic_slug> <story_slug> [options]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `epic_slug` | Yes | Epic identifier |
| `story_slug` | Yes | Story identifier |
| `--max-cycles` | No | Max worker spawns (default: 10) |
| `--max-time` | No | Max execution time in minutes (default: 60) |
| `--model` | No | Model for workers (default: opus) |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_PLUGIN_ROOT` | Plugin installation path (required) |
| `CLAUDE_PROJECT_DIR` | User's project root (required) |

### Algorithm

```
1. Read CLAUDE_PLUGIN_ROOT and CLAUDE_PROJECT_DIR from environment
2. Compute worktree path: $CLAUDE_PROJECT_DIR/.claude-tasks/worktrees/<epic>/<story>/
3. Validate:
   - Worktree directory exists
   - story.md exists at worktree/.claude-tasks/epics/<epic>/stories/<story>/story.md
4. Load worker prompt template from $CLAUDE_PLUGIN_ROOT/skills/execute-story/worker-prompt.md
5. Build prompt with context variables prepended:
   WORKTREE_ROOT=<worktree path>
   CLAUDE_PLUGIN_ROOT=<plugin root>
   CLAUDE_PROJECT_DIR=<project dir>
   EPIC_SLUG=<epic>
   STORY_SLUG=<story>

   <worker prompt template>
6. Build scope enforcement settings (--settings JSON)
7. Loop until FINISH, BLOCKED, TIMEOUT, or MAX_CYCLES:
   a. Spawn worker: claude -p <prompt> --settings <hooks> --model <model> --output-format json --json-schema <schema> --dangerously-skip-permissions
   b. Parse worker output (status, summary, blocker)
   c. If ONGOING: continue loop
   d. If FINISH/BLOCKED: exit loop
8. Output final result as JSON
```

### Worker Output Schema

```json
{
  "status": "ONGOING" | "FINISH" | "BLOCKED",
  "summary": "string - what was accomplished",
  "blocker": null | "string - description if BLOCKED"
}
```

### Exit Statuses

| Status | Description |
|--------|-------------|
| `FINISH` | All tasks completed successfully |
| `BLOCKED` | Human decision needed (blocker documented in journal.md) |
| `TIMEOUT` | Max time exceeded |
| `MAX_CYCLES` | Max worker spawns reached |
| `ERROR` | Validation or spawn failure |
