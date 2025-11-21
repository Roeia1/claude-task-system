# Refactor Task Execution Workflow

## Journal Structure

Initialize journal with:

```markdown
# Task #[NUMBER]: [TITLE]

## Current Phase: Phase 1 - Task Analysis

## Git References

- **Branch**: refactor/task-XXX-description
- **PR**: #XXX - [PR Title]
- **Base Branch**: main

## Task Understanding

[Filled after analysis]

## Code Analysis

[Filled in Phase 2]

## Safety Net Strategy

[Filled in Phase 3]

## Refactoring Notes

[Filled in Phase 4]

## Quality Validation

[Filled in Phase 5]

## Progress Log

[Updated throughout with timestamped entries]

## Key Learnings

[Updated throughout]
```

## Phase 1: Task Analysis

**Prerequisites**: Git setup and journal initialization completed by start-task command

### Task Analysis

1. Read entire task file thoroughly
2. Review all dependencies are COMPLETED
3. Analyze refactoring objectives and quality goals
4. Review existing sub-tasks in task file
5. Document understanding in journal
6. Identify ambiguities or concerns
7. **Commit and push initial work**: `git add . && git commit -m "docs(task-XXX): initial task analysis and journal setup" && git push`

### Exit Criteria

- Clear understanding documented
- Quality goals identified
- Initial commit made

**Request permission to proceed to Phase 2**

## Phase 2: Code Analysis & Planning

1. Identify technical debt and quality issues in target code
2. Analyze existing test coverage for refactor areas
3. Review code dependencies and impact scope
4. Document current behavior patterns that must be preserved
5. Plan incremental refactoring strategy
6. Consider risks identified in task file
7. Define quality improvement metrics
8. **Commit and push analysis work**: `git add . && git commit -m "docs(task-XXX): complete code analysis and refactoring plan" && git push`
9. **Consider review request**: For major architectural refactoring, ask user if they want to review the plan

### Exit Criteria

- Complete code analysis documented
- Refactoring strategy planned
- Quality metrics defined

**Request permission to proceed to Phase 3**

## Phase 3: Safety Net Creation

1. Run existing tests to establish baseline (all must pass)
2. Identify areas with insufficient test coverage for refactoring
3. Add missing tests ONLY for code areas being refactored
4. Focus on behavior preservation, not new functionality
5. Document current behavior patterns in tests
6. Ensure all new tests pass with current implementation
7. **Commit and push safety net**: `git add . && git commit -m "test(task-XXX): add safety net tests for refactoring areas" && git push`
8. **Consider review request**: For complex refactoring with significant test additions

### Exit Criteria

- Existing tests passing (baseline established)
- Adequate test coverage for refactor areas
- Safety net committed

**Request permission to proceed to Phase 4**

## Phase 4: Incremental Refactoring

1. Apply refactoring changes in small, safe increments
2. **Commit frequently**: After each logical refactoring step
   - `refactor(task-XXX): extract [method/class/utility]` && git push
   - `refactor(task-XXX): simplify [specific area]` && git push
   - `refactor(task-XXX): remove duplication in [component]` && git push
3. Run full test suite after each change
4. If any test fails:
   - STOP immediately
   - Analyze why behavior changed unexpectedly
   - Fix refactoring to preserve behavior
   - NEVER modify tests to match refactored behavior
   - **If test modification needed, READ**: `/home/roei/projects/Titinski/project-tasks/workflows/shared/test-modification-protocol.md`
5. Work through sub-tasks from task file methodically
6. Update journal with:
   - Refactoring decisions and rationale
   - Challenges encountered
   - Quality improvements achieved
7. Check off completed sub-tasks in task file
8. Monitor for performance regressions
9. **Consider mid-phase review**: For complex refactoring, ask user if they want to review progress

### Exit Criteria

- All refactoring increments complete
- All tests still passing
- All logical improvements committed
- Performance maintained or improved

**Request permission to proceed to Phase 5**

## Phase 5: Quality Validation

1. Run complete test suite to verify no regressions
2. Check code quality metrics against baseline:
   - Complexity reduction
   - Duplication elimination
   - Maintainability improvements
3. Verify performance has not degraded
4. Review code against project conventions
5. Ensure error handling is preserved or improved
6. Document quality improvements achieved
7. **Commit and push validation results**: `git add . && git commit -m "docs(task-XXX): validate refactoring quality improvements" && git push`

### Exit Criteria

- All tests passing
- Quality metrics improved
- Performance maintained
- Validation documented

**Request permission to proceed to Phase 6**

## Phase 6: Verification & Polish

1. Verify all refactoring objectives from task file achieved
2. Ensure all sub-tasks are checked off
3. Review entire refactoring against quality goals
4. Check that no functionality was inadvertently changed
5. Update documentation if code interfaces changed
6. Ensure code follows project conventions
7. Run final code quality checks: `pnpm check` (or equivalent)
8. Document verification results in journal
9. **Commit and push final polish**: `git add . && git commit -m "docs(task-XXX): final verification and polish" && git push`
10. **Mark PR ready for review**: Convert from draft to ready for review
11. **Proactive review request**: Ask user to review for final approval

### Exit Criteria

- All objectives verified
- Code polished and quality checks pass
- PR ready for review

**Request permission to proceed to Phase 7**

## Phase 7: Reflection & Documentation

1. Review entire refactoring journey
2. Update task file with:
   - New insights about code quality
   - Additional refactoring opportunities discovered
   - Lessons learned about the codebase
3. Final journal entry summarizing:
   - Quality improvements accomplished
   - Refactoring decisions and rationale
   - Challenges overcome
   - Future refactoring considerations
4. **Exit Criteria**: Complete documentation updated
5. **Request permission to complete task**

## Phase 8: Task Completion

After completing Phase 7 reflection and documentation, run the appropriate completion command:

**For regular workflow (main repository)**:
```
/project:complete-task
```

**For parallel workflow (in worktree)**:
```
/project:parallel-finalize-task
# Then from main repo: /project:parallel-cleanup-worktree
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
- Review if any new refactoring tasks should be created based on discoveries
- Make sure you're ready for the PR to be merged

**Phase 8 is now a single command - no manual steps required!**

## Journal Entry Guidelines

### When to Update:

- Phase transitions
- Each refactoring increment
- Quality metric improvements
- Behavior preservation challenges
- Problems and solutions
- Code quality insights

### Entry Format:

```markdown
### [Timestamp] - [Phase/Activity]

[Content describing what was refactored, decisions, quality improvements]
**Quality Impact:** [Specific improvements achieved]
**Next:** [What you plan to refactor next]
```

## Important Rules

- NEVER change behavior, only code structure and quality
- NEVER modify existing tests without explicit user permission
- NEVER proceed to next phase without user permission
- Make frequent, small commits for safety
- Document WHY refactoring decisions were made
- Run tests after every change
- Address PR reviews immediately when user signals

## Error Handling

When encountering issues:

1. **Test Failures After Refactoring**:

   - STOP immediately
   - Analyze what behavior changed unexpectedly
   - Fix refactoring to preserve original behavior
   - NEVER modify tests to match new behavior without permission

2. **Performance Degradation**:

   - Document the regression
   - Identify which refactoring step caused it
   - Either optimize the refactored code or revert that step

3. **Scope Creep (New Features)**:

   - STOP adding functionality
   - Focus purely on code quality improvements
   - Document any feature ideas for separate tasks

4. **Complex Dependencies**:
   - Break refactoring into smaller steps
   - Document dependency challenges
   - Ask user for guidance on approach

## PR Review Workflow

**IMMEDIATELY READ**: `/home/roei/projects/Titinski/project-tasks/workflows/shared/pr-review-workflow.md`

**Follow the standard PR Review Workflow from that file exactly.**

### Proactive Review Requests

Ask user "Should I request a review to [specific purpose]?" when:

- Planning major structural changes
- Completing phases 2, 3, 5, 6 (analysis, safety net, validation, verification)
- Encountering unexpected complexity
- Finding significant additional refactoring opportunities
- Hitting performance or dependency concerns

### Review Documentation

After each review session, add to journal:

```markdown
### [Timestamp] - PR Review Response

**Comments addressed**: [number]
**Changes made**: [summary of refactoring adjustments]
**Discussions started**: [topics requiring clarification]
**Next**: [what to refactor next]
```

## Test Modification Protocol

**READ FIRST**: `/home/roei/projects/Titinski/project-tasks/workflows/shared/test-modification-protocol.md`

**Follow the protocol from that file exactly.**

If existing tests need modification during refactoring, this likely indicates behavior has changed unexpectedly. Follow the protocol and explain that behavior may have changed.