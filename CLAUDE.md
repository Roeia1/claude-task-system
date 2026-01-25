# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **Claude Task System** - a structured development workflow that combines human-guided epic planning with autonomous story execution. The system provides a complete lifecycle from epic ideation through story breakdown and rigorous implementation.

## Core Architecture

### Epic/Story Development Lifecycle

1. **Epic Definition Phase**
   - Define WHAT needs to be built (vision, goals, requirements)
   - Capture acceptance criteria and success metrics
   - Include high-level architecture decisions
   - Use `/create-epic` to create unified epic.md

2. **Story Generation Phase**
   - Break epics into implementable stories
   - Each story is self-contained with clear tasks
   - Stories include implementation guidance and patterns
   - Use `/generate-stories` to create stories from an epic

3. **Story Execution Phase**
   - Stories executed autonomously via `/implement` command
   - Workers complete tasks following TDD practices
   - Progress documented in journal.md throughout execution
   - Use `/resolve` when workers get blocked

### Directory Structure

When users install this plugin and run `/init`, the following structure is created:

```
.claude-tasks/                  # Created in user's project root
├── epics/                      # Epic definitions and stories
│   └── <epic-slug>/
│       ├── epic.md            # Vision, goals, architecture
│       └── stories/
│           └── <story-slug>/
│               ├── story.md   # Self-contained story definition
│               └── journal.md # Execution log (created when story starts)
├── archive/                    # Completed story archives
│   └── <epic-slug>/
│       └── <story-slug>/
│           ├── story.md
│           └── journal.md
└── worktrees/                  # Git worktrees for story isolation (gitignored)
    └── <epic-slug>/
        └── <story-slug>/      # Full project checkout
```

**Key Points:**
- Each story worktree is a full git checkout with isolation
- Story files (story.md, journal.md) live in `epics/` and are tracked in git
- Worktrees are gitignored to prevent nesting issues
- Stories link back to their parent epic for context

### Plugin Structure

```
plugin/                         # Plugin source code
├── .claude-plugin/
│   └── plugin.json            # Plugin manifest
├── commands/                   # Legacy commands (gaps to fill)
│   ├── task-list.md           # TODO: Convert to story-list
│   ├── task-cleanup.md        # TODO: Convert to story-cleanup
│   ├── task-resume.md         # TODO: Convert to story-resume
│   └── architecture-decisions.md
├── scripts/                    # Utility scripts
│   └── identifier_resolver_v2.py
├── hooks/                      # Session hooks
│   └── session-init.sh        # Context detection
├── docs/                       # Documentation
│   └── ENVIRONMENT.md
└── skills/                     # Core skills
    ├── init/                  # Initialize .claude-tasks/
    ├── create-epic/           # Create epic with vision + architecture
    ├── generate-stories/      # Generate stories from epic
    ├── generate-story/        # Create single story (internal)
    ├── execute-story/         # Autonomous /implement
    └── resolve-blocker/       # Resolve blockers with /resolve
```

### Plugin Path References

When referencing files within the plugin, always use `${CLAUDE_PLUGIN_ROOT}` instead of relative paths:

```markdown
# Correct:
`${CLAUDE_PLUGIN_ROOT}/skills/create-epic/templates/epic-template.md`

# Incorrect:
`templates/epic-template.md`
```

### Environment Variables

Environment variables are available in the bash execution environment:

```bash
echo $CLAUDE_PROJECT_DIR
```

**Available Variables:**

| Variable | Description | Context |
|----------|-------------|---------|
| `CLAUDE_PROJECT_DIR` | Project root directory | Always |
| `CLAUDE_PLUGIN_ROOT` | Plugin installation directory | Always |
| `TASK_CONTEXT` | `"main"` or `"story-worktree"` | Always |
| `EPIC_SLUG` | Epic identifier | Story worktree |
| `STORY_SLUG` | Story identifier | Story worktree |
| `STORY_DIR` | Path to story files | Story worktree |

For full documentation see: `plugin/docs/ENVIRONMENT.md`

### Dynamic Story Status

Story status is derived from filesystem and git state:

| Status | Signal |
|--------|--------|
| PENDING | Worktree exists, no `journal.md` |
| IN_PROGRESS | Worktree exists, `journal.md` present |
| BLOCKED | IN_PROGRESS with unresolved blocker in journal |
| REMOTE | Open PR with story branch, no local worktree |
| COMPLETED | PR merged, files archived |

## Development Commands

### Initial Setup (Run Once)

```bash
/init
# Creates .claude-tasks/ structure:
# - epics/, archive/, worktrees/
# - Adds gitignore pattern for worktrees
```

### Epic and Story Workflow

```bash
# 1. Create an epic
/create-epic user authentication system
# Creates: .claude-tasks/epics/user-auth/epic.md
# Output: Vision, goals, architecture, success criteria

# 2. Generate stories from epic
/generate-stories user-auth
# Creates: .claude-tasks/epics/user-auth/stories/<story-slug>/story.md
# Also creates: worktree + branch + PR for each story

# 3. Implement a story autonomously
/implement login-flow
# Spawns workers to implement the story
# Workers follow TDD, document in journal.md
# Exit states: FINISH, BLOCKED, TIMEOUT, MAX_CYCLES

# 4. Resolve blockers when needed
/resolve login-flow
# Analyzes blocker from journal.md
# Proposes solutions for human approval
# Documents resolution for next worker
```

### Architecture Decision Records

```bash
# Create ADR - use natural language
# Say: "create ADR for JWT vs session-based auth"
# Uses standard template with problem/options/decision/consequences
```

## Critical Execution Rules

### Autonomous Execution

Stories are executed autonomously using the `/implement` command. The orchestrator spawns worker Claude instances that:

1. Read story.md for tasks and guidance
2. Complete tasks following TDD practices
3. Document progress in journal.md
4. Exit with status: FINISH (all done), BLOCKED (needs human decision), or TIMEOUT

When a worker gets BLOCKED, use `/resolve` to analyze and provide a resolution, then continue with `/implement`.

### Non-Negotiable Rules

- **Test-Driven Development**: Tests must be written before implementation
- **No Test Modification**: After tests are written, they can only be changed with explicit user approval
- **Continuous Journaling**: Document decisions and insights in journal.md throughout execution
- **Commit Discipline**: Commit and push at logical milestones
- **ADR Documentation**: Create ADRs for all significant architectural decisions

### Git Commit Format

```bash
# Story-based commits
git commit -m "test(story-slug): add comprehensive test suite for [feature]"
git commit -m "feat(story-slug): implement core [component] functionality"
git commit -m "fix(story-slug): resolve [issue]"

# Always commit and push together
git add . && git commit -m "..." && git push
```

## Story File Structure

### story.md

Stories use markdown with structured sections:

```markdown
# Story: [Title]

## Context
Link to parent epic and relevant background.

## Tasks
1. **Task Name**
   - Implementation guidance
   - Patterns to follow
   - Test requirements

## References
- Related files and patterns
- API contracts
- Design decisions

## Acceptance Criteria
- Testable success conditions
```

### journal.md

Workers document progress in journal.md:

```markdown
## Session: [ISO timestamp]

### Completed
- Task X: [what was done]

### Decisions
- [technical decision]: [rationale]

### Next Steps
- [what remains]

---

## Blocker: [Title]

**Task**: [Which task is blocked]
**What I'm trying to do**: [Description]
**What I tried**: [Approaches attempted]
**What I need**: [Decision or information required]
**Suggested options**: [If ideas exist]

---

## Resolution: [Blocker Title]

**Decision**: [Chosen approach]
**Implementation guidance**: [Steps for next worker]
**Rationale**: [Why this approach]
**Approved**: [ISO timestamp]
```

## Important Notes

- **Epic-Driven Development**: Epics define vision, stories deliver value
- **Human-Guided Planning**: Epic creation and story generation require human approval
- **Autonomous Execution**: Stories execute independently with `/implement`
- **Scope Enforcement**: Workers stay within story worktree boundaries
- **Document Decisions**: Use ADRs for significant architectural choices
- **Keep Complexity Minimal**: Only add what's directly needed

## Known Gaps (TODO)

The following V2 equivalents need to be implemented:

1. **Story List** - List all epics/stories with status (replaces `/task-list`)
2. **Story Cleanup** - Remove completed story worktrees (replaces `/task-cleanup`)
3. **Story Resume** - Resume remote story locally (replaces `/task-resume`)
4. **Story Merge** - Archive and merge completed stories (replaces `task-merge` skill)
