# Task 017: Create /resolve command

## Feature Context

**Feature**: [007-task-implementation-orchestration](../features/007-task-implementation-orchestration/feature.md)
**Technical Plan**: [plan.md](../features/007-task-implementation-orchestration/plan.md)
**Feature Tasks**: [tasks.md](../features/007-task-implementation-orchestration/tasks.md)

## Overview

Create the `/resolve` slash command that enables human-assisted blocker resolution for stuck task implementations. When a worker Claude instance encounters a blocker and exits with BLOCKED status, the human navigates to the task worktree and runs `/resolve`. The main Claude agent (with full codebase access) reads the blocker context, analyzes the problem, proposes solutions, and after human approval, writes the resolution to `resolution.md` for the next worker to consume.

This is a critical component of the human-in-the-loop workflow, ensuring that implementation blockers are handled with full context and human oversight rather than automated guessing.

## Task Type

feature - Determines which workflow to follow during execution

## Priority

P1 - Critical path for blocker resolution workflow; without this command, blocked tasks cannot be resolved

## Dependencies

- [015](../015/task.md) (Create implementation script): The `/resolve` command is part of the blocker resolution workflow that follows implementation. Task 015 creates the implementation script that workers use.

## Objectives

- [ ] Command file created at `plugin/commands/resolve.md` with proper trigger and skill invocation
- [ ] Skill file created at `plugin/skills/resolve/SKILL.md` with skill definition and metadata
- [ ] Instructions file created at `plugin/instructions/resolve/INSTRUCTIONS.md` with complete resolution workflow
- [ ] Worktree context validation implemented (detects task ID from current directory)
- [ ] Blocker.md reading and analysis workflow documented
- [ ] Solution proposal workflow with human approval step defined
- [ ] Resolution.md writing with proper template structure implemented
- [ ] Error handling for all edge cases (not in worktree, no blocker.md, already resolved)

## Sub-tasks

1. [ ] Create `plugin/commands/resolve.md` - Define the slash command entry point with description and skill trigger (1 hour)
2. [ ] Create `plugin/skills/resolve/SKILL.md` - Define skill metadata, activation rules, and base directory reference (1 hour)
3. [ ] Create `plugin/instructions/resolve/INSTRUCTIONS.md` - Complete resolution workflow with all steps (2 hours)
4. [ ] Implement worktree context detection - Logic to identify task ID from current working directory path (1 hour)
5. [ ] Implement blocker.md reading and analysis - Read and parse blocker file structure (1 hour)
6. [ ] Implement solution proposal workflow - Multi-step process to analyze, propose, and seek approval (2 hours)
7. [ ] Implement resolution.md writing - Template and writing logic for approved resolutions (1 hour)
8. [ ] Add comprehensive error handling - Handle all edge cases with clear error messages (1 hour)

## Technical Approach

### Files to Create/Modify

- `plugin/commands/resolve.md` - Slash command definition that triggers the resolve skill
- `plugin/skills/resolve/SKILL.md` - Skill metadata and activation rules
- `plugin/instructions/resolve/INSTRUCTIONS.md` - Detailed resolution workflow instructions

### Implementation Steps

1. Create the command file at `plugin/commands/resolve.md` with:
   - Command description for `/resolve`
   - Skill trigger pointing to `resolve` skill
   - No arguments (context derived from current directory)

2. Create the skill file at `plugin/skills/resolve/SKILL.md` with:
   - Skill name and description
   - Activation rules (only in worktree context with blocker.md)
   - Base directory reference using `${CLAUDE_PLUGIN_ROOT}`

3. Create the instructions file at `plugin/instructions/resolve/INSTRUCTIONS.md` with:
   - Context validation section (worktree detection, blocker.md check)
   - File reading section (blocker.md, task.json, journal.md)
   - Analysis workflow (explore codebase, identify root cause)
   - Solution proposal format (options with trade-offs)
   - Human approval step (present proposal, await confirmation)
   - Resolution writing (template, file location)
   - Success/failure messaging

4. Implement worktree context detection:
   - Check if current directory contains `task-system/task-{id}/` structure
   - Extract task ID from directory path pattern
   - Validate task worktree structure exists

5. Implement blocker.md reading:
   - Read from `task-system/task-{id}/blocker.md`
   - Parse sections: Problem Description, What I Tried, What I Need, Context, Suggested Options
   - Extract objective ID reference

6. Implement solution proposal workflow:
   - Read task.json for objective details
   - Read journal.md for execution history
   - Explore relevant codebase files
   - Analyze root cause based on blocker context
   - Formulate solution options with pros/cons
   - Present to human in structured format
   - Await explicit approval before proceeding

7. Implement resolution.md writing:
   - Use template from feature.md: For Blocker, Approved, Approved By, Decision, Implementation Guidance, Rationale
   - Write to `task-system/task-{id}/resolution.md`
   - Include timestamp and approval confirmation

### API Contract

**Command: `/resolve`**

| Property | Value |
|----------|-------|
| Arguments | None (context from directory) |
| Prerequisites | Must run from task worktree, blocker.md must exist |
| Outputs | resolution.md written, summary to user |

**Error Responses:**
- Not in worktree: "Must run /resolve from within a task worktree. Current directory does not contain task-system/task-{id}/ structure."
- No blocker.md: "No blocker found. Task is not blocked. blocker.md does not exist at expected location."
- Already resolved: "resolution.md already exists. The blocker has already been resolved. Run /implement to resume task execution."

### Testing Strategy

- **Unit Tests**: Validate worktree detection logic with various directory structures
- **Integration Tests**: End-to-end test with mock blocker.md, verify resolution.md output
- **Edge Cases**:
  - Running from main repo (should fail with clear message)
  - Running from wrong subdirectory within worktree
  - Malformed blocker.md (missing sections)
  - Multiple blockers scenario (edge case - single blocker expected)
  - Resolution.md already exists

### Edge Cases to Handle

- User runs `/resolve` from main repository root - detect and provide helpful error with navigation instructions
- User runs `/resolve` from within worktree but not at root - still detect task context
- blocker.md exists but is empty or malformed - provide error with expected format
- task.json doesn't exist or is malformed - error with diagnostic message
- resolution.md already exists from previous resolution attempt - inform user and suggest `/implement` to resume
- Worktree exists but task files are missing - distinguish between "not a task worktree" and "corrupted task worktree"

## Risks & Concerns

- **Path detection across platforms**: Windows vs Unix path separators; mitigation: use cross-platform path handling in instructions
- **Blocker.md format variations**: Workers might create slightly different structures; mitigation: robust parsing that handles variations
- **Human approval workflow complexity**: Ensuring clear approval signal; mitigation: explicit confirmation prompt
- **Resolution template evolution**: Template may need updates; mitigation: template in instructions file for easy updates

## Resources & Links

- [Feature Definition](task-system/features/007-task-implementation-orchestration/feature.md) - Section: "5. Resolve Command" and "Blocker Resolution Workflow"
- [Technical Plan](task-system/features/007-task-implementation-orchestration/plan.md) - Section: "Command: /resolve" API contract
- [Claude Task System CLAUDE.md](CLAUDE.md) - Plugin path conventions and skill structure

## Acceptance Criteria

- `/resolve` command can be invoked from within a task worktree
- Command correctly detects when it's NOT in a task worktree and provides clear error message
- Command reads blocker.md and presents problem summary to user
- Command explores codebase to understand context (using standard Claude tools)
- Command proposes one or more solutions with trade-offs
- Command waits for explicit human approval before writing resolution
- resolution.md is written in correct format matching the template
- Error handling covers all documented edge cases with helpful messages
- Command does NOT modify code files (that's the worker's job)
- Command does NOT make decisions without human approval
