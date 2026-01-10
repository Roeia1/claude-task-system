# Task 013: Create worker prompt template

## Feature Context

**Feature**: [007-task-implementation-orchestration](../features/007-task-implementation-orchestration/feature.md)
**Technical Plan**: [plan.md](../features/007-task-implementation-orchestration/plan.md)
**Feature Tasks**: [tasks.md](../features/007-task-implementation-orchestration/tasks.md)

## Overview

Create the worker prompt template that gets injected into each spawned `claude -p` session during autonomous task implementation. This template defines the complete behavior of worker agents, including session startup procedures, TDD-based implementation workflow, commit and journal discipline, context awareness for proactive exit before exhaustion, and the JSON exit protocol for status reporting.

The worker prompt is a critical foundation component because it defines how autonomous workers understand their role, select objectives, implement with test-first discipline, and communicate status back to the orchestration script.

## Task Type

feature - New functionality (worker prompt template for orchestration system)

## Priority

P1 - Critical foundation for the orchestration system. All other components (implementation script, commands) depend on having a well-defined worker prompt.

## Dependencies

None - This is a foundation task with no prerequisites.

## Objectives

- [ ] Create worker prompt template file at `plugin/instructions/orchestration/worker-prompt.md`
- [ ] Define session startup protocol (task.json, journal.md, commits, resolution.md handling)
- [ ] Define implementation workflow with test-first discipline
- [ ] Define commit and journal pairing discipline
- [ ] Define context awareness and proactive exit behavior
- [ ] Define JSON exit protocol with status values

## Sub-tasks

1. [ ] Create the orchestration directory: `plugin/instructions/orchestration/`
2. [ ] Create `worker-prompt.md` with Session Startup section covering:
   - Reading task.json for objectives and status
   - Reading journal.md for previous session context
   - Reading last 5 commits for code context continuity
   - Checking for and handling resolution.md (blocked objective recovery)
   - Running existing tests to verify current state
   - Objective selection logic (continue in_progress, or select based on context)
3. [ ] Add Implementation Workflow section covering:
   - Write all failing tests that describe objective requirements first
   - Implement until all tests pass
   - Run all tests to ensure no regressions
   - Mark objective as done in task.json
   - Handle blocker situations (create blocker.md, mark blocked, exit BLOCKED)
4. [ ] Add Commit and Journal Discipline section covering:
   - Paired operations philosophy (always together)
   - What goes in commits vs journal (code state vs narrative context)
   - Commit format: `feat(task-XXX): <description>`
   - When to commit (after objective, after significant progress, before exit)
5. [ ] Add Context Awareness section covering:
   - Self-monitoring signals for context exhaustion
   - Proactive exit behavior before context is lost
   - Importance of preserving uncommitted work
6. [ ] Add Exit Protocol section covering:
   - Pre-exit checklist (commit, journal, task.json updates)
   - JSON output format with status, summary, blocker fields
   - Status values: ONGOING, FINISH, BLOCKED and when to use each
7. [ ] Add Important Rules section summarizing key constraints
8. [ ] Validate template matches the worker prompt specification in feature.md section 4

## Technical Approach

### Files to Create/Modify

- `plugin/instructions/orchestration/worker-prompt.md` - New file: the complete worker prompt template

### Implementation Steps

1. Create the `plugin/instructions/orchestration/` directory if it doesn't exist
2. Create the worker prompt template file with all required sections
3. Structure the prompt for clarity and AI comprehension:
   - Use clear headings and numbered steps
   - Use code blocks for examples (commands, JSON, commit messages)
   - Use markdown formatting for emphasis and structure
4. Ensure the prompt is self-contained - workers should not need to reference external files
5. Include concrete examples for:
   - JSON exit output format
   - Commit message format
   - Journal entry format
   - Blocker.md structure
6. Validate against the feature.md section 4 specification (lines 499-641)

### Testing Strategy

- **Manual Review**: Verify the prompt covers all sections from feature.md Worker Prompt specification
- **Completeness Check**: Ensure all key behaviors are documented:
  - Session startup (5 steps)
  - Implementation workflow (test-first, blocking)
  - Commit/journal discipline (pairing, format)
  - Context awareness (self-monitoring)
  - Exit protocol (JSON schema)
- **Clarity Check**: Read through as if you were a spawned worker - is everything clear?

### Edge Cases to Handle

- Resolution.md exists at startup (blocked objective recovery flow)
- Multiple blocked objectives (shouldn't happen, but document: only one at a time)
- Context exhaustion mid-objective (commit incomplete work, update journal, exit ONGOING)
- All tests already pass at startup (verify state, proceed to next objective)
- No remaining objectives (exit FINISH)

## Risks & Concerns

- Prompt length: Worker prompt may be lengthy, but it needs to be comprehensive. The orchestrator will inject this at each spawn, so size matters but completeness matters more.
- Worker misunderstanding: If any section is ambiguous, workers may behave unexpectedly. Use concrete examples and explicit rules.
- Template vs actual usage: This is a template file that the Python script will read and inject. Ensure no placeholders that need dynamic substitution remain (all dynamic content comes from task.json, journal.md at runtime).

## Resources & Links

- [feature.md Worker Prompt section](../features/007-task-implementation-orchestration/feature.md#4-worker-prompt) - Lines 499-641 contain the detailed specification
- [Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices) - Referenced in feature.md
- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - Background context for multi-spawn design

## Acceptance Criteria

- `plugin/instructions/orchestration/worker-prompt.md` exists and is non-empty
- Prompt includes Session Startup section with all 6 steps from feature.md
- Prompt includes Implementation Workflow section with TDD approach
- Prompt includes Commit and Journal Discipline section explaining pairing
- Prompt includes Context Awareness section for self-monitoring
- Prompt includes Exit Protocol section with JSON output format
- Prompt includes Important Rules summary section
- JSON exit format matches the schema: `{status, summary, blocker?}`
- Status values are exactly: ONGOING, FINISH, BLOCKED
- Blocker handling workflow is clearly documented
- Resolution.md handling at startup is documented
- Prompt can be read and understood without external file references
