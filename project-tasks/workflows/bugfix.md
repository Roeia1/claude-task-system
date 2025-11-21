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

## Phase 1: Task Analysis

**Prerequisites**: Git setup and journal initialization completed by start-task command

### Task Analysis

1. Read entire task file thoroughly
2. Review all dependencies are COMPLETED
3. Analyze bug description, symptoms, and impact
4. Review existing sub-tasks in task file
5. Document understanding in journal
6. Identify ambiguities or concerns about the bug
7. **Commit and push initial work**: `git add . && git commit -m "docs(task-XXX): initial task analysis and journal setup" && git push`

### Exit Criteria

- Clear understanding of bug documented
- Impact and urgency assessed
- Initial commit made

**Request permission to proceed to Phase 2**

## Phase 2: Bug Investigation

1. Reproduce the bug reliably using provided steps
2. Identify the root cause through debugging/analysis
3. Determine scope of impact (affected components/features)
4. Assess urgency and potential for regression
5. Document investigation findings in journal
6. Identify the minimal fix approach
7. Consider any risks from the proposed fix
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
6. Document test strategy and rationale in journal
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
3. Avoid scope creep - fix only the reported issue
4. If test modification seems necessary:
   - **STOP and READ**: `/home/roei/projects/Titinski/project-tasks/workflows/shared/test-modification-protocol.md`
   - Follow the protocol exactly as specified in that file
5. Run full test suite to ensure no new regressions
6. Work through sub-tasks from task file methodically
7. Update journal with:
   - Fix implementation details
   - Challenges encountered
   - Solutions applied
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
6. Document validation results in journal
7. **Commit validation work**: `git add . && git commit -m "test(task-XXX): validate bugfix across edge cases and integration scenarios" && git push`

### Exit Criteria

- Edge cases tested and working
- Integration scenarios verified
- Validation results documented

**Request permission to proceed to Phase 6**

## Phase 6: Verification & Polish

1. Verify all acceptance criteria from task file met
2. Ensure all sub-tasks are checked off
3. Review entire fix against original bug report
4. Confirm fix is minimal and targeted (no scope creep)
5. Update documentation if bug affected documented behavior
6. Ensure code follows project conventions
7. Run final code quality checks: `pnpm check` (or equivalent)
8. Document verification results in journal
9. **Commit and push final polish**: `git add . && git commit -m "docs(task-XXX): final verification and polish" && git push`
10. **Mark PR ready for review**: Convert from draft to ready for review
11. **Proactive review request**: Ask user to review for final approval

### Exit Criteria

- All criteria verified
- Fix is complete and polished
- PR ready for review

**Request permission to proceed to Phase 7**

## Phase 7: Reflection & Documentation

1. Review entire bugfix journey
2. Update task file with:
   - Root cause insights for future prevention
   - Additional testing strategies discovered
   - Lessons learned about the codebase
3. Final journal entry summarizing:
   - What was accomplished
   - Root cause and fix approach
   - Challenges overcome
   - Prevention strategies for similar bugs
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
- Review if any preventive tasks should be created (refactoring, additional testing)
- Make sure you're ready for the PR to be merged

**Phase 8 is now a single command - no manual steps required!**

## Journal Entry Guidelines

### When to Update:

- Phase transitions
- Bug reproduction steps
- Root cause discoveries
- Fix implementation decisions
- Validation results
- Edge case findings

### Entry Format:

```markdown
### [Timestamp] - [Phase/Activity]

[Content describing investigation findings, fix decisions, validation results]
**Root Cause:** [Technical explanation]
**Next:** [What you plan to do next]
```

## Important Rules

- NEVER expand scope beyond the specific bug
- NEVER modify tests after Phase 3 without explicit user permission
- NEVER proceed to next phase without user permission
- Apply minimal, targeted fixes
- Document root cause analysis thoroughly
- Prioritize regression prevention
- Address PR reviews immediately when user signals

## Error Handling

When encountering issues:

1. **Cannot Reproduce Bug**:

   - Document reproduction attempts
   - Ask user for additional details or clarification
   - Request different test scenarios or environments

2. **Root Cause Unclear**:

   - Document investigation steps taken
   - Present findings to user
   - Ask for guidance or additional context

3. **Fix Causes New Issues**:

   - Document the new issues discovered
   - Discuss with user whether to fix in this task or create separate task
   - Consider if original approach needs revision

4. **Complex Fix Required**:
   - Document complexity discovered
   - Discuss with user whether to split into multiple tasks
   - Consider if immediate workaround is needed

## PR Review Workflow

**IMMEDIATELY READ**: `/home/roei/projects/Titinski/project-tasks/workflows/shared/pr-review-workflow.md`

**Follow the standard PR Review Workflow from that file exactly.**

### Proactive Review Requests

Ask user "Should I request a review to [specific purpose]?" when:

- Root cause is complex or unclear
- Fix approach has multiple valid options
- Completing phases 2, 3, 5, 6 (investigation, tests, validation, verification)
- Discovering scope creep or additional related issues
- Finding design problems that extend beyond the bug

### Review Documentation

After each review session, add to journal:

```markdown
### [Timestamp] - PR Review Response

**Comments addressed**: [number]
**Changes made**: [summary of fix adjustments]
**Discussions started**: [topics requiring clarification]
**Next**: [what to do next]
```

## Test Modification Protocol

**READ FIRST**: `/home/roei/projects/Titinski/project-tasks/workflows/shared/test-modification-protocol.md`

**Follow the protocol from that file exactly.**

When documenting test modification needs for bugfixes, be sure to explain how the test change relates to the bug fix.