# Bugfix Task Execution Workflow

## Journal Structure

Initialize journal with:

```markdown
# Task #[NUMBER]: [TITLE]

## Current Phase: Phase 1 - Task Analysis

## Git References

- **Branch**: bugfix/task-XXX-description
- **PR**: #XXX - [PR Title]
- **Base Branch**: main

## Task Understanding

[Filled after analysis]

## Bug Investigation

[Filled in Phase 2]

## Test Strategy

[Filled in Phase 3]

## Fix Implementation

[Filled in Phase 4]

## Validation Results

[Filled in Phase 5]

## Progress Log

[Updated throughout with timestamped entries]

## Key Learnings

[Updated throughout]
```

> **Journal Guidelines**: See [Journal Entry Guidelines](../shared/journal-guidelines.md) for detailed guidance. For bugfixes, emphasize root cause analysis and validation results.

## Phase 1: Task Analysis

**Prerequisites**: Git setup and journal initialization completed by start-task command

### Task Analysis

1. Read entire task file thoroughly
2. Review all dependencies are COMPLETED
3. Analyze bug description, symptoms, and impact
4. Review existing sub-tasks in task file
5. Identify ambiguities or concerns about the bug
6. **Journal**: Phase 1 completion - document bug symptoms, impact assessment, initial understanding, verified dependencies, concerns
7. **Commit and push initial work**: `git add . && git commit -m "docs(task-XXX): initial task analysis and journal setup" && git push`

### Exit Criteria

- Clear understanding of bug documented
- Impact and urgency assessed
- Initial commit made

> **Phase Transition**: See [Phase Transition Rules](../shared/phase-transition-rules.md)

**Request permission to proceed to Phase 2**

## Phase 2: Bug Investigation

1. Reproduce the bug reliably using provided steps
2. Identify the root cause through debugging/analysis
3. Determine scope of impact (affected components/features)
4. Assess urgency and potential for regression
5. Identify the minimal fix approach
6. Consider any risks from the proposed fix
7. **Journal**: Phase 2 completion - document bug reproduction steps, root cause analysis, affected components, proposed minimal fix approach, risks and why this approach chosen
8. **Commit and push investigation work**: `git add . && git commit -m "docs(task-XXX): complete bug investigation and root cause analysis" && git push`
9. **Consider review request**: For complex bugs or unclear root causes, ask user if they want to review findings

### Exit Criteria

- Bug reliably reproduced
- Root cause identified
- Fix approach determined
- Investigation documented

**Request permission to proceed to Phase 3**

## Phase 3: Test-First Bug Fix

1. Write test that reproduces the bug with current code
2. Verify the test fails (confirming bug exists)
3. Add regression prevention tests for related scenarios
4. Focus on:
   - Exact reproduction of reported symptoms
   - Edge cases that might trigger similar issues
   - Integration scenarios if bug affects multiple components
5. DO NOT write any fix code during this phase
6. **Journal**: Phase 3 completion - document test reproduces bug (failing as expected), regression prevention tests, test strategy rationale, edge cases covered
7. **Commit and push test creation**: `git add . && git commit -m "test(task-XXX): add tests reproducing bug and preventing regression" && git push`
8. **Consider review request**: For complex test strategies or unclear bug reproduction

### Exit Criteria

- Tests reproduce the bug (failing as expected)
- Regression prevention tests added
- Test strategy committed

**Request permission to proceed to Phase 4**

## Phase 4: Minimal Fix Implementation

1. Apply targeted fix to make bug reproduction test pass
2. **Commit minimal fix immediately**: `fix(task-XXX): resolve [specific bug] in [component]` && git push
3. **CRITICAL**: Avoid scope creep - fix only the reported issue
4. **If test modification seems necessary**:
   - See: [Test Modification Protocol](../shared/test-modification-protocol.md)
   - Follow the protocol exactly as specified
5. Run full test suite to ensure no new regressions
6. Work through sub-tasks from task file methodically
7. **Journal**: Phase 4 completion - document fix applied, why it resolves root cause, tests now passing, no regressions, challenges encountered, scope kept minimal
8. Check off completed sub-tasks in task file
9. If significant design issues are discovered during fix:
   - Document the design problem
   - Discuss with user whether to address in this task or create separate refactoring task
10. **Verify fix works**: Test the original bug scenario manually

### Exit Criteria

- Bug reproduction test passes
- No new test failures introduced
- Original bug symptoms resolved
- Fix committed

**Request permission to proceed to Phase 5**

## Phase 5: Validation & Edge Cases

1. Test edge cases and boundary conditions related to the bug
2. Perform integration testing in affected areas
3. Verify fix works across different scenarios/environments
4. Run performance tests if bug was performance-related
5. Ensure error handling is appropriate for the fix
6. **Journal**: Phase 5 completion - document edge cases tested, integration scenarios verified, different scenarios/environments tested, performance validation, all validation passed
7. **Commit validation work**: `git add . && git commit -m "test(task-XXX): validate bugfix across edge cases and integration scenarios" && git push`

### Exit Criteria

- Edge cases tested and working
- Integration scenarios verified
- Validation results documented

**Request permission to proceed to Phase 6**

## Phase 6-7: Verification & Reflection

> **Complete Checklist**: See [Verification Checklist](../shared/verification-checklist.md)

### Phase 6: Bugfix-Specific Checks

1. Verify all acceptance criteria from task file met
2. Ensure all sub-tasks are checked off
3. Review entire fix against original bug report
4. **Confirm fix is minimal and targeted** (no scope creep)
5. Update documentation if bug affected documented behavior
6. Run final code quality checks
7. Mark PR ready for review

**Request permission to proceed to Phase 7**

### Phase 7: Bugfix Reflection

1. Review entire bugfix journey
2. **Journal**: Phase 7 completion - reflect on root cause insights for prevention, what could prevent similar bugs, additional testing strategies, key learnings, prevention strategies to implement

**Request permission to complete task**

## Phase 8: Task Completion

> **Completion Process**: See [Completion Protocol](../shared/completion-protocol.md)

After completing Phase 7, run:
```bash
/project:complete-task
```

Before running, review if any preventive tasks should be created (refactoring, additional testing).

## Important Rules

- **NEVER expand scope** beyond the specific bug
- **Test-Driven**: Write bug reproduction test before fix
- **Minimal fixes**: Apply targeted fixes only
- **Test Modification**: See [Test Modification Protocol](../shared/test-modification-protocol.md)
- **Phase Progression**: See [Phase Transition Rules](../shared/phase-transition-rules.md)
- **Documentation**: Document root cause analysis thoroughly
- **Regression prevention**: Prioritize preventing similar bugs
- **PR Reviews**: See [PR Review Protocol](../shared/pr-review-protocol.md)

## Error Handling

When encountering issues:

### 1. Cannot Reproduce Bug
- Document reproduction attempts
- Ask user for additional details or clarification
- Request different test scenarios or environments

### 2. Root Cause Unclear
- Document investigation steps taken
- Present findings to user
- Ask for guidance or additional context

### 3. Fix Causes New Issues
- Document the new issues discovered
- Discuss with user whether to fix in this task or create separate task
- Consider if original approach needs revision

### 4. Complex Fix Required
- Document complexity discovered
- Discuss with user whether to split into multiple tasks
- Consider if immediate workaround is needed

## PR Review Workflow

> **Full Protocol**: See [PR Review Protocol](../shared/pr-review-protocol.md)

**Proactive review requests** when:
- Root cause is complex or unclear
- Fix approach has multiple valid options
- Completing phases 2, 3, 5, 6
- Discovering scope creep or additional related issues
- Finding design problems that extend beyond the bug
