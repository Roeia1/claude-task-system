# Task 002: Implement task information parsing

## Feature Context

**Feature**: [001-statusline-task-info](../../features/001-statusline-task-info/feature.md)
**Technical Plan**: [plan.md](../../features/001-statusline-task-info/plan.md)
**Feature Tasks**: [tasks.md](../../features/001-statusline-task-info/tasks.md)

## Overview

Implement the task information parsing component of the statusline script. This task adds the ability to read task metadata from `task-system/task-{ID}/task.md` files and format it for statusline display. The parser uses the `CURRENT_TASK_ID` environment variable (from `$CLAUDE_ENV_FILE`) to locate the correct task file, then extracts the task title, type, and feature reference. Output is formatted with appropriate icons for the `--task` flag.

This is Phase 2 of the statusline feature, building on the foundation script created in Task 001.

## Task Type

feature - Adds new task information parsing capability to the statusline script

## Priority

P1 - Core functionality required for task awareness in statusline. Blocks Phase 3+ which depend on parsing patterns established here.

## Dependencies

- [001](../001/task-system/task-001/task.md) (Create npm package structure and foundation script): Provides the script skeleton, argument parsing, and context detection that this task builds upon

## Objectives

- [ ] Parse task.md files to extract task title from header line
- [ ] Extract task type from metadata section
- [ ] Extract feature reference from Feature Context section
- [ ] Format output with appropriate Unicode/ASCII icons
- [ ] Handle missing or malformed files gracefully with fallback values
- [ ] Implement `--task` flag output section

## Sub-tasks

1. [ ] Add `parse_task_md()` function that reads task.md given a task ID
2. [ ] Implement task title extraction from `# Task NNN: Title` header format
3. [ ] Implement task type extraction from `## Task Type` section or `**Type:**` line
4. [ ] Implement feature reference extraction from `## Feature Context` section
5. [ ] Create `format_task_section()` function for assembling `--task` output
6. [ ] Add icon mapping for task types (feature, bugfix, refactor, performance, deployment)
7. [ ] Implement fallback logic for missing task.md file
8. [ ] Implement fallback logic for missing/malformed fields within task.md
9. [ ] Add unit tests for parsing functions
10. [ ] Add integration test for `--task` flag output

## Technical Approach

### Files to Create/Modify

- `packages/statusline/bin/task-status` - Add parsing functions and `--task` flag handling
- `packages/statusline/test/parse-task.test.js` - Unit tests for parsing functions
- `packages/statusline/test/fixtures/` - Test fixture task.md files

### Implementation Steps

1. **Add parse_task_md function**: Create function that takes task ID, constructs path to `task-system/task-{ID}/task.md`, and reads the file
2. **Extract task title**: Use grep/awk to find line matching `^# Task [0-9]+:` and extract title portion after the colon
3. **Extract task type**: Look for `## Task Type` section and extract the type keyword (feature|bugfix|refactor|performance|deployment)
4. **Extract feature reference**: Parse `## Feature Context` section, extract feature name from `**Feature**:` line
5. **Implement format_task_section**: Assemble output as `{title} {type_icon} {feature_name}` with powerline separators
6. **Add graceful fallbacks**: Return "--" for missing file, "[unknown]" for missing fields
7. **Wire into main script**: Add `--task` flag handling that calls parse and format functions

### Icon Mapping (from plan.md)

| Task Type | Unicode | ASCII |
|-----------|---------|-------|
| feature | `feature` | `[feat]` |
| bugfix | `bugfix` | `[bug]` |
| refactor | `refactor` | `[refactor]` |
| performance | `performance` | `[perf]` |
| deployment | `deployment` | `[deploy]` |

### Testing Strategy

- **Unit Tests**:
  - `parse_task_title()` with valid header, missing header, malformed header
  - `parse_task_type()` with valid type, missing type, unknown type
  - `parse_feature_ref()` with valid feature, missing feature context
  - `get_type_icon()` with each task type, unknown type, ASCII mode

- **Integration Tests**:
  - Run `task-status --task` with valid task.md fixture
  - Run `task-status --task` with missing task.md (should output "--")
  - Run `task-status --task --no-icons` to verify ASCII fallback
  - Run `task-status --task` outside worktree (should handle gracefully)

- **Edge Cases**:
  - Task title containing colons (e.g., "Task 001: Fix: edge case")
  - Task type with extra whitespace
  - Feature reference with special characters
  - Empty task.md file
  - Task.md with only partial sections

### Edge Cases to Handle

- **Missing task.md file**: Output "--" and continue (exit 0)
- **Task title with colons**: Extract everything after first ":" in header line
- **Missing CURRENT_TASK_ID env var**: Output "--" for task section
- **Task type not recognized**: Use generic icon or "[?]" in ASCII mode
- **Feature Context section missing**: Omit feature portion from output
- **File permissions issue**: Log to stderr, output "--", exit 0 (graceful)
- **Very long task title**: Truncate to reasonable length (e.g., 40 chars)

## Risks & Concerns

- **task.md format variations**: Different tasks may have slightly different formats. Mitigation: Use flexible regex patterns that handle whitespace variations.
- **Performance of grep/awk**: Multiple grep calls could add latency. Mitigation: Read file once and process with awk, or use head to limit reads.
- **CURRENT_TASK_ID not set**: Script sourced from non-session context. Mitigation: Check env var exists before attempting parse, fallback gracefully.

## Resources & Links

- [Plan.md Phase 2 section](../../features/001-statusline-task-info/plan.md) - Implementation strategy for task information
- [Plan.md Data Models](../../features/001-statusline-task-info/plan.md) - Task Context field definitions
- [Bash string manipulation](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html)
- [Task template structure](../../../plugin/skills/task-builder/templates/task-template.md)

## Acceptance Criteria

- Running `task-status --task` in a worktree with valid task.md outputs task title, type icon, and feature name
- Running `task-status --task` with missing task.md outputs "--" without error (exit 0)
- Running `task-status --task --no-icons` outputs ASCII fallbacks instead of Unicode icons
- Task type icons match the icon mapping defined in plan.md
- All unit tests pass with 80%+ coverage on parsing functions
- Script performance remains under 100ms total execution time
- Missing or malformed fields produce sensible fallback values, not errors
