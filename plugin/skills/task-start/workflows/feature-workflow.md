# Feature Task Execution Workflow

## Phase 1: Test Creation (TDD)

**Prerequisites**: Git setup completed by task-start skill

1. Write tests that reflect the solution from task.md's Technical Approach
2. Focus on:
   - Expected behavior, not implementation details
   - End-to-end scenarios validating complete feature
   - Clear test descriptions documenting expected behavior
3. DO NOT write any implementation code during this phase
4. Run all created tests to confirm they are failing
5. **Commit and push test creation**: `git add . && git commit -m "test(task-XXX): add comprehensive test suite for [feature]" && git push`
6. **Consider review request**: For complex test strategies, ask user if they want to review the test approach

### Exit Criteria

- All tests written, failing as expected
- Test strategy committed

**Request permission to proceed to Phase 2**

## Phase 2: Implementation

1. Implement functionality to make failing tests pass
2. **Commit and push logical milestones**: Use meaningful commits for each significant piece of functionality
   - `feat(task-XXX): implement core [component] functionality && git push`
   - `feat(task-XXX): add [specific feature] support && git push`
3. **If test modification seems necessary**:
   - See: [Test Modification Protocol](./test-modification-protocol.md)
   - Follow the protocol exactly as specified
4. Work through sub-tasks from task file methodically
5. Check off completed sub-tasks in task file
6. Run tests frequently to track progress
7. Continue until all tests pass
8. **Handle design issues**: If significant design flaws emerge, discuss with user
9. **Consider mid-phase review**: For complex implementations, ask user if they want to review progress

### Exit Criteria

- All tests passing
- Implementation complete
- All logical milestones committed

**Request permission to proceed to Phase 3**

## Phase 3: Refactor

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
6. Repeat until satisfied with code quality

### Exit Criteria

- Code is clean, maintainable
- All tests still passing
- Refactoring work committed

**Request permission to proceed to Phase 4**

## Phase 4-5: Verification & Reflection

> **Complete Checklist**: See [Verification Checklist](./verification-checklist.md) for Phase 4 verification steps and Phase 5 reflection guide.

### Phase 4 Summary

1. Verify all acceptance criteria from task file
2. Run final code quality checks
3. Mark PR ready for review
4. Request user approval

**Request permission to proceed to Phase 5**

### Phase 5 Summary

1. Review entire task journey
2. Update task file with learnings

**Request permission to complete task**

## Important Rules

- **Test-Driven Development**: NEVER write implementation code before tests (Phase 1)
- **Test Modification**: NEVER modify tests after Phase 1 without explicit permission - see [Test Modification Protocol](./test-modification-protocol.md)
- **Phase Progression**: NEVER proceed to next phase without permission - see [Phase Transition Rules](./phase-transition-rules.md)
- **Sequential Execution**: Complete phases in order
- **Commit Discipline**: Commit logical milestones throughout development
- **PR Reviews**: Address PR reviews immediately when user signals - see [PR Review Protocol](./pr-review-protocol.md)

## Error Handling

When encountering issues:

### 1. Test Failures
- Analyze why implementation doesn't meet test expectations
- Fix implementation to satisfy tests
- If test seems wrong, discuss with user before any changes
- See: [Test Modification Protocol](./test-modification-protocol.md)

### 2. Design Flaws
- Document the flaw discovered
- Discuss with user whether to revisit task.md's Technical Approach

### 3. Technical Blockers
- Present alternative solutions to user
- Discuss tradeoffs and get guidance

### 4. Unclear Requirements
- Document what is unclear
- Ask user for clarification
- Do not proceed until ambiguity resolved

## PR Review Workflow

> **Full Protocol**: See [PR Review Protocol](./pr-review-protocol.md) for complete PR review procedures.

**When user signals review** ("I made a review", "Check the PR comments"):
1. Immediately pause current phase work
2. Read entire PR review using GitHub CLI
3. Address all comments systematically per protocol

**Proactive review requests**: Ask user "Should I request a review?" when:
- Making major technical decisions
- Completing phases 1, 3, 4
- Encountering scope creep or requirement changes
