# Phase Transition Rules

## Permission Gate Protocol

### Core Principle

**NEVER proceed to the next phase without explicit user permission.**

This ensures:
- User maintains control over task execution
- Each phase is reviewed before continuation
- Opportunity to course-correct at each stage
- Quality gates are enforced

### Requesting Permission

At the end of each phase, explicitly request permission:

```markdown
**Phase [N] is complete. All exit criteria satisfied.**

May I proceed to Phase [N+1]: [Phase Name]?
```

### Exit Criteria Requirement

Before requesting permission, verify all exit criteria for the current phase are met:

- Phase 1: Clear understanding documented, concerns identified, initial commit made
- Phase 2: Complete solution design documented, architecture decisions committed
- Phase 3: All tests written and failing as expected, test strategy committed
- Phase 4: All tests passing, implementation complete, all milestones committed
- Phase 5: Code is clean and maintainable, all tests still passing, refactoring committed
- Phase 6: All criteria verified, code polished, quality checks pass, PR ready for review
- Phase 7: Complete reflection documented, task file updated with learnings
- Phase 8: Ready to merge PR and complete task

### Sequential Execution

Phases must be completed in order:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

**No skipping phases.** Each phase builds on the previous.

### Exception: Combined Phases

Some workflows combine phases when it makes sense:

- **Task Analyzer Subagent**: Combines Phase 1 (Analysis) and Phase 2 (Design) into a single comprehensive analysis step
- **Deployment Tasks**: May have different phase structure suited to operational workflows

When phases are combined, still request permission before proceeding to the next distinct phase.

### What User Permission Looks Like

Acceptable user responses to proceed:

- "Yes"
- "Go ahead"
- "Proceed"
- "Continue"
- "Approved"
- Any affirmative response

### When Permission Is Denied

If user says "wait", "hold", "not yet", or provides feedback:

1. **Stop immediately**
2. **Address user's concerns**
3. **Make requested changes**
4. **Re-request permission** after addressing feedback

### Proactive Mid-Phase Checks

While permission is only *required* at phase boundaries, consider proactively asking for review within complex phases:

- Major architectural decisions (Phase 2)
- Complex test strategies (Phase 3)
- Significant implementation milestones (Phase 4)
- Extensive refactoring (Phase 5)

Use phrasing: "Should I request a review before proceeding with [specific action]?"
