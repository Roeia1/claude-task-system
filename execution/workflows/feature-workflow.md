# Feature Task Execution Workflow

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

> **Journal Guidelines**: See [Journal Entry Guidelines](../shared/journal-guidelines.md) for detailed guidance on when and how to update the journal.

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
5. **Invoke journaling subagent** to document Phase 1 completion:
   ```
   task_id: Current task number
   phase: "Phase 1: Task Analysis"
   activity: "Phase 1 Complete: Task Analysis Finalized"
   is_phase_transition: true
   content: |
     [Prepared summary of task analysis including:
      - Key findings from task.md, feature.md, and plan.md
      - Understanding of requirements and acceptance criteria
      - Dependencies verified as COMPLETED
      - Concerns or ambiguities identified
      - Initial technical approach understanding]
   next_action: "Request user permission to proceed to Phase 2 (Solution Design)"
   ```
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
5. Identify ambiguities or concerns
6. **Invoke journaling subagent** to document analysis:
   ```
   task_id: Current task number
   phase: "Phase 1: Task Analysis"
   activity: "Phase 1 Complete: Task Analysis Finalized"
   is_phase_transition: true
   content: |
     [Prepared summary including:
      - Task understanding and objectives
      - Requirements analysis
      - Dependencies verified
      - Concerns or ambiguities identified]
   next_action: "Request user permission to proceed to Phase 2 (Solution Design)"
   ```
7. **Commit and push initial work**: `git add . && git commit -m "docs(task-XXX): initial task analysis and journal setup" && git push`

### Exit Criteria

- Clear understanding documented
- Concerns identified
- Initial commit made
- **If using subagent**: Comprehensive analysis report reviewed and approved

> **Phase Transition**: See [Phase Transition Rules](../shared/phase-transition-rules.md) for permission protocol.

**Request permission to proceed to Phase 2**

## Phase 2: Solution Design

**Note**: If using Task Analyzer subagent, Phase 1 and 2 are performed together. The subagent provides solution design as part of its comprehensive analysis. Skip to Phase 3 if subagent was used.

### Manual Solution Design (when subagent not used)

1. Research technical approach using provided resources
2. Analyze existing codebase patterns
3. Design solution architecture
4. Consider how to approach sub-tasks from task file
5. Consider risks identified in task file
6. Plan how solution will be tested
7. **Invoke journaling subagent** to document design:
   ```
   task_id: Current task number
   phase: "Phase 2: Solution Design"
   activity: "Phase 2 Complete: Solution Design Finalized"
   is_phase_transition: true
   content: |
     [Prepared design documentation including:
      - Technical approach and architecture
      - Design decisions made with reasoning
      - Alternatives considered and why rejected
      - Tradeoffs accepted
      - How sub-tasks will be approached
      - Testing strategy plan]
   next_action: "Request user permission to proceed to Phase 3 (Test Creation)"
   adr_references: ["ADR-XXX"] (if ADRs were created)
   ```
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
5. **Invoke journaling subagent** to document test creation:
   ```
   task_id: Current task number
   phase: "Phase 3: Test Creation"
   activity: "Phase 3 Complete: Test Suite Created"
   is_phase_transition: true
   content: |
     [Prepared test strategy documentation including:
      - Testing approach and rationale
      - Scenarios covered (happy path, edge cases, error conditions)
      - Why this testing approach fits requirements
      - Coverage strategy
      - All tests confirmed failing as expected (TDD)]
   next_action: "Request user permission to proceed to Phase 4 (Implementation)"
   ```
6. **Commit and push test creation**: `git add . && git commit -m "test(task-XXX): add comprehensive test suite for [feature]" && git push`
7. **Consider review request**: For complex test strategies, ask user if they want to review the test approach

### Exit Criteria

- All tests written, failing as expected
- Test strategy committed

**Request permission to proceed to Phase 4**

## Phase 4: Implementation

1. Implement functionality to make failing tests pass
2. **Commit and push logical milestones**: Use meaningful commits for each significant piece of functionality
   - `feat(task-XXX): implement core [component] functionality && git push`
   - `feat(task-XXX): add [specific feature] support && git push`
3. **If test modification seems necessary**:
   - See: [Test Modification Protocol](../shared/test-modification-protocol.md)
   - Follow the protocol exactly as specified
4. Work through sub-tasks from task file methodically
5. **Invoke journaling subagent** when encountering significant challenges or decisions:
   ```
   task_id: Current task number
   phase: "Phase 4: Implementation"
   activity: "[Specific Activity, e.g., 'Database Schema Implementation']"
   content: |
     [Prepared documentation of:
      - What was implemented
      - Implementation decisions made and reasoning
      - Challenges encountered and how solved
      - Code patterns or techniques used
      - Any deviations from design with justification]
   next_action: "[Specific next implementation step]"
   update_sections:
     "Implementation Notes": "Brief summary of key decision or challenge"
   ```
6. Check off completed sub-tasks in task file
7. Run tests frequently to track progress
8. Continue until all tests pass
9. **Handle design issues**: If significant design flaws emerge, address within this phase using Phase 2-style analysis
10. **When phase complete, invoke journaling subagent** for phase transition:
    ```
    task_id: Current task number
    phase: "Phase 4: Implementation"
    activity: "Phase 4 Complete: Implementation Finalized"
    is_phase_transition: true
    content: |
      [Summary of implementation phase:
       - What was implemented
       - Key decisions and approaches
       - Challenges overcome
       - All tests now passing]
    next_action: "Request user permission to proceed to Phase 5 (Refactor)"
    ```
11. **Consider mid-phase review**: For complex implementations, ask user if they want to review progress

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
6. **Invoke journaling subagent** to document refactoring:
   ```
   task_id: Current task number
   phase: "Phase 5: Refactor"
   activity: "Phase 5 Complete: Refactoring Finalized"
   is_phase_transition: true
   content: |
     [Prepared refactoring documentation including:
      - What was improved and why
      - How code is better now
      - Impact on maintainability/performance/clarity
      - All tests still passing after changes]
   next_action: "Request user permission to proceed to Phase 6 (Verification)"
   ```
7. Repeat until satisfied with code quality

### Exit Criteria

- Code is clean, maintainable
- All tests still passing
- Refactoring work committed

**Request permission to proceed to Phase 6**

## Phase 6-7: Verification & Reflection

> **Complete Checklist**: See [Verification Checklist](../shared/verification-checklist.md) for Phase 6 verification steps and Phase 7 reflection guide.

### Phase 6 Summary

1. Verify all acceptance criteria from task file
2. Run final code quality checks
3. Mark PR ready for review
4. Request user approval

**Request permission to proceed to Phase 7**

### Phase 7 Summary

1. Review entire task journey
2. Update task file with learnings
3. **Invoke journaling subagent** for final reflection:
   ```
   task_id: Current task number
   phase: "Phase 7: Reflection"
   activity: "Phase 7 Complete: Reflection Finalized"
   is_phase_transition: true
   content: |
     [Prepared reflection including:
      - Key learnings from this task
      - What worked well
      - What could be improved for next time
      - Insights gained
      - Patterns or practices to reuse]
   next_action: "Request user permission to complete task (Phase 8)"
   ```

**Request permission to complete task**

## Phase 8: Task Completion

> **Completion Process**: See [Completion Protocol](../shared/completion-protocol.md) for detailed instructions on running the completion command and what it does.

After completing Phase 7, run:
```bash
/project:complete-task
```

## Important Rules

- **Test-Driven Development**: NEVER write implementation code before tests (Phase 3)
- **Test Modification**: NEVER modify tests after Phase 3 without explicit permission - see [Test Modification Protocol](../shared/test-modification-protocol.md)
- **Phase Progression**: NEVER proceed to next phase without permission - see [Phase Transition Rules](../shared/phase-transition-rules.md)
- **Sequential Execution**: Complete phases in order
- **Documentation**: Document WHY, not just WHAT - see [Journal Guidelines](../shared/journal-guidelines.md)
- **Commit Discipline**: Commit logical milestones throughout development
- **PR Reviews**: Address PR reviews immediately when user signals - see [PR Review Protocol](../shared/pr-review-protocol.md)

## Error Handling

When encountering issues:

### 1. Test Failures
- Analyze why implementation doesn't meet test expectations
- Fix implementation to satisfy tests
- If test seems wrong, discuss with user before any changes
- See: [Test Modification Protocol](../shared/test-modification-protocol.md)

### 2. Design Flaws
- Document the flaw discovered
- Discuss with user whether to revisit Phase 2

### 3. Technical Blockers
- **Invoke journaling subagent** to document the blocker:
  ```
  task_id: Current task number
  phase: Current phase
  activity: "Technical Blocker Encountered"
  content: |
    [Description of:
     - What blocker was encountered
     - Why it's blocking progress
     - What has been tried
     - Potential alternative solutions]
  next_action: "Discuss alternatives with user"
  ```
- Present alternative solutions to user
- Discuss tradeoffs and get guidance

### 4. Unclear Requirements
- Document what is unclear
- Ask user for clarification
- Do not proceed until ambiguity resolved

## PR Review Workflow

> **Full Protocol**: See [PR Review Protocol](../shared/pr-review-protocol.md) for complete PR review procedures.

**When user signals review** ("I made a review", "Check the PR comments"):
1. Immediately pause current phase work
2. Read entire PR review using GitHub CLI
3. Address all comments systematically per protocol

**Proactive review requests**: Ask user "Should I request a review?" when:
- Making major technical decisions
- Completing phases 2, 3, 5, 6
- Encountering scope creep or requirement changes
