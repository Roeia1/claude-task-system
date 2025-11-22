# PR Review Protocol

## When User Signals Review

When user mentions "I made a review", "Check the PR comments", "I left feedback", or similar:

1. **Immediately pause current phase work**
2. Read entire PR review using GitHub CLI
3. Address all comments systematically

## Comment Response Protocol

For each comment:

1. **Read comment completely**
2. **Assess clarity**:
   - **Clear instruction/feedback** → Apply changes, commit with reference to comment, resolve comment
   - **Ambiguous or needs discussion** → Reply to comment with questions/discussion, leave unresolved
3. **Document in journal**: What was changed and why
4. **Use commit format**: `fix(task-XXX): address PR feedback - [description] (resolves comment #N) && git push`

## Comment Resolution Rules

- **Resolve when**: Taking concrete action (code change, test update, documentation fix)
- **Don't resolve when**: Asking for clarification or starting discussion
- **All comments require action**: Either change implementation or engage in discussion

## Proactive Review Requests

Ask user "Should I request a review to [specific purpose]?" when:

- Making major technical decisions
- Completing phases 2, 3, 5, 6 (design, tests, refactor, verification)
- Encountering scope creep or significant requirement changes
- Facing performance/complexity concerns
- Hitting unexpected blockers that change approach

## Review Documentation

After each review session, add to journal:

```markdown
### [Timestamp] - PR Review Response

**Comments addressed**: [number]
**Changes made**: [summary of changes]
**Discussions started**: [topics requiring clarification]
**Next**: [what to do next]
```
