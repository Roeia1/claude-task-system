# Journal Entry Guidelines

## Purpose & Philosophy

Journaling is a core discipline of the 8-phase execution workflow. It creates an audit trail of decisions, documents the reasoning behind architectural choices, and captures insights that help future developers understand WHY decisions were made, not just WHAT was done.

**Benefits of Good Journaling**:
- Creates decision audit trail for future reference
- Helps onboard new developers to the codebase
- Documents reasoning and context for PR reviews
- Facilitates learning through reflection
- Prevents repeating past mistakes
- Builds institutional knowledge

## When to Update

Journal entries should be created at key points during task execution:

### Required Journaling Moments
- **Phase Transitions**: At the completion of each phase (1-8)
- **Design Decisions**: When choosing between technical approaches
- **Architectural Choices**: When making decisions that impact system design
- **Implementation Challenges**: When encountering and solving significant problems
- **Key Insights**: When gaining important learnings or realizations
- **PR Review Responses**: When addressing reviewer feedback

### Optional but Encouraged
- Test strategy decisions and coverage considerations
- Refactoring rationale and quality improvements
- Code pattern choices and their justification
- Dependency or configuration changes
- Performance optimization decisions

## Using the Journaling Subagent

All journaling is handled through the **journaling subagent** (`.claude/agents/journaling.md`), which validates content quality, formats entries consistently, and maintains journal structure.

### How to Invoke

Use the Task tool with the journaling subagent:

```markdown
Use Task tool with subagent_type="journaling" and provide prepared content
```

### Required Parameters

- **task_id**: Task number (e.g., "042")
- **phase**: Current phase (e.g., "Phase 4: Implementation")
- **activity**: What's being documented (e.g., "Database Schema Implementation")
- **content**: The journal entry narrative (what happened, decisions, reasoning)
- **next_action**: Specific next step (concrete and actionable)

### Optional Parameters

- **is_phase_transition**: `true` when entering a new phase
- **adr_references**: Array of ADR IDs (e.g., `["ADR-005"]`)

### Example Invocation: Phase Transition

```markdown
Invoke journaling subagent with:

task_id: "042"
phase: "Phase 3: Test Creation"
activity: "Phase 2 Complete: Solution Design Finalized"
is_phase_transition: true
content: |
  Completed solution design for user authentication system. Decided to use JWT-based authentication with 15-minute access tokens and 7-day refresh tokens after reviewing tech-stack.md and architecture-principles.md.

  **Considered alternatives:**
  1. Session-based (cookies) - Rejected due to cross-domain complexity
  2. OAuth2 only - Rejected as over-engineered for current needs
  3. JWT with refresh tokens - **Selected** for stateless scalability

  Created ADR-005 documenting this decision and security considerations.
next_action: "Request permission to proceed to Phase 3 (Test Creation)"
adr_references: ["ADR-005"]
```

### Example Invocation: Implementation Challenge

```markdown
Invoke journaling subagent with:

task_id: "042"
phase: "Phase 4: Implementation"
activity: "Database Schema Implementation"
content: |
  **Challenge**: Encountered circular dependency between users and organizations tables during schema migration.

  **Solution**: Added deferred constraints using DEFERRABLE INITIALLY DEFERRED on foreign keys and adjusted migration order.

  **Learning**: PostgreSQL deferred constraints allow inserting related records in same transaction without constraint violations. This pattern should be documented for future multi-table migrations.
next_action: "Implement User model with password hashing before organization relationships"
```

### Example Invocation: PR Review Response

```markdown
Invoke journaling subagent with:

task_id: "042"
phase: "Phase 6: Verification & Polish"
activity: "PR Review Response"
content: |
  Addressed reviewer feedback on authentication implementation:

  1. **Token expiration handling**: Added explicit expiration checks before token validation
  2. **Error messages**: Made error responses more specific per security best practices
  3. **Test coverage**: Added edge case tests for token expiration boundaries

  All comments resolved and marked as resolved on GitHub.
next_action: "Wait for final approval and re-run CI checks"
```

## What to Include (High-Level)

The subagent validates content quality, but you should prepare meaningful content that includes:

### Phase Transitions
- What was accomplished in the phase
- Exit criteria that were satisfied
- Key decisions or insights from the phase
- Permission request for next phase

### Design Decisions
- What decision was made
- What alternatives were considered (and why rejected)
- Why the chosen option was selected
- Tradeoffs accepted and their implications

### Implementation Notes
- Challenges encountered during implementation
- Solutions applied to overcome challenges
- Code patterns or techniques used
- Deviations from the original design (with reasoning)

### Test Strategy
- Testing approach chosen and rationale
- Scenarios and edge cases covered
- Coverage strategy and goals
- Why this testing approach fits the requirements

### Refactoring Rationale
- What was improved and why it needed improvement
- How the code is better after refactoring
- Impact on maintainability, performance, or clarity
- Whether tests still pass after changes

### Key Learnings
- Insights gained during execution
- What worked well and what didn't
- Improvements for future similar tasks
- Patterns or practices to reuse

## What NOT to Include

The subagent will reject poor quality content, but avoid preparing:

- **Verbose code snippets**: Link to commits instead
- **Duplicate information**: Already captured in task.md or feature docs
- **Implementation details**: Better suited for code comments
- **Trivial updates**: "Made progress" without meaningful insight
- **Vague statements**: "Did some stuff" or "worked on feature"
- **Status updates**: "Still working on X" without context or learning

## Quality Standards

The journaling subagent enforces strict quality validation:

### Content Quality Requirements
- ✅ **Meaningful**: Provides actual insight, not just status
- ✅ **Reasoning-focused**: Documents WHY decisions were made
- ✅ **Contextual**: Explains what was happening and why it matters
- ✅ **Complete**: Includes all relevant information
- ✅ **Specific**: Uses concrete details, not vague language

### Entry Format
The subagent automatically formats entries with:
- Proper timestamp (`YYYY-MM-DD HH:MM`)
- Structured header with activity description
- Your prepared content body
- ADR references (if provided)
- Concrete next action

**Note**: You don't need to worry about formatting mechanics - the subagent handles this. Focus on preparing meaningful content.

### Quality Validation Examples

**✅ Good Content (will be accepted)**:
```markdown
Implemented user authentication schema with PostgreSQL. Initially considered using UUIDs for user IDs but decided on BIGSERIAL after reviewing tech-stack.md recommendation for consistency with existing tables.

**Challenge**: Foreign key constraints created circular dependency between users and organizations tables.

**Solution**: Added deferred constraints and adjusted migration order. Created ADR-003 to document this pattern.
```

**❌ Poor Content (will be rejected)**:
```markdown
Did some stuff. Made progress on the database.
```

The subagent will reject vague content and request specific information about what was done, why decisions were made, and what was learned.

## Mechanics and Detailed Format

For detailed information about:
- Entry format standards
- File structure requirements
- Validation criteria
- Error handling

See:
- **Journaling subagent**: `.claude/agents/journaling.md` (orchestration mechanics)
- **Journal-entry skill**: `.claude/skills/journal-entry/SKILL.md` (detailed HOW-TO)

These handle all mechanical aspects of journaling. Your responsibility is to:
1. **Decide WHEN** to create journal entries (based on triggers above)
2. **Prepare WHAT** to include (meaningful content with reasoning)
3. **Invoke the subagent** with proper parameters

The subagent handles the HOW (formatting, validation, file operations).
