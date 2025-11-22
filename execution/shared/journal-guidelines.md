# Journal Entry Guidelines

## When to Update

Update the journal throughout task execution when:

- Transitioning between phases
- Making test strategy decisions
- Choosing implementation approaches
- Documenting refactoring rationale
- Encountering problems and their solutions
- Gaining key insights

## Entry Format

Use this structured format for all journal entries:

```markdown
### [Timestamp] - [Phase/Activity]

[Content describing what happened, decisions made, insights gained]

**Next:** [What you plan to do next]
```

## What to Include

### Phase Transitions
- Current phase number and name
- Exit criteria satisfied
- What was accomplished
- Permission to proceed

### Design Decisions
- What decision was made
- What alternatives were considered
- Why this option was chosen
- Tradeoffs accepted

### Implementation Notes
- Challenges encountered
- Solutions applied
- Code patterns used
- Technical insights

### Test Strategy
- What is being tested
- Why this testing approach
- Coverage considerations
- Edge cases identified

### Refactoring Rationale
- What was improved
- Why it needed improvement
- How it's better now
- Impact on tests

## What NOT to Include

- Verbose code snippets (link to commits instead)
- Duplicate information already in task file
- Implementation details better suited for code comments
- Trivial updates without meaningful insight

## Example Good Entry

```markdown
### 2025-01-15 14:30 - Phase 4: Database Schema Implementation

Implemented the user authentication schema with PostgreSQL. Initially considered using UUIDs for user IDs but decided on BIGSERIAL after reviewing the tech-stack.md recommendation for consistency with existing tables.

**Challenge**: Foreign key constraints created circular dependency between users and organizations tables.

**Solution**: Added deferred constraints and adjusted migration order. Created ADR-003 to document this pattern for future reference.

**Next**: Implement password hashing middleware before moving to session management.
```

## Example Poor Entry

```markdown
### 2025-01-15 14:30 - Working on code

Did some stuff. Made progress.

**Next**: Do more stuff.
```

## Benefits of Good Journaling

- Creates audit trail of decisions
- Helps onboard future developers
- Documents WHY, not just WHAT
- Facilitates learning and reflection
- Provides context for PR reviews
