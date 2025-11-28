# Refactor Task Execution Workflow

> **Journal Guidelines**: The task-start skill initializes the journal structure. See [Journal Entry Guidelines](../journaling-guidelines.md) for when to journal, what to include, and how to invoke the journaling subagent. For refactoring, emphasize quality improvements and behavior preservation.

## Phase 1: Task Analysis

**Prerequisites**: Git setup and journal initialization completed by task-start skill

### Task Analysis

1. Read entire task file thoroughly
2. Review all dependencies are COMPLETED
3. Analyze refactoring objectives and quality goals
4. Review existing sub-tasks in task file
5. Identify ambiguities or concerns
6. **Journal**: Phase 1 completion (see [guidelines](../journaling-guidelines.md))
7. **Commit and push initial work**: `git add . && git commit -m "docs(task-XXX): initial task analysis and journal setup" && git push`

### Exit Criteria

- Clear understanding documented
- Quality goals identified
- Initial commit made

> **Phase Transition**: See [Phase Transition Rules](./phase-transition-rules.md)

**Request permission to proceed to Phase 2**

## Phase 2: Code Analysis & Planning

1. Identify technical debt and quality issues in target code
2. Analyze existing test coverage for refactor areas
3. Review code dependencies and impact scope
4. Document current behavior patterns that must be preserved
5. Plan incremental refactoring strategy
6. Consider risks identified in task file
7. Define quality improvement metrics
8. **Journal**: Phase 2 completion (see [guidelines](../journaling-guidelines.md))
9. **Commit and push analysis work**: `git add . && git commit -m "docs(task-XXX): complete code analysis and refactoring plan" && git push`
10. **Consider review request**: For major architectural refactoring, ask user if they want to review the plan

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
7. **Journal**: Phase 3 completion (see [guidelines](../journaling-guidelines.md))
8. **Commit and push safety net**: `git add . && git commit -m "test(task-XXX): add safety net tests for refactoring areas" && git push`
9. **Consider review request**: For complex refactoring with significant test additions

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
4. **If any test fails**:
   - STOP immediately
   - Analyze why behavior changed unexpectedly
   - Fix refactoring to preserve behavior
   - NEVER modify tests to match refactored behavior
   - **If test modification needed**: See [Test Modification Protocol](./test-modification-protocol.md)
5. Work through sub-tasks from task file methodically
6. **Journal** (for significant milestones - see [guidelines](../journaling-guidelines.md))
7. Check off completed sub-tasks in task file
8. Monitor for performance regressions
9. **Journal**: Phase 4 completion (see [guidelines](../journaling-guidelines.md))
10. **Consider mid-phase review**: For complex refactoring, ask user if they want to review progress

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
6. **Journal**: Phase 5 completion (see [guidelines](../journaling-guidelines.md))
7. **Commit and push validation results**: `git add . && git commit -m "docs(task-XXX): validate refactoring quality improvements" && git push`

### Exit Criteria

- All tests passing
- Quality metrics improved
- Performance maintained
- Validation documented

**Request permission to proceed to Phase 6**

## Phase 6-7: Verification & Reflection

> **Complete Checklist**: See [Verification Checklist](./verification-checklist.md)

### Phase 6: Refactoring-Specific Checks

1. Verify all refactoring objectives from task file achieved
2. **Check that no functionality was inadvertently changed**
3. Update documentation if code interfaces changed
4. Run final code quality checks
5. Mark PR ready for review

**Request permission to proceed to Phase 7**

### Phase 7: Refactoring Reflection

1. Review entire refactoring journey
2. **Journal**: Phase 7 completion (see [guidelines](../journaling-guidelines.md))

**Request permission to complete task**

## Phase 8: Task Completion

> **Completion Process**: See [Completion Protocol](./completion-protocol.md)

After completing Phase 7, run:
```bash
/task-system:complete-task
```

Before running, review if any new refactoring tasks should be created based on discoveries.

## Important Rules

- **NEVER change behavior**, only code structure and quality
- **Test preservation**: NEVER modify existing tests without explicit permission
- **Frequent commits**: Make small, safe commits for safety
- **Continuous testing**: Run tests after every change
- **Test Modification**: See [Test Modification Protocol](./test-modification-protocol.md)
- **Phase Progression**: See [Phase Transition Rules](./phase-transition-rules.md)
- **Documentation**: Document WHY refactoring decisions were made
- **PR Reviews**: See [PR Review Protocol](./pr-review-protocol.md)

## Error Handling

When encountering issues:

### 1. Test Failures After Refactoring
- STOP immediately
- Analyze what behavior changed unexpectedly
- Fix refactoring to preserve original behavior
- NEVER modify tests to match new behavior without permission
- **Note**: Test failure indicates behavior changed, not a bug

### 2. Performance Degradation
- Document the regression
- Identify which refactoring step caused it
- Either optimize the refactored code or revert that step

### 3. Scope Creep (New Features)
- STOP adding functionality
- Focus purely on code quality improvements
- Document any feature ideas for separate tasks

### 4. Complex Dependencies
- Break refactoring into smaller steps
- Document dependency challenges
- Ask user for guidance on approach

## PR Review Workflow

> **Full Protocol**: See [PR Review Protocol](./pr-review-protocol.md)

**Proactive review requests** when:
- Planning major structural changes
- Completing phases 2, 3, 5, 6
- Encountering unexpected complexity
- Finding significant additional refactoring opportunities
- Hitting performance or dependency concerns
