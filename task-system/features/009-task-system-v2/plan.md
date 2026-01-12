# Technical Plan: Task System V2 - Epic/Story Architecture

**Feature**: [feature.md](./feature.md)
**Created**: 2026-01-12
**Status**: Draft

## Executive Summary

Restructure the claude-task-system plugin to use a 4-level hierarchy (Epic → Spec → Stories → Tasks) with a new `.claude-tasks/` directory structure. Stories become self-contained JSON files with embedded tasks, canonical file locations replace worktree duplication, and Claude hooks enforce story scope during execution.

## Technical Approach

- **Architectural Pattern**: File-based state with git worktrees for code isolation
- **Integration Points**: Existing plugin infrastructure (commands, skills, agents), git worktrees, GitHub CLI
- **Development Strategy**: Incremental - new commands alongside existing, phased migration

## System Architecture

### Components

1. **Directory Manager**
   - **Purpose**: Initialize and manage `.claude-tasks/` structure
   - **Responsibilities**: Create directories, validate structure, manage gitignore
   - **Interfaces**: Shell scripts, called by `/init` command

2. **Epic Manager**
   - **Purpose**: Create and manage epic.md files
   - **Responsibilities**: Generate epic from user input, validate structure
   - **Interfaces**: `/epic` command → INSTRUCTIONS.md → templates

3. **Spec Manager**
   - **Purpose**: Create technical specifications for epics
   - **Responsibilities**: Generate spec.md with architecture decisions
   - **Interfaces**: `/spec` command, reads epic.md, writes spec.md

4. **Story Generator**
   - **Purpose**: Break down specs into executable stories
   - **Responsibilities**: Parse spec, generate story.json files, create worktrees
   - **Interfaces**: `/stories` command, Python scripts for git operations

5. **Story Executor (Orchestrator)**
   - **Purpose**: Run autonomous story implementation
   - **Responsibilities**: Spawn workers, track progress, handle completion
   - **Interfaces**: `/implement` command, implement.py script, worker-prompt.md

6. **Scope Enforcer**
   - **Purpose**: Constrain agents to assigned story files
   - **Responsibilities**: Block writes to other stories' task files
   - **Interfaces**: Claude hooks (PreToolUse), validation script

7. **List Manager**
   - **Purpose**: Display epic and story status
   - **Responsibilities**: Scan directories, derive status from filesystem/git
   - **Interfaces**: `/list` command, Python script

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Commands                             │
├─────────┬─────────┬──────────┬─────────┬───────────┬───────────┤
│ /init   │ /epic   │ /spec    │/stories │/implement │ /list     │
└────┬────┴────┬────┴────┬─────┴────┬────┴─────┬─────┴─────┬─────┘
     │         │         │          │          │           │
     v         v         v          v          v           v
┌─────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────┐
│Directory│ │  Epic   │ │  Spec  │ │ Story  │ │  Story  │ │ List │
│ Manager │ │ Manager │ │Manager │ │Generator│ │Executor │ │Manager│
└────┬────┘ └────┬────┘ └───┬────┘ └───┬────┘ └────┬────┘ └──┬───┘
     │           │          │          │           │          │
     └───────────┴──────────┴────┬─────┴───────────┴──────────┘
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
                    │   (Claude Hooks)       │
                    └────────────────────────┘
```

### Data Flow

**Epic → Spec → Stories → Execution:**

1. User runs `/epic <name>` → epic.md created in `.claude-tasks/epics/<slug>/`
2. User runs `/spec` → spec.md created alongside epic.md
3. User runs `/stories` → story.json files created in `stories/<slug>/`
4. For each story, git worktree created in `.claude-tasks/worktrees/`
5. User runs `/implement <story>` → orchestrator spawns workers
6. Workers read story.json, write to journal.md (canonical location)
7. Scope enforcer blocks writes to other stories' files
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

1. Create `.claude-tasks/` directory structure via `/init` command
2. Implement directory manager (init script)
3. Update .gitignore for worktrees path
4. Create JSON schema for story.json validation

**Success Criteria**: `/claude-task-system:init` creates valid directory structure

### Phase 2: Epic & Spec Commands

1. Create `/epic` command with epic.md template
2. Create `/spec` command with spec.md template
3. Implement epic slug generation
4. Add context detection (auto-detect current epic)

**Success Criteria**: Can create epic and spec documents with proper structure

### Phase 3: Story Generation

1. Create `/stories` command
2. Implement story.json generation from spec
3. Create git worktree for each story
4. Create PR for each story branch
5. Implement `/story` command for status display

**Success Criteria**: Can generate stories with worktrees and PRs from a spec

### Phase 4: Execution & Scope Enforcement

1. Update `/implement` to work with story.json
2. Update orchestrator to read story.json format
3. Update worker prompt for task-based execution
4. Implement Claude hooks for scope enforcement
5. Update journal.md path to canonical location

**Success Criteria**: Can execute stories autonomously with scope enforcement

### Phase 5: List & Status

1. Create `/list` command with filtering
2. Implement status derivation from filesystem/git
3. Add story status display

**Success Criteria**: `/list` shows accurate status for all epics and stories

### Phase 6: Archive & Cleanup

1. Update archive workflow for story completion
2. Update task-merge skill for stories
3. Implement story cleanup

**Success Criteria**: Completed stories archived properly, worktrees cleaned

## Testing Strategy

### Unit Testing
- **Coverage Target**: Key scripts (identifier resolver, story generator)
- **Focus Areas**: JSON schema validation, path resolution, status derivation
- **Framework**: pytest (existing)

### Integration Testing
- **Scope**: Full workflow from epic creation to story completion
- **Test Scenarios**:
  1. Create epic → spec → stories → implement → complete
  2. Scope enforcement blocks cross-story writes
  3. Multiple concurrent stories in same epic

### End-to-End Testing
- **User Flows**:
  1. New user initializes project and creates first epic
  2. Existing user adds stories to epic and implements them
  3. User resolves blocked story and continues

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
- **Existing plugin infrastructure**: Commands, skills, agents pattern
- **implement.py**: Orchestration script (requires updates)
- **worker-prompt.md**: Worker instructions (requires updates)

### Infrastructure Requirements
- **Compute**: Local machine (CLI tool)
- **Storage**: Filesystem for `.claude-tasks/`
- **Network**: GitHub API for PR operations

## Story Identifier Resolution

The `/implement` command uses `identifier_resolver.py` to resolve user input to a specific story. The script runs at command start via bash execution (`!` prefix) and injects results into the command context.

### identifier_resolver.py

**Purpose**: Resolve flexible identifiers (story slug, story title) to story metadata.

**Input**:
```bash
python identifier_resolver.py "<query>" --project-root "$(pwd)"
```

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

**Design Decisions**:
- Context field truncated to 300 characters max
- No paths in output - command computes paths from `epic_slug` + `id`
- Returns JSON with `error` field on no match (exit 0, not throw)
- Only supports V2 story.json format (no V1 task.json support)

### Multiple Match Handling

When `identifier_resolver.py` returns multiple matches, the `/implement` command uses `AskUserQuestion`:

```
question: "Which story do you want to implement?"
header: "Story"
multiSelect: false
options: [
  {label: "<epic-slug>/<story-id>", description: "<title> - <status>: <context>"}
]
```

## File Structure Changes

### New Plugin Structure

```
plugin/
├── commands/
│   ├── init.md              # Update for .claude-tasks/
│   ├── epic.md              # NEW
│   ├── spec.md              # NEW
│   ├── stories.md           # NEW
│   ├── story.md             # NEW
│   ├── list.md              # NEW (replaces task-list.md)
│   ├── implement.md         # Update for story.json
│   └── resolve.md           # Update for story context
├── instructions/
│   ├── epic/
│   │   ├── INSTRUCTIONS.md
│   │   └── templates/
│   │       └── epic-template.md
│   ├── spec/
│   │   ├── INSTRUCTIONS.md
│   │   └── templates/
│   │       └── spec-template.md
│   ├── stories/
│   │   ├── INSTRUCTIONS.md
│   │   └── templates/
│   │       └── story-template.json
│   ├── implement/
│   │   └── INSTRUCTIONS.md  # Update
│   └── orchestration/
│       └── worker-prompt.md # Update
├── scripts/
│   ├── init_structure.sh    # NEW
│   ├── identifier_resolver.py # UPDATE for story.json
│   ├── scope_validator.sh   # NEW
│   └── implement.py         # Update
└── hooks/
    └── hooks.json           # Update with scope enforcement
```

### User Project Structure

```
project/
├── .claude-tasks/
│   ├── .active-story        # Transient file during /implement (gitignored)
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
└── .gitignore               # includes .claude-tasks/worktrees/ and .claude-tasks/.active-story
```

## Command Specifications

### /claude-task-system:init

```markdown
---
description: "Initialize .claude-tasks/ structure"
---
```

**Behavior**:
1. Create `.claude-tasks/epics/`, `.claude-tasks/archive/`, `.claude-tasks/worktrees/`
2. Add to .gitignore:
   - `.claude-tasks/worktrees/`
   - `.claude-tasks/.active-story`
3. Report success

### /claude-task-system:epic

```markdown
---
description: "Create new epic"
argument-hint: "<name>"
---
```

**Behavior**:
1. Parse epic name from arguments
2. Generate slug from name
3. Create `.claude-tasks/epics/<slug>/`
4. Generate epic.md from template with AI assistance
5. Clarification loop for ambiguities
6. Save epic.md

### /claude-task-system:spec

```markdown
---
description: "Create spec for epic"
argument-hint: "[epic-slug]"
---
```

**Behavior**:
1. Detect or parse epic context
2. Read epic.md
3. Generate spec.md with 7-phase planning process
4. Create ADRs for significant decisions
5. Save spec.md

### /claude-task-system:stories

```markdown
---
description: "Generate stories from spec"
argument-hint: "[epic-slug]"
---
```

**Behavior**:
1. Detect or parse epic context
2. Read epic.md and spec.md
3. Generate story breakdown (AI-assisted)
4. For each story:
   - Create `stories/<slug>/story.json`
   - Create git branch `story/<epic>/<story>`
   - Create git worktree in `.claude-tasks/worktrees/`
   - Create draft PR
5. Report created stories

### /claude-task-system:implement

```markdown
---
description: "Execute story autonomously"
argument-hint: "<story-slug-or-title>"
allowed-tools: Bash(python:*), Task(*), AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/scope_validator.sh"
---

## Story Resolution

!`python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "$ARGUMENTS" --project-root "$(pwd)"`

## Instructions

Based on the story resolution above:

1. **If resolved=true**: Proceed with implementation
   - Compute paths from epic_slug and story id:
     - story_json: `.claude-tasks/epics/<epic_slug>/stories/<id>/story.json`
     - journal_md: `.claude-tasks/epics/<epic_slug>/stories/<id>/journal.md`
     - worktree: `.claude-tasks/worktrees/<epic_slug>/<id>/`
   - Write current story path to `.claude-tasks/.active-story` for scope enforcement
   - Spawn orchestrator with computed paths

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

**Behavior**:
1. Run identifier_resolver.py via `!` prefix (output injected into context)
2. Handle resolution result (single match, multiple matches, or error)
3. For single match: compute paths, write active story file, spawn orchestrator
4. For multiple matches: prompt user with AskUserQuestion, then proceed
5. For no match: display error and exit

## Scope Enforcement Hook

Scope enforcement uses a `.claude-tasks/.active-story` file to track which story is currently being implemented. The `/implement` command writes this file before spawning the orchestrator, and the scope validator reads it to determine allowed paths.

### Active Story File

Written by `/implement` command before spawning orchestrator:

```
# .claude-tasks/.active-story
epic_slug=auth-system
story_id=user-login
```

### hooks.json Addition

Hooks are defined in the `/implement` command frontmatter (scoped to command execution):

```yaml
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "${CLAUDE_PLUGIN_ROOT}/scripts/scope_validator.sh"
```

### scope_validator.sh

```bash
#!/bin/bash
# Validates that file writes are within allowed story scope
# Reads active story from .claude-tasks/.active-story

# Find project root (where .claude-tasks/ exists)
PROJECT_ROOT="$(pwd)"
while [[ "$PROJECT_ROOT" != "/" ]]; do
    if [[ -d "$PROJECT_ROOT/.claude-tasks" ]]; then
        break
    fi
    PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

ACTIVE_STORY_FILE="$PROJECT_ROOT/.claude-tasks/.active-story"

# If no active story file, allow all writes (not in /implement context)
if [[ ! -f "$ACTIVE_STORY_FILE" ]]; then
    exit 0
fi

# Read active story context
source "$ACTIVE_STORY_FILE"
ALLOWED_PATH=".claude-tasks/epics/$epic_slug/stories/$story_id/"

# Hook receives tool input as JSON on stdin
# Parse file_path from the JSON input
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

### Cleanup

The `/implement` command should remove `.claude-tasks/.active-story` when:
- Story implementation completes successfully
- Story becomes BLOCKED
- User cancels implementation

## Open Questions

- [x] ~~How to pass CURRENT_STORY_SLUG to hook scripts?~~ **Resolved**: Use `.claude-tasks/.active-story` file written by `/implement` command
- [ ] Should scope enforcement also block Read operations or just Write/Edit? **Recommendation**: Write/Edit only - agents should be able to read any file for context

## Architecture Decisions

**ADRs to create**:
- ADR 001: Canonical task file location (epics/ vs worktrees)
- ADR 002: Scope enforcement mechanism (hooks vs sparse-checkout)
- ADR 003: Story identification (slugs vs numeric IDs)

## Future Considerations

- Story templates for common patterns (API endpoint, UI component, etc.)
- Cross-epic story dependencies (if needed)
- Story metrics and analytics
- Integration with external issue trackers

---

**Note**: This document describes HOW to build the feature. Review and approve before generating stories.
