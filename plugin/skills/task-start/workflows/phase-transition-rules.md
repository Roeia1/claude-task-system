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

Before requesting permission, verify all exit criteria for the current phase are met. Exit criteria vary by task type - see the specific workflow file:

- `feature-workflow.md` - 5 phases
- `bugfix-workflow.md` - 6 phases
- `refactor-workflow.md` - 6 phases
- `performance-workflow.md` - 6 phases
- `deployment-workflow.md` - 8 phases

### Sequential Execution

Phases must be completed in order. **No skipping phases.** Each phase builds on the previous.

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

- Major architectural decisions
- Complex test strategies
- Significant implementation milestones
- Extensive refactoring

Use phrasing: "Should I request a review before proceeding with [specific action]?"
