# Journaling Guidelines

**CRITICAL - SINGLE SOURCE OF TRUTH**: This file is the ONLY authoritative source for **WHEN** to journal and **WHAT** to include during task execution. You MUST follow these guidelines exactly.

**IMPORTANT**: The journaling subagent handles all format standards and quality validation automatically. You MUST NOT attempt to format entries manually.

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

You MUST create journal entries at the following key points during task execution:

### Required Journaling Moments (NON-NEGOTIABLE)

You MUST ALWAYS journal at these moments - skipping is NOT allowed:

- **Phase Transitions**: ALWAYS at the completion of each phase (1-8)
- **Design Decisions**: ALWAYS when choosing between technical approaches
- **Architectural Choices**: ALWAYS when making decisions that impact system design
- **Implementation Challenges**: ALWAYS when encountering and solving significant problems
- **Key Insights**: ALWAYS when gaining important learnings or realizations
- **PR Review Responses**: ALWAYS when addressing reviewer feedback

### Optional but Encouraged
- Test strategy decisions and coverage considerations
- Refactoring rationale and quality improvements
- Code pattern choices and their justification
- Dependency or configuration changes
- Performance optimization decisions

## Using the Journaling Subagent

**VERY IMPORTANT**: ALL journaling MUST be handled through the **journaling subagent** (plugin's `agents/journaling.md`). NEVER write directly to journal files. The subagent validates content quality, formats entries consistently, and maintains journal structure.

### How to Invoke

You MUST use the Task tool with the journaling subagent:

```markdown
Use Task tool with subagent_type="journaling" and provide prepared content
```

### Required Parameters (ALL MANDATORY)

You MUST provide ALL of these parameters - the subagent will FAIL without them:

- **task_id**: Task number (e.g., "042") - REQUIRED
- **phase**: Current phase (e.g., "Phase 4: Implementation") - REQUIRED
- **activity**: What's being documented (e.g., "Database Schema Implementation") - REQUIRED
- **content**: The journal entry narrative (what happened, decisions, reasoning) - REQUIRED
- **next_action**: Specific next step (MUST be concrete and actionable) - REQUIRED

### Optional Parameters

- **is_phase_transition**: `true` when entering a new phase
- **adr_references**: Array of ADR IDs (e.g., `["ADR-005"]`)

### Example Invocation: Task Start (First Entry)

```markdown
Invoke journaling subagent with:

task_id: "042"
phase: "Phase 1"
activity: "Task Started"
content: |
  Task initialized: Implement user authentication system.
  Task type: feature. Dependencies verified as COMPLETED.
  Branch created: feature/task-042-user-auth. PR created: #156 (draft).
next_action: "Begin Phase 1: Task Analysis following feature-workflow.md"
```

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

**IMPORTANT**: The subagent validates content quality. You MUST prepare meaningful content that includes the elements below. Vague or empty content will be REJECTED:

### Phase Transitions (REQUIRED for every phase)
You MUST include:
- What was accomplished in the phase
- Exit criteria that were satisfied
- Key decisions or insights from the phase
- Permission request for next phase

### Design Decisions (REQUIRED when making choices)
You MUST include:
- What decision was made
- What alternatives were considered (and why rejected)
- Why the chosen option was selected
- Tradeoffs accepted and their implications

### Implementation Notes (REQUIRED for significant work)
You MUST include:
- Challenges encountered during implementation
- Solutions applied to overcome challenges
- Code patterns or techniques used
- Deviations from the original design (with reasoning)

### Test Strategy (REQUIRED in Phase 3)
You MUST include:
- Testing approach chosen and rationale
- Scenarios and edge cases covered
- Coverage strategy and goals
- Why this testing approach fits the requirements

### Refactoring Rationale (REQUIRED in Phase 5)
You MUST include:
- What was improved and why it needed improvement
- How the code is better after refactoring
- Impact on maintainability, performance, or clarity
- Whether tests still pass after changes

### Key Learnings (ALWAYS document insights)
You MUST include:
- Insights gained during execution
- What worked well and what didn't
- Improvements for future similar tasks
- Patterns or practices to reuse

## What NOT to Include

**CRITICAL**: The subagent will REJECT poor quality content. NEVER include the following:

- **Verbose code snippets**: NEVER include large code blocks - link to commits instead
- **Duplicate information**: NEVER repeat what's already in task.md or feature docs
- **Implementation details**: These belong in code comments, NOT in journals
- **Trivial updates**: NEVER write "Made progress" without meaningful insight
- **Vague statements**: NEVER write "Did some stuff" or "worked on feature" - be SPECIFIC
- **Status updates**: NEVER write "Still working on X" without context or learning

## Summary: Your Responsibilities

You MUST follow these three steps for EVERY journal entry:

1. **Decide WHEN** - You MUST journal at all required moments listed above. NEVER skip required journaling.
2. **Prepare WHAT** - You MUST prepare meaningful content with reasoning and context. Vague content is NOT acceptable.
3. **Invoke the subagent** - You MUST use the journaling subagent with ALL required parameters (task_id, phase, activity, content, next_action). NEVER write to journal files directly.

**IMPORTANT**: The subagent will handle all formatting, validation, and file operations automatically. You MUST NOT bypass the subagent.
