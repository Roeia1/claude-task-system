# Generic Task Execution Workflow

## Journal Structure

Initialize journal with:

```markdown
# Task #[NUMBER]: [TITLE]

## Current Phase: Phase 1 - Task Analysis

## Git References

- **Branch**: feature/task-XXX-description
- **PR**: #XXX - [PR Title]
- **Base Branch**: main

## Task Understanding

[Filled after analysis]

## Solution Design

[Filled in Phase 2]

## Test Strategy

[Filled in Phase 3]

## Implementation Notes

[Filled in Phase 4]

## Refactoring Decisions

[Filled in Phase 5]

## Progress Log

[Updated throughout with timestamped entries]

## Key Learnings

[Updated throughout]
```

## Phase 1: Task Analysis

**Prerequisites**: Git setup and journal initialization completed by start-task command

### Option A: Use Task Analyzer Subagent (Recommended)

For comprehensive analysis with automated standards validation:

1. **Ask user permission**: "Ready to run Task Analyzer subagent for Phase 1-2 analysis?"
2. **If approved**, delegate to task-analyzer subagent (see `.claude/agents/task-analyzer.md`)
3. **Subagent performs**:
   - Reads task.md, feature.md, plan.md, and all relevant ADRs
   - Validates dependencies are COMPLETED (blocks if not)
   - Reviews project standards (coding-standards.md, architecture-principles.md, quality-gates.md, tech-stack.md)
   - Generates comprehensive analysis report with structured output
   - Identifies risks, ambiguities, and architectural decisions
   - Recommends technical approach aligned with standards
4. **Present analysis** to user for review
5. **Document key findings** in journal under "Task Understanding" and "Solution Design" sections
6. **Commit initial work**: `git add . && git commit -m "docs(task-XXX): initial task analysis and journal setup" && git push`

**Benefits of Task Analyzer**:
- Comprehensive standards compliance check
- Structured, consistent analysis format
- Automatic dependency validation
- Reduces risk of missing critical context
- Isolates heavy documentation reading from main conversation

### Option B: Manual Analysis (Fallback)

If subagent is unavailable or user prefers manual approach:

1. Read entire task file thoroughly
2. Review all dependencies are COMPLETED
3. Analyze requirements, objectives, and acceptance criteria
4. Review existing sub-tasks in task file
5. Document understanding in journal
6. Identify ambiguities or concerns
7. **Commit and push initial work**: `git add . && git commit -m "docs(task-XXX): initial task analysis and journal setup" && git push`

### Exit Criteria

- Clear understanding documented
- Concerns identified
- Initial commit made
- **If using subagent**: Comprehensive analysis report reviewed and approved

**Request permission to proceed to Phase 2**

## Phase 2: Solution Design

**Note**: If using Task Analyzer subagent, Phase 1 and 2 are performed together. The subagent provides solution design as part of its comprehensive analysis. Skip to Phase 3 if subagent was used.

### Manual Solution Design (when subagent not used)

1. Research technical approach using provided resources
2. Analyze existing codebase patterns
3. Design solution architecture
4. Consider how to approach sub-tasks from task file
5. Document design decisions and tradeoffs in journal
6. Consider risks identified in task file
7. Plan how solution will be tested
8. **Commit and push design work**: `git add . && git commit -m "docs(task-XXX): complete solution design and architecture" && git push`
9. **Consider review request**: For major architectural decisions, ask user if they want to review the design

### Exit Criteria

- Complete solution design documented
- Architecture decisions committed
- **If using subagent**: Technical approach validated against project standards

**Request permission to proceed to Phase 3**

## Phase 3: Test Creation (TDD)

1. Write tests that reflect the agreed solution
2. Focus on:
   - Expected behavior, not implementation details
   - End-to-end scenarios validating complete feature
   - Clear test descriptions documenting expected behavior
3. DO NOT write any implementation code during this phase
4. Run all created tests to confirm they are failing
5. Document failing tests in journal
6. Update journal with test strategy rationale
7. **Commit and push test creation**: `git add . && git commit -m "test(task-XXX): add comprehensive test suite for [feature]" && git push`
8. **Consider review request**: For complex test strategies, ask user if they want to review the test approach

### Exit Criteria

- All tests written, failing as expected
- Test strategy committed

**Request permission to proceed to Phase 4**

## Phase 4: Implementation

1. Implement functionality to make failing tests pass
2. **Commit and push logical milestones**: Use meaningful commits for each significant piece of functionality
   - `feat(task-XXX): implement core [component] functionality && git push`
   - `feat(task-XXX): add [specific feature] support && git push`
3. If test modification seems necessary:
   - STOP implementation
   - Document why test needs changing
   - Explain reasoning to user
   - Only proceed with test changes after explicit permission
4. Work through sub-tasks from task file methodically
5. Update journal with:
   - Implementation decisions
   - Challenges encountered
   - Solutions applied
6. Check off completed sub-tasks in task file
7. Run tests frequently to track progress
8. Continue until all tests pass
9. **Handle design issues**: If significant design flaws emerge, address within this phase using Phase 2-style analysis
10. **Consider mid-phase review**: For complex implementations, ask user if they want to review progress

### Exit Criteria

- All tests passing
- Implementation complete
- All logical milestones committed

**Request permission to proceed to Phase 5**

## Phase 5: Refactor

1. Review implementation critically
2. Identify improvements:
   - Code clarity and readability
   - Performance optimizations
   - Design pattern adherence
   - Code duplication reduction
   - Error handling improvements
3. Implement refactoring changes
4. Ensure all tests still pass after each change
5. **Commit and push refactoring work**: `git add . && git commit -m "refactor(task-XXX): improve [specific improvement]" && git push`
6. Document refactoring decisions in journal
7. Repeat until satisfied with code quality

### Exit Criteria

- Code is clean, maintainable
- All tests still passing
- Refactoring work committed

**Request permission to proceed to Phase 6**

## Phase 6: Verification & Polish

1. Verify all acceptance criteria from task file
2. Ensure all sub-tasks are checked off
3. Review entire implementation against objectives
4. Check edge cases and error handling
5. Update documentation if needed
6. Ensure code follows project conventions
7. Run final code quality checks: `pnpm check` (or equivalent)
8. Document verification results in journal
9. **Commit and push final polish**: `git add . && git commit -m "docs(task-XXX): final verification and polish" && git push`
10. **Mark PR ready for review**: Convert from draft to ready for review
11. **Proactive review request**: Ask user to review for final approval

### Exit Criteria

- All criteria verified
- Code polished and quality checks pass
- PR ready for review

**Request permission to proceed to Phase 7**

## Phase 7: Reflection & Documentation

1. Review entire task journey
2. Update task file with:
   - New risks discovered
   - Additional resources found
   - Lessons learned
3. Final journal entry summarizing:
   - What was accomplished
   - Key decisions and why
   - Challenges overcome
   - Future considerations
4. **Exit Criteria**: Complete documentation updated
5. **Request permission to complete task**

## Phase 8: Task Completion

After completing Phase 7 reflection and documentation, run the appropriate completion command:

**For regular workflow (main repository)**:
```
/project:complete-task
```

**For parallel workflow (two steps)**:
```
# Step 1: From worktree
/project:parallel-finalize-task

# Step 2: From main repository
/project:parallel-cleanup-worktree
```

### What the command does:

1. **Commits any final changes** in your working directory
2. **Verifies PR is ready** (all checks passing, no conflicts)
3. **Merges the PR** automatically
4. **Updates task status** to COMPLETED in TASK-LIST.md
5. **Finalizes journal** with completion entry
6. **Cleans up** (removes worktree for parallel tasks)

### Before running:

- Ensure all sub-tasks in task file are marked complete
- Review if any new tasks should be created based on learnings
- Make sure you're ready for the PR to be merged

**Phase 8 is now a single command - no manual steps required!**

## Journal Entry Guidelines

### When to Update:

- Phase transitions
- Test strategy decisions
- Implementation approach chosen
- Refactoring rationale
- Problems and solutions
- Key insights gained

### Entry Format:

```markdown
### [Timestamp] - [Phase/Activity]

[Content describing what happened, decisions, insights]
**Next:** [What you plan to do next]
```

## Important Rules

- NEVER write implementation code before tests (Phase 3)
- NEVER modify tests after Phase 3 without explicit user permission
- NEVER proceed to next phase without user permission
- Complete phases sequentially
- Document WHY, not just WHAT
- Update journal frequently with meaningful entries
- Commit logical milestones throughout development
- Address PR reviews immediately when user signals
- Every PR comment requires action (change or discussion)

## Error Handling

When encountering issues:

1. **Test Failures**:

   - Analyze why implementation doesn't meet test expectations
   - Fix implementation to satisfy tests
   - If test seems wrong, discuss with user before any changes

2. **Design Flaws**:

   - Document the flaw discovered
   - Discuss with user whether to revisit Phase 2

3. **Technical Blockers**:

   - Document the blocker in journal
   - Present alternative solutions to user
   - Discuss tradeoffs and get guidance

4. **Unclear Requirements**:
   - Document what is unclear
   - Ask user for clarification
   - Do not proceed until ambiguity resolved

## PR Review Workflow

### When User Signals Review

When user mentions "I made a review", "Check the PR comments", "I left feedback", or similar:

1. **Immediately pause current phase work**
2. Read entire PR review using GitHub CLI
3. Address all comments systematically

### Comment Response Protocol

For each comment:

1. **Read comment completely**
2. **Assess clarity**:
   - **Clear instruction/feedback** → Apply changes, commit with reference to comment, resolve comment
   - **Ambiguous or needs discussion** → Reply to comment with questions/discussion, leave unresolved
3. **Document in journal**: What was changed and why
4. **Use commit format**: `fix(task-XXX): address PR feedback - [description] (resolves comment #N) && git push`

### Comment Resolution Rules

- **Resolve when**: Taking concrete action (code change, test update, documentation fix)
- **Don't resolve when**: Asking for clarification or starting discussion
- **All comments require action**: Either change implementation or engage in discussion

### Proactive Review Requests

Ask user "Should I request a review to [specific purpose]?" when:

- Making major technical decisions
- Completing phases 2, 3, 5, 6 (design, tests, refactor, verification)
- Encountering scope creep or significant requirement changes
- Facing performance/complexity concerns
- Hitting unexpected blockers that change approach

### Review Documentation

After each review session, add to journal:

```markdown
### [Timestamp] - PR Review Response

**Comments addressed**: [number]
**Changes made**: [summary of changes]
**Discussions started**: [topics requiring clarification]
**Next**: [what to do next]
```

## Test Modification Protocol

After Phase 3, if a test needs modification:

1. STOP all work immediately
2. Document in journal:
   - Which test needs changing
   - Why it needs changing
   - What the change would be
3. Explain to user with clear reasoning
4. Wait for explicit permission
5. Only proceed with test changes after approval
