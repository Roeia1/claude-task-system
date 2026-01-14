# Technical Plan: Task System V2 - Epic/Story Architecture

**Feature**: [feature.md](./feature.md)
**Created**: 2026-01-12
**Status**: Draft

## Executive Summary

Restructure the claude-task-system plugin to use a 4-level hierarchy (Epic → Spec → Stories → Tasks) with a new `.claude-tasks/` directory structure. Stories become self-contained JSON files with embedded tasks, canonical file locations replace worktree duplication, and Claude hooks enforce story scope during execution.

## Technical Approach

- **Architectural Pattern**: File-based state with git worktrees for code isolation
- **Plugin Architecture**: Skills-based (not commands) - each skill is self-contained with SKILL.md, templates/, and scripts/
- **Integration Points**: Plugin skills infrastructure (SKILL.md format, frontmatter, skill-scoped hooks), git worktrees, GitHub CLI
- **Development Strategy**: Incremental - new skills alongside existing, phased migration

### Why Skills over Commands

| Aspect | Commands | Skills |
|--------|----------|--------|
| **Structure** | Single .md file | Directory with SKILL.md + resources |
| **Discovery** | Explicit invocation only | Automatic based on context |
| **Files** | Instructions in separate `instructions/` folder | Everything co-located in skill folder |
| **Scripts** | Separate `scripts/` folder | Scripts in `skills/<name>/scripts/` |
| **Hooks** | Global `hooks.json` | Skill-scoped in SKILL.md frontmatter |
| **Visibility** | Always visible | Controllable via `user-invocable` |

**Key benefit**: Skills provide better organization by co-locating all related files (instructions, templates, scripts) within a single directory, eliminating the need for cross-referencing between `commands/`, `instructions/`, and `scripts/` folders.

## System Architecture

### Components

All functionality is implemented as **Skills** rather than slash commands. Each skill is a self-contained directory with:
- `SKILL.md` - Core instructions with YAML frontmatter
- `templates/` - Associated template files (referenced from SKILL.md)
- `scripts/` - Utility scripts (executed, not loaded into context)

1. **Directory Manager (`init` skill)**
   - **Purpose**: Initialize and manage `.claude-tasks/` structure
   - **Responsibilities**: Create directories, validate structure, manage gitignore
   - **Files**: `skills/init/SKILL.md`, `skills/init/scripts/init_structure.sh`

2. **Epic Manager (`epic` skill)**
   - **Purpose**: Create and manage epic.md files
   - **Responsibilities**: Generate epic from user input, validate structure
   - **Files**: `skills/epic/SKILL.md`, `skills/epic/templates/epic-template.md`

3. **Spec Manager (`spec` skill)**
   - **Purpose**: Create technical specifications for epics
   - **Responsibilities**: Generate spec.md with architecture decisions
   - **Files**: `skills/spec/SKILL.md`, `skills/spec/templates/spec-template.md`

4. **Story Generator (`stories` skill)**
   - **Purpose**: Break down specs into executable stories
   - **Responsibilities**: Parse spec, generate story.json files, create worktrees
   - **Files**: `skills/stories/SKILL.md`, `skills/stories/templates/story-template.json`, `skills/stories/scripts/create_worktree.sh`

5. **Story Executor (`implement` skill)**
   - **Purpose**: Run autonomous story implementation
   - **Responsibilities**: Spawn workers, track progress, handle completion
   - **Files**: `skills/implement/SKILL.md`, `skills/implement/scripts/implement.py`, `skills/implement/worker-prompt.md`

6. **Scope Enforcer (embedded in `implement` skill)**
   - **Purpose**: Constrain agents to assigned story files
   - **Responsibilities**: Block writes to other stories' task files
   - **Files**: `skills/implement/scripts/scope_validator.sh` (invoked via skill hooks)

7. **List Manager (`list` skill)**
   - **Purpose**: Display epic and story status
   - **Responsibilities**: Scan directories, derive status from filesystem/git
   - **Files**: `skills/list/SKILL.md`, `skills/list/scripts/list_stories.py`

8. **Resolver (`resolve` skill)**
   - **Purpose**: Resolve blocked story execution
   - **Responsibilities**: Analyze blockers, propose solutions
   - **Files**: `skills/resolve/SKILL.md`

9. **Story Viewer (`story` skill)**
   - **Purpose**: Display story details and status
   - **Responsibilities**: Show story.json content, current status
   - **Files**: `skills/story/SKILL.md`

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          User Invokes Skills                             │
├─────────┬─────────┬──────────┬─────────┬───────────┬─────────┬─────────┤
│ /init   │ /epic   │ /spec    │/stories │/implement │ /list   │/resolve │
└────┬────┴────┬────┴────┬─────┴────┬────┴─────┬─────┴────┬────┴────┬────┘
     │         │         │          │          │          │         │
     v         v         v          v          v          v         v
┌─────────────────────────────────────────────────────────────────────────┐
│                         plugin/skills/                                   │
├─────────┬─────────┬──────────┬─────────┬───────────┬─────────┬─────────┤
│  init/  │  epic/  │  spec/   │stories/ │implement/ │  list/  │resolve/ │
│SKILL.md │SKILL.md │SKILL.md  │SKILL.md │SKILL.md   │SKILL.md │SKILL.md │
│scripts/ │templates│templates │templates│scripts/   │scripts/ │         │
│         │         │scripts/  │scripts/ │worker.md  │         │         │
└────┬────┴────┬────┴────┬─────┴────┬────┴─────┬─────┴────┬────┴────┬────┘
     │           │          │          │           │          │         │
     └───────────┴──────────┴────┬─────┴───────────┴──────────┴─────────┘
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
                    │   (Skill-scoped hooks) │
                    └────────────────────────┘
```

### Data Flow

**Epic → Spec → Stories → Execution:**

1. User invokes `/epic <name>` skill → epic.md created in `.claude-tasks/epics/<slug>/`
2. User invokes `/spec` skill → spec.md created alongside epic.md
3. User invokes `/stories` skill → story.json files created in `stories/<slug>/`
4. For each story, git worktree created in `.claude-tasks/worktrees/`
5. User invokes `/implement <story>` skill → orchestrator spawns workers
6. Workers read story.json, write to journal.md (canonical location)
7. Scope enforcer (skill-scoped hooks) blocks writes to other stories' files
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

### Entity: Story (story.json)

```json
{
  "id": "<story-slug>",
  "title": "<descriptive title>",
  "status": "ready | in-progress | review | done",
  "context": "<self-contained description>",
  "interface": {
    "inputs": ["<dependencies>"],
    "outputs": ["<what this produces>"]
  },
  "acceptance_criteria": [
    "<verifiable condition>"
  ],
  "dependencies": {
    "blocked_by": ["<story-slug>"],
    "blocks": ["<story-slug>"]
  },
  "tasks": [
    {
      "id": "t1",
      "title": "<task title>",
      "status": "pending | in-progress | done",
      "guidance": ["<implementation detail>"],
      "references": ["<file path>"],
      "avoid": ["<anti-pattern>"],
      "done_when": ["<verification>"],
      "blocked_by": ["t0"]
    }
  ]
}
```

**Relationships**:
- Story belongs to Epic (via directory structure)
- Story has many Tasks (embedded)
- Stories can depend on other Stories (blocked_by/blocks)
- Tasks can depend on other Tasks within same story

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

1. Create `plugin/skills/` directory structure
2. Create `init` skill with SKILL.md and init_structure.sh
3. Update .gitignore for worktrees path
4. Create JSON schema for story.json validation

**Success Criteria**: `/init` skill creates valid `.claude-tasks/` directory structure

### Phase 2: Epic & Spec Skills

1. Create `epic` skill with SKILL.md and epic-template.md
2. Create `spec` skill with SKILL.md, spec-template.md, and identifier_resolver.py
3. Implement epic slug generation in SKILL.md instructions
4. Add context detection (auto-detect current epic)

**Success Criteria**: Can create epic and spec documents with proper structure

### Phase 3: Story Generation

1. Create `stories` skill with SKILL.md, story-template.json, and create_worktree.sh
2. Implement story.json generation from spec
3. Create git worktree for each story via script
4. Create PR for each story branch via script
5. Create `story` skill for status display

**Success Criteria**: Can generate stories with worktrees and PRs from a spec

### Phase 4: Execution & Scope Enforcement

1. Create `implement` skill with SKILL.md, implement.py, worker-prompt.md, scope_validator.sh
2. Implement skill-scoped hooks in SKILL.md frontmatter
3. Update orchestrator (implement.py) for story.json format
4. Update worker prompt for task-based execution
5. Update journal.md path to canonical location

**Success Criteria**: Can execute stories autonomously with scope enforcement

### Phase 5: List & Status

1. Create `list` skill with SKILL.md and list_stories.py
2. Implement status derivation from filesystem/git in script
3. Add story status display formatting in SKILL.md

**Success Criteria**: `/list` skill shows accurate status for all epics and stories

### Phase 6: Resolve & Cleanup

1. Create `resolve` skill with SKILL.md
2. Update archive workflow for story completion
3. Update task-merge skill for stories

**Success Criteria**: Blocked stories can be resolved, completed stories archived properly

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
- **Plugin skills infrastructure**: SKILL.md format, skill frontmatter, skill-scoped hooks
- **implement.py**: Orchestration script (to be created in `skills/implement/scripts/`)
- **worker-prompt.md**: Worker instructions (to be created in `skills/implement/`)

### Infrastructure Requirements
- **Compute**: Local machine (CLI tool)
- **Storage**: Filesystem for `.claude-tasks/`
- **Network**: GitHub API for PR operations

## Identifier Resolution

The `/implement`, `/spec`, and `/stories` skills use `identifier_resolver.py` to resolve user input to a specific story or epic. The script runs at skill start via bash execution (`!` prefix) and injects results into the skill context.

### identifier_resolver.py

**Location**:
- `skills/spec/scripts/identifier_resolver.py` (for epic resolution)
- `skills/implement/scripts/identifier_resolver.py` (for story resolution)

**Purpose**: Resolve flexible identifiers to story or epic metadata.

**Input**:
```bash
# For stories (default)
python ${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/identifier_resolver.py "<query>" --project-root "$(pwd)"
python ${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/identifier_resolver.py "<query>" --type story --project-root "$(pwd)"

# For epics
python ${CLAUDE_PLUGIN_ROOT}/skills/spec/scripts/identifier_resolver.py "<query>" --type epic --project-root "$(pwd)"
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
- Only supports V2 story.json format (no V1 task.json support)

### Multiple Match Handling

When `identifier_resolver.py` returns multiple matches, skills use `AskUserQuestion`:

For stories:
```
question: "Which story do you want to implement?"
header: "Story"
multiSelect: false
options: [
  {label: "<epic-slug>/<story-id>", description: "<title> - <status>: <context>"}
]
```

For epics:
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

All functionality is organized as **Skills**. Each skill is a self-contained directory with its own templates and scripts. No separate `instructions/` folder - everything lives within the skill.

```
plugin/
├── skills/
│   ├── init/
│   │   ├── SKILL.md              # Skill definition + instructions
│   │   └── scripts/
│   │       └── init_structure.sh # Directory creation script
│   ├── epic/
│   │   ├── SKILL.md              # Epic creation instructions
│   │   └── templates/
│   │       └── epic-template.md  # Epic markdown template
│   ├── spec/
│   │   ├── SKILL.md              # Spec creation instructions
│   │   ├── templates/
│   │   │   └── spec-template.md  # Spec markdown template
│   │   └── scripts/
│   │       └── identifier_resolver.py  # Epic resolution
│   ├── stories/
│   │   ├── SKILL.md              # Story generation instructions
│   │   ├── templates/
│   │   │   └── story-template.json  # Story JSON template
│   │   └── scripts/
│   │       └── create_worktree.sh   # Worktree + PR creation
│   ├── story/
│   │   └── SKILL.md              # Story viewer instructions
│   ├── list/
│   │   ├── SKILL.md              # List display instructions
│   │   └── scripts/
│   │       └── list_stories.py   # Status derivation script
│   ├── implement/
│   │   ├── SKILL.md              # Orchestration instructions
│   │   ├── worker-prompt.md      # Worker agent instructions
│   │   └── scripts/
│   │       ├── implement.py      # Orchestrator script
│   │       ├── identifier_resolver.py  # Story resolution
│   │       └── scope_validator.sh     # Scope enforcement
│   └── resolve/
│       └── SKILL.md              # Blocker resolution instructions
└── .claude-plugin/
    └── plugin.json               # Plugin manifest (no hooks.json needed)
```

**Key changes from commands-based architecture:**
- No `commands/` folder - skills provide the same functionality
- No `instructions/` folder - instructions live in `SKILL.md`
- Scripts and templates are co-located with each skill
- Hooks are defined per-skill in SKILL.md frontmatter (not global hooks.json)

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
│   │               ├── story.json
│   │               └── journal.md
│   ├── archive/
│   │   └── <epic-slug>/
│   │       └── <story-slug>/
│   │           ├── story.json
│   │           └── journal.md
│   └── worktrees/           # gitignored
│       └── <epic-slug>/
│           └── <story-slug>/
│               └── [full code checkout]
└── .gitignore               # includes .claude-tasks/worktrees/
```

## Skill Specifications

Each skill is defined in a `SKILL.md` file with YAML frontmatter. The `!`command`` syntax executes bash commands before skill processing, with output injected into context.

### init Skill

**File**: `skills/init/SKILL.md`

```yaml
---
name: init
description: Initialize .claude-tasks/ directory structure for the Task System V2. Use when setting up epic/story workflow in a project.
allowed-tools: Bash(mkdir:*), Bash(echo:*)
---

# Initialize Task System

Run the initialization script to create the directory structure:

!`bash ${CLAUDE_PLUGIN_ROOT}/skills/init/scripts/init_structure.sh "$(pwd)"`

Report the results to the user.
```

**Behavior**:
1. Create `.claude-tasks/epics/`, `.claude-tasks/archive/`, `.claude-tasks/worktrees/`
2. Add `.claude-tasks/worktrees/` to .gitignore
3. Report success

### epic Skill

**File**: `skills/epic/SKILL.md`

```yaml
---
name: epic
description: Create a new epic document capturing vision and goals. Use when starting a large feature or initiative.
---

# Create Epic

**User input**: $ARGUMENTS

## Instructions

1. Parse epic description from arguments
2. Generate slug from description (AI-assisted for meaningful slug)
3. Create `.claude-tasks/epics/<slug>/`
4. Read the template: [epic-template.md](templates/epic-template.md)
5. Generate epic.md with AI assistance, clarifying ambiguities with user
6. Save epic.md
```

### spec Skill

**File**: `skills/spec/SKILL.md`

```yaml
---
name: spec
description: Create a technical specification for an epic. Use when ready to plan implementation details for an epic.
allowed-tools: Bash(python:*), Read, Write, AskUserQuestion
---

# Create Technical Spec

**User input**: $ARGUMENTS

## Epic Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/skills/spec/scripts/identifier_resolver.py "$ARGUMENTS" --type epic --project-root "$(pwd)"`

## Instructions

Based on the epic resolution above:

1. **If resolved=true**: Proceed with spec creation
   - Compute path: `.claude-tasks/epics/<epic_slug>/`
   - Read epic.md
   - Read the template: [spec-template.md](templates/spec-template.md)
   - Generate spec.md with 7-phase planning process
   - Create ADRs for significant decisions
   - Save spec.md

2. **If resolved=false with epics array**: Multiple matches found
   - Use AskUserQuestion to let user choose:
     - question: "Which epic do you want to create a spec for?"
     - header: "Epic"
     - options: [{label: "<slug>"}]  (no description - only slugs available)
   - After selection, proceed with spec creation

3. **If resolved=false with error**: No match found
   - Display the error message to user
   - Suggest using `/list epics` to see available epics
```

### stories Skill

**File**: `skills/stories/SKILL.md`

```yaml
---
name: stories
description: Generate stories from a technical spec. Use when breaking down a spec into executable work units.
allowed-tools: Bash(python:*), Bash(git:*), Bash(gh:*), Read, Write, AskUserQuestion
---

# Generate Stories

**User input**: $ARGUMENTS

## Epic Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/skills/spec/scripts/identifier_resolver.py "$ARGUMENTS" --type epic --project-root "$(pwd)"`

## Instructions

1. Detect or parse epic context from resolution
2. Read epic.md and spec.md
3. Read the template: [story-template.json](templates/story-template.json)
4. Generate story breakdown (AI-assisted)
5. For each story:
   - Create `stories/<slug>/story.json`
   - Run: `bash ${CLAUDE_PLUGIN_ROOT}/skills/stories/scripts/create_worktree.sh <epic-slug> <story-slug>`
6. Report created stories with their PR links
```

### story Skill

**File**: `skills/story/SKILL.md`

```yaml
---
name: story
description: Show story details and current status. Use when checking on a specific story.
allowed-tools: Bash(python:*), Read
---

# Show Story Details

**User input**: $ARGUMENTS

## Story Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/identifier_resolver.py "$ARGUMENTS" --project-root "$(pwd)"`

## Instructions

Display the resolved story's details including:
- Title and status
- Context and acceptance criteria
- Task progress
- Journal entries (if any)
```

### list Skill

**File**: `skills/list/SKILL.md`

```yaml
---
name: list
description: List epics and stories with their status. Use when checking project progress or finding work.
allowed-tools: Bash(python:*)
---

# List Epics and Stories

**User input**: $ARGUMENTS (epics|stories|all, default: all)

## Get Status

!`python ${CLAUDE_PLUGIN_ROOT}/skills/list/scripts/list_stories.py "$(pwd)" "$ARGUMENTS"`

## Instructions

Display the output in a readable format, grouped by epic.
```

### implement Skill

**File**: `skills/implement/SKILL.md`

```yaml
---
name: implement
description: Execute a story autonomously using worker agents. Use when ready to implement a story.
allowed-tools: Bash(python:*), Task(*), AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/scope_validator.sh $EPIC_SLUG $STORY_ID"
---

# Implement Story

**User input**: $ARGUMENTS

## Story Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/identifier_resolver.py "$ARGUMENTS" --project-root "$(pwd)"`

## Instructions

Based on the story resolution above:

1. **If resolved=true**: Proceed with implementation
   - Compute paths from epic_slug and story id:
     - story_json: `.claude-tasks/epics/<epic_slug>/stories/<id>/story.json`
     - journal_md: `.claude-tasks/epics/<epic_slug>/stories/<id>/journal.md`
     - worktree: `.claude-tasks/worktrees/<epic_slug>/<id>/`
   - Spawn orchestrator: `python ${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/implement.py ...`
   - Worker instructions: [worker-prompt.md](worker-prompt.md)

2. **If resolved=false with stories array**: Multiple matches found
   - Use AskUserQuestion to let user choose:
     - question: "Which story do you want to implement?"
     - header: "Story"
     - options: [{label: "<epic_slug>/<id>", description: "<title> - <status>: <context>"}]
   - After selection, proceed with implementation

3. **If resolved=false with error**: No match found
   - Display the error message to user
   - Suggest using `/list stories` to see available stories
```

### resolve Skill

**File**: `skills/resolve/SKILL.md`

```yaml
---
name: resolve
description: Resolve a blocker for a blocked story. Use when a story is blocked and needs human decision.
allowed-tools: Read, Write, AskUserQuestion
---

# Resolve Story Blocker

**User input**: $ARGUMENTS

## Story Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/identifier_resolver.py "$ARGUMENTS" --project-root "$(pwd)"`

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

### When to Use Each

- **Default (all visible)**: Standard skills like `init`, `epic`, `spec`, `stories`, `list`
- **`user-invocable: false`**: Internal skills that Claude should invoke programmatically but users shouldn't call directly
- **`disable-model-invocation: true`**: Skills that should only be invoked explicitly by users, not automatically by Claude

For Task System V2, all skills use default visibility (user-invocable, Skill tool allowed) since they are all user-facing operations.

## Scope Enforcement

Scope enforcement uses two mechanisms:

1. **Skill-scoped hooks**: The `implement` skill defines hooks in its SKILL.md frontmatter
2. **Worker --settings flag**: When spawning worker agents, implement.py passes scope hooks dynamically

### Skill-Scoped Hooks (SKILL.md)

Hooks defined in a skill's frontmatter are scoped to that skill's execution and automatically cleaned up when the skill finishes:

```yaml
# In skills/implement/SKILL.md
---
name: implement
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/scope_validator.sh $EPIC_SLUG $STORY_ID"
---
```

### Worker Dynamic Hooks (--settings)

When the orchestrator (implement.py) spawns worker agents, it passes scope enforcement hooks via `--settings`:

```python
# In skills/implement/scripts/implement.py
settings = {
    "hooks": {
        "PreToolUse": [
            {
                "matcher": "Write|Edit",
                "hooks": [
                    {
                        "type": "command",
                        "command": f"{plugin_root}/skills/implement/scripts/scope_validator.sh {epic_slug} {story_id}"
                    }
                ]
            }
        ]
    }
}

subprocess.run([
    "claude", "-p",
    "--settings", json.dumps(settings),
    # ... other args
])
```

### scope_validator.sh

**File**: `skills/implement/scripts/scope_validator.sh`

```bash
#!/bin/bash
# Validates that file writes are within allowed story scope
# Receives epic_slug and story_id as command-line arguments

EPIC_SLUG="$1"
STORY_ID="$2"

if [[ -z "$EPIC_SLUG" || -z "$STORY_ID" ]]; then
    # No scope defined, allow all writes
    exit 0
fi

ALLOWED_PATH=".claude-tasks/epics/$EPIC_SLUG/stories/$STORY_ID/"

# Hook receives tool input as JSON on stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('file_path', d.get('path', '')))" 2>/dev/null)

# If no file path found, allow (not a file operation)
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Check if path is in .claude-tasks/epics/*/stories/
if [[ "$FILE_PATH" == *".claude-tasks/epics/"*"/stories/"* ]]; then
    # Check if it's the allowed story path
    if [[ "$FILE_PATH" != *"$ALLOWED_PATH"* ]]; then
        echo "BLOCKED: Cannot modify files outside current story scope"
        echo "Allowed: $ALLOWED_PATH"
        echo "Attempted: $FILE_PATH"
        exit 1
    fi
fi

# Allow all other writes (code files, etc.)
exit 0
```

### Benefits of Skill-Scoped Hooks

1. **Self-contained**: Hooks live with the skill that uses them
2. **Auto-cleanup**: Hooks are removed when skill finishes
3. **No global state**: No hooks.json or .active-story files needed
4. **Parallel-safe**: Multiple workers with different scopes can run concurrently

## Open Questions

- [x] ~~How to pass CURRENT_STORY_SLUG to hook scripts?~~ **Resolved**: Pass epic_slug and story_id as command-line arguments to scope_validator.sh via `--settings` flag when spawning `claude -p`
- [ ] Should scope enforcement also block Read operations or just Write/Edit? **Recommendation**: Write/Edit only - agents should be able to read any file for context

## Architecture Decisions

**ADRs to create**:
- ADR 001: Canonical task file location (epics/ vs worktrees)
- ADR 002: Scope enforcement mechanism (skill-scoped hooks vs global hooks.json)
- ADR 003: Story identification (slugs vs numeric IDs)
- ADR 004: Skills vs Commands architecture (why skills provide better organization)

## Future Considerations

- Story templates for common patterns (API endpoint, UI component, etc.)
- Cross-epic story dependencies (if needed)
- Story metrics and analytics
- Integration with external issue trackers

---

**Note**: This document describes HOW to build the feature. Review and approve before generating stories.
