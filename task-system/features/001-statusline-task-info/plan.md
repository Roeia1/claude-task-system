# Technical Plan: Statusline Task System Integration

**Feature**: [001-statusline-task-info](./feature.md)
**Created**: 2025-12-12
**Status**: Approved

## Executive Summary

Build a statusline script that displays task system context (current task, type, feature, counts) in Claude Code's statusline. Distributed as both an npm package (for npx convenience) and a standalone bash script (for performance). Designed to be chainable with existing statusline tools like claude-powerline.

## Technical Approach

- **Architectural Pattern**: Single-script utility with modular functions
- **Integration Points**: Claude Code statusline command, filesystem (task-system/), git branches
- **Development Strategy**: Incremental phases, foundation first, then task info, then counts

## System Architecture

### Components

1. **Context Detector**
   - **Purpose**: Determine if running in main repo or task worktree
   - **Responsibilities**: Source `$CLAUDE_ENV_FILE` to read pre-detected context
   - **Interfaces**: `$CLAUDE_ENV_FILE` (set by session-init hook)

2. **File Parsers**
   - **Purpose**: Extract structured data from task.md and feature.md files
   - **Responsibilities**: Parse task title, type, feature reference, feature status
   - **Interfaces**: Grep/awk on markdown files

3. **Status Scanner**
   - **Purpose**: Count tasks and features by status
   - **Responsibilities**: Scan worktrees, check journal presence, query git branches, read feature statuses
   - **Interfaces**: Filesystem, git CLI

4. **Output Formatter**
   - **Purpose**: Assemble final statusline string
   - **Responsibilities**: Apply icons, handle separators, combine sections
   - **Interfaces**: STDOUT

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      task-status                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ Context Detector │    │  Output Formatter │                   │
│  │                  │    │                   │                   │
│  │ - detect_worktree│    │ - format_task()   │                   │
│  │ - detect_main()  │    │ - format_counts() │                   │
│  └────────┬─────────┘    └─────────┬─────────┘                   │
│           │                        │                             │
│           v                        │                             │
│  ┌──────────────────┐              │                             │
│  │   File Parsers   │──────────────┘                             │
│  │                  │                                            │
│  │ - parse_task_md()│         ┌─────────────────┐               │
│  │ - parse_feature()│         │  Status Scanner  │               │
│  └──────────────────┘         │                  │               │
│                               │ - count_tasks()  │               │
│                               │ - count_features │               │
│                               └─────────────────┘               │
│                                                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                v
                         ┌──────────────┐
                         │   STDOUT     │
                         │ (composable) │
                         └──────────────┘
```

### Data Flow

1. Script invoked by Claude Code statusline (or manually)
2. Source `$CLAUDE_ENV_FILE` to get pre-detected context (`TASK_CONTEXT`, `CURRENT_TASK_ID`, `CLAUDE_SPAWN_DIR`)
3. File parsers extract task/feature data as needed (using `CURRENT_TASK_ID` to locate files)
4. Status scanner counts tasks and features by status
5. Output formatter assembles final string
6. Result printed to STDOUT (chained with other statusline output)

### Integration with Session Hook

The `session-init.sh` hook (runs at SessionStart) already detects and persists:

```bash
# Written to $CLAUDE_ENV_FILE:
export CLAUDE_SPAWN_DIR="/path/to/project"  # Original spawn directory
export TASK_CONTEXT="worktree"               # "worktree" or "main"
export CURRENT_TASK_ID="015"                 # Task ID (if in worktree)
```

The statusline script sources this file for instant context access, avoiding re-detection on every refresh.

## Technology Choices

### Core Technologies

- **Language/Runtime**: Bash - *Rationale: Zero dependencies, fast startup, native filesystem access*
- **Package Distribution**: npm - *Rationale: Easy installation via npx, familiar to developers*

### Tools & Commands Used

| Tool | Purpose | Notes |
|------|---------|-------|
| `grep` | Extract lines from task.md/feature.md | Use `-m1` for first match |
| `awk` | Parse specific fields | For extracting values |
| `git` | Check branches, worktree status | `git branch -r`, `git worktree list` |
| `find` | Count directories | For task/feature counting |
| `head` | Limit reads | Only read necessary lines |

### npm Package Structure

The statusline package lives in `packages/statusline/` within this repository:

```
packages/
└── statusline/                          # @claude-task-system/statusline npm package
    ├── package.json
    ├── bin/
    │   └── task-status                  # Main bash script (executable)
    ├── scripts/
    │   └── claude-task-system-statusline.sh # Downloadable standalone version
    └── README.md
```

## Data Models

### Input Data Sources

#### 1. Task Context (from worktree path + task.md)

```
Location: task-system/tasks/NNN/task-system/task-NNN/task.md

Extracted fields:
  - task_id: string (from path - used internally for file lookup)
  - task_title: string (from "# Task NNN: Title" header)
  - task_type: string (from "**Type:**" line)
  - feature_name: string (from "**Feature:**" line, extract name portion)
```

#### 2. Task Status Counts (from filesystem + git)

```
Sources:
  - Local worktrees: task-system/tasks/*/
  - Journal presence: task-system/task-NNN/journal.md in each worktree
  - Remote branches: git branch -r | grep 'task-'

Derived counts:
  - in_progress: worktree exists AND journal.md exists
  - pending: worktree exists AND no journal.md
  - remote: remote branch exists AND no local worktree
```

#### 3. Feature Status Counts (from feature.md files)

```
Location: task-system/features/*/feature.md

Extracted field:
  - status: string (from "**Status:**" line)

Derived counts:
  - Group by status value (Draft, Planned, In Progress, Complete)
```

### Output Data Structure

Visual style inspired by [claude-powerline](https://github.com/Owloops/claude-powerline), using **dark theme** with **powerline separators** as the only style (no configuration options).

```
Format: Powerline segments with arrow separators ()

Segments (all optional based on context):
[origin] [task_info] [counts]

Examples (Unicode):
  Worktree:  "⌂ 015  Add login form   auth-system  ● 2 ◐ 1 ○ 3  ◨ 1 ◧ 2"
  Main repo: "⎇ main  ● 2 ◐ 1 ○ 3  ◨ 1 ◧ 2"
  No tasks:  "⎇ main"

Examples (ASCII fallback with --no-icons):
  Worktree:  "[W] 015 | Add login form | [bug] auth-system | T:2/1/3 | F:1/2"
  Main repo: "[M] main | T:2/1/3 | F:1/2"
  No tasks:  "[M] main"
```

### Visual Style

**Powerline Separators**:
- Segment separator: `` (U+E0B0) - requires Nerd Font
- ASCII fallback: ` | `

**Dark Theme Colors** (ANSI escape codes):
| Segment | Background | Foreground |
|---------|------------|------------|
| Origin (main) | Blue (#3465a4) | White |
| Origin (worktree) | Cyan (#06989a) | Black |
| Task info | Gray (#555753) | White |
| Counts | Dark gray (#2e3436) | Light gray |

### Icon Mapping

| Element | Unicode | ASCII | Purpose |
|---------|---------|-------|---------|
| Main repo | `⎇` | `[M]` | Session in main repository |
| Worktree | `⌂` | `[W]` | Session in task worktree |
| Feature type | `✦` | `[feat]` | Task is a new feature |
| Bugfix type | `●` | `[bug]` | Task is a bug fix |
| Refactor type | `⟳` | `[refactor]` | Task is refactoring |
| Performance type | `⚡` | `[perf]` | Task is optimization |
| Deployment type | `▲` | `[deploy]` | Task is deployment |
| In-progress | `●` | `I:` | Tasks actively being worked |
| Pending | `◐` | `P:` | Tasks waiting to start |
| Remote | `○` | `R:` | Tasks only on remote |
| Feature active | `◨` | `A:` | Features in progress |
| Feature draft | `◧` | `D:` | Features in draft |

## API Contracts

### Distribution Methods

**1. npm package** (convenience):
```bash
npx -y @claude-task-system/statusline
```

**2. Bash script** (performance/offline):
```bash
# Download once
curl -o ~/.claude/claude-task-system-statusline.sh https://raw.githubusercontent.com/.../claude-task-system-statusline.sh
chmod +x ~/.claude/claude-task-system-statusline.sh

# Use
~/.claude/claude-task-system-statusline.sh
```

### Claude Code Configuration

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y @owloops/claude-powerline@latest && npx -y @claude-task-system/statusline"
  }
}
```

Or with bash script:
```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y @owloops/claude-powerline@latest && ~/.claude/claude-task-system-statusline.sh"
  }
}
```

### Script Interface

```bash
# No flags = full output (all sections)
task-status

# Additive flags - combine any sections you want
task-status --task              # Only task info
task-status --counts            # Only counts
task-status --origin            # Only origin indicator
task-status --task --counts     # Task info + counts
task-status --origin --task     # Origin + task info

# Output format control
task-status --no-icons          # Use ASCII fallbacks (no Unicode/Nerd Font)
```

**Note**: Only one visual style (dark + powerline). No theme or separator configuration.

### Flag Behavior

| Flags | Output |
|-------|--------|
| (none) | All sections |
| `--origin` | Origin indicator only |
| `--task` | Task title, type, feature |
| `--counts` | Task counts, feature counts |
| `--origin --task` | Origin + task info |
| `--task --counts` | Task info + counts |
| `--origin --task --counts` | Same as no flags (all) |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - output produced |
| 0 | No task-system found (graceful, outputs "--") |
| 1 | Error reading files (with stderr message) |

### Error Handling

- `$CLAUDE_ENV_FILE` not set or missing: Fall back to filesystem detection
- Missing files: Output graceful fallback ("--"), no error
- Malformed files: Skip field, continue with others
- No task-system directory: Output minimal info, exit 0
- Actual errors (permissions, etc.): stderr message, exit 1

## Implementation Strategy

### Phase 1: Foundation

1. Create script skeleton with argument parsing
2. Implement `--help` and `--no-icons` flags
3. Source `$CLAUDE_ENV_FILE` to read `TASK_CONTEXT`, `CURRENT_TASK_ID`, `CLAUDE_SPAWN_DIR`
4. Output origin indicator based on `TASK_CONTEXT`

**Success Criteria**: Script runs, reads context from env file, outputs origin indicator correctly in both main repo and worktree.

### Phase 2: Task Information

1. Use `CURRENT_TASK_ID` to locate `task-system/task-{ID}/task.md`
2. Parse task title from header
3. Parse task type from metadata
4. Parse feature reference from metadata
5. Format and output `--task` section

**Success Criteria**: Running `task-status --task` in a worktree outputs task title, type icon, and feature name. Outputs "--" gracefully when not in worktree or no task ID.

### Phase 3: Task Counts

1. Scan `task-system/tasks/` for local worktrees
2. Check journal.md presence in each to determine in-progress vs pending
3. Query git for remote task branches without local worktrees
4. Format counts as `in-progress/pending/remote`
5. Output `--counts` section (task portion)

**Success Criteria**: Running `task-status --counts` shows accurate task counts matching actual filesystem/git state.

### Phase 4: Feature Counts

1. Scan `task-system/features/*/feature.md`
2. Extract status from each feature.md
3. Group and count by status
4. Append feature counts to `--counts` output

**Success Criteria**: Feature counts accurately reflect status values in feature.md files.

### Phase 5: Integration & Polish

1. Combine all sections with powerline separators and ANSI colors
2. Handle edge cases (missing directories, malformed files)
3. Performance optimization (target <100ms)
4. Create npm package structure
5. Add installation documentation

**Success Criteria**: Full `task-status` output works correctly, completes in <100ms, handles all edge cases gracefully.

### Dependency Graph

```
Phase 1 (Foundation)
    │
    ├──> Phase 2 (Task Info)
    │
    └──> Phase 3 (Task Counts) ──> Phase 4 (Feature Counts)
                                        │
                                        v
                                  Phase 5 (Integration)
```

Phases 2 and 3 can be developed in parallel after Phase 1.

## Testing Strategy

### Unit Testing

- **Framework**: Jest (standard for npm packages)
- **Coverage Target**: 80%+
- **Focus Areas**:
  - Path parsing (extract task ID from worktree path)
  - File parsing (task.md, feature.md extraction)
  - Count aggregation logic
  - Icon/fallback selection
  - Flag combination handling

### Integration Testing

- **Scope**: Full script execution against mock filesystem
- **Test Scenarios**:
  1. Run in main repo with no tasks - outputs `<main> --`
  2. Run in main repo with tasks - outputs counts
  3. Run in task worktree - outputs task info + counts
  4. Run with missing task.md - graceful fallback
  5. Run with malformed files - skips bad data, continues
  6. Run outside any repo - minimal output, no crash

### Mock Filesystem Structure

```
test/fixtures/
├── main-repo/
│   └── task-system/
│       ├── tasks/
│       │   ├── 001/  (with journal.md - in-progress)
│       │   └── 002/  (no journal.md - pending)
│       └── features/
│           ├── 001-auth/feature.md (Status: In Progress)
│           └── 002-payments/feature.md (Status: Draft)
└── worktree-015/
    └── task-system/
        └── task-015/
            ├── task.md
            └── journal.md
```

### Performance Testing

- **Target**: 95th percentile < 50ms
- **Test**: Run 100 executions, measure timing
- **Baseline**: Measure npx overhead separately

### CI Pipeline

```yaml
- npm test          # Unit + integration
- npm run lint      # ESLint
- npm run perf      # Performance check
```

## Security Considerations

- **Input Validation**: No user input accepted; all data from local filesystem
- **File Access**: Read-only access to task-system/ directory
- **Command Injection**: No shell interpolation of file contents
- **No Network Access**: Purely local operation

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| npx startup overhead exceeds 100ms budget | Medium | Low | Provide bash script alternative for performance-sensitive users; both are first-class options |
| Git commands slow on large repos | Low | Medium | Use `--no-walk` and limit branch queries; cache results if needed |
| Nerd Font icons not installed | Medium | Low | `--no-icons` flag provides text fallbacks; document font requirements |
| task.md format changes break parsing | Low | Medium | Use flexible regex; fail gracefully with fallback values |
| Worktree path detection fails on edge cases | Low | Medium | Test various worktree configurations; use git commands for authoritative detection |
| Feature status values inconsistent | Medium | Low | Normalize status values; group unknown statuses as "other" |
| Remote branch detection misses task branches | Low | Low | Use consistent `task-NNN-*` naming pattern; document expected format |

## Performance Considerations

- **Expected Load**: Single execution per statusline refresh
- **Response Time Targets**: < 100ms total, < 50ms 95th percentile
- **Optimization Strategies**:
  - Lazy evaluation: Only parse files when needed
  - Early exit: Skip work if not in task-system context
  - Minimal I/O: Use `head -n 50` to limit file reads
  - No subshells where avoidable: Prefer built-in bash operations

## Dependencies

### External Services

None - purely local operation.

### Internal Dependencies

- **task-system directory structure**: Requires initialized task-system/
- **session-init.sh hook**: Must be configured to populate `$CLAUDE_ENV_FILE` with context
- **Git repository**: For remote branch detection

### Infrastructure Requirements

- **Runtime**: Bash 4.0+ (standard on Linux/macOS)
- **Optional**: Node.js/npm for npx distribution
- **Optional**: Nerd Font for icon display

## Deployment Plan

### npm Package Publishing

1. Create npm account and scope (@task-system or personal)
2. Set up package.json with bin entry
3. Test locally with `npm link`
4. Publish with `npm publish --access public`

### Bash Script Distribution

1. Include in repository under `packages/statusline/scripts/claude-task-system-statusline.sh`
2. Document curl installation command
3. Optionally host on GitHub releases

### User Installation

Document in README:
```bash
# Option 1: npx (convenient)
# Add to ~/.claude/settings.json statusLine command

# Option 2: Bash script (fast)
curl -o ~/.claude/claude-task-system-statusline.sh https://...
chmod +x ~/.claude/claude-task-system-statusline.sh
```

## Open Questions

- [x] How should piping with other scripts work? **Resolved: Chain with `&&` in statusline command**
- [x] Should we require stdin JSON? **Resolved: No, detect from filesystem only**
- [x] What npm scope to use for publishing? **Resolved: `@claude-task-system`**
- [x] Should we support configuration file? **Resolved: No, keep it simple**

## Architecture Decisions

No ADRs created for this feature. Technology choices (Bash, npm distribution) are straightforward given requirements.

## Future Considerations

- Integration with claude-powerline as a plugin/segment
- Support for additional task metadata (priority, dependencies)
- Caching layer for improved performance on repeated calls
- Color support with ANSI codes

---

**Note**: This document describes HOW to build the feature. It should be reviewed and approved before generating tasks.
