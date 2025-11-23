---
name: journal-entry
description: "Utility skill for the journaling subagent. Provides detailed instructions for journal entry mechanics including formatting, validation, and file operations. Called proactively by the journaling subagent (.claude/agents/journaling.md) during task execution. NOT user-facing."
---

# Journal Entry Skill

A utility skill that handles the mechanics of creating and inserting properly formatted journal entries. This skill is called by execution agents with prepared content and handles formatting, validation, and file operations.

## Purpose

This skill focuses on **HOW to journal** (mechanics), not **WHAT to journal** (content). The calling agent is responsible for:
- Deciding when to create journal entries
- Preparing the entry content
- Determining the appropriate phase and activity

This skill is responsible for:
- Validating entry quality and format
- Generating proper timestamps
- Formatting entries according to standards
- Finding correct insertion points
- Updating phase headers on transitions
- Updating relevant journal sections
- Performing file I/O operations

## File Locations

- **Journal**: `execution/tasks/NNN/journal.md`
- **Journal Guidelines**: `execution/shared/journal-guidelines.md`
- **Task Type Workflows**: `execution/workflows/{type}-workflow.md`

## Input Requirements

When calling this skill, the agent must provide:

### Required Parameters

- **task_id**: Task number (e.g., "123")
- **phase**: Current phase identifier (e.g., "Phase 4: Implementation")
- **activity**: Specific activity or decision being documented (e.g., "Database Schema Implementation", "PR Review Response")
- **content**: Main journal entry content - what happened, decisions made, challenges encountered, solutions applied
- **next_action**: What will be done next (specific and concrete)

### Optional Parameters

- **is_phase_transition**: Boolean (default: false) - whether this entry marks entering a new phase
- **update_sections**: Object mapping section names to additional content
  - Example: `{"Implementation Notes": "Additional context about implementation approach..."}`
- **adr_references**: Array of ADR references to include (e.g., ["ADR-005", "ADR-012"])

### Input Format Example

```
task_id: "042"
phase: "Phase 4: Implementation"
activity: "Database Schema Implementation"
content: |
  Implemented the user authentication schema with PostgreSQL. Initially considered using UUIDs for user IDs but decided on BIGSERIAL after reviewing the tech-stack.md recommendation for consistency with existing tables.

  **Challenge**: Foreign key constraints created circular dependency between users and organizations tables.

  **Solution**: Added deferred constraints using DEFERRABLE INITIALLY DEFERRED on foreign keys and adjusted migration order to create tables first, then add constraints in a second pass.

  **Learning**: PostgreSQL deferred constraints allow us to insert related records in the same transaction without constraint violations. This pattern should be documented for future multi-table migrations.
next_action: "Implement password hashing middleware before moving to session management"
adr_references: ["ADR-003"]
```

## Process

### Step 1: Load Context

1. **Read journal** from `execution/tasks/{task_id}/journal.md`:
   - Identify current phase from "Current Phase" header
   - Locate "Progress Log" section for insertion point
   - Identify relevant sections for updates (based on phase)

2. **Validate journal structure**:
   - Ensure required sections exist
   - Verify journal follows task type template

### Step 2: Validate Input Quality

Before composing the entry, validate the provided content:

- ✅ **Meaningful content**: Not vague statements like "did some stuff" or "made progress"
- ✅ **Includes reasoning**: For decisions, explains WHY not just WHAT
- ✅ **Concrete next action**: Specific action, not "do more work"
- ✅ **Proper context**: Explains what was happening
- ✅ **Complete information**: Has all necessary details

If validation fails, return specific feedback about what's missing or needs improvement.

### Step 3: Compose Entry

1. **Generate timestamp**: Current date and time in format `YYYY-MM-DD HH:MM`

2. **Create entry header**:
   ```markdown
   ### [Timestamp] - [Activity]
   ```
   Example: `### 2025-01-23 14:30 - Phase 4: Database Schema Implementation`

3. **Format entry body**:
   - Use the provided content as-is (already prepared by calling agent)
   - Add ADR references if provided:
     ```markdown
     **Related ADRs**: ADR-003, ADR-005
     ```

4. **Add next action**:
   ```markdown
   **Next:** [next_action]
   ```

5. **Assemble complete entry**:
   ```markdown
   ### [Timestamp] - [Activity]

   [content]

   [ADR references if applicable]

   **Next:** [next_action]
   ```

### Step 4: Update Journal File

1. **Update phase header** (if is_phase_transition is true):
   - Replace `## Current Phase: ...` with new phase
   - Example: `## Current Phase: Phase 4 - Implementation`

2. **Update relevant sections** (if update_sections provided):
   - Map phase to section:
     - Phase 1 → "Task Understanding"
     - Phase 2 → "Solution Design"
     - Phase 3 → "Test Strategy"
     - Phase 4 → "Implementation Notes"
     - Phase 5 → "Refactoring Decisions"
     - Phase 7 → "Key Learnings"
   - Append content to appropriate section

3. **Insert entry in Progress Log**:
   - Locate "## Progress Log" section
   - Add new entry at the end (most recent last)
   - Maintain proper spacing (blank line before each entry)

4. **Write updated journal** back to file

### Step 5: Return Confirmation

Return summary of actions taken:
- Entry added with timestamp
- Phase header updated (if applicable)
- Sections updated (if applicable)
- File written successfully

## Entry Format Standard

All entries must follow this structure:

```markdown
### [YYYY-MM-DD HH:MM] - [Activity Description]

[Content body with context, decisions, challenges, solutions, insights]

[Optional: ADR references]

**Next:** [Specific next action]
```

## Quality Standards

Entries must meet these criteria:

### Content Quality
- **Meaningful**: Provides actual insight, not status updates
- **Contextual**: Explains what was happening and why
- **Reasoning-focused**: Documents WHY decisions were made
- **Complete**: Includes all relevant information
- **Specific**: Uses concrete details, not vague language

### Format Quality
- **Proper timestamp**: YYYY-MM-DD HH:MM format
- **Clear activity**: Specific description of what occurred
- **Structured content**: Organized with clear flow
- **Concrete next action**: Specific, actionable next step
- **ADR links**: References architectural decisions when applicable

### Common Issues to Reject

❌ **Vague content**: "Did some stuff. Made progress."
❌ **Missing reasoning**: "Decided to use JWT" (no explanation why)
❌ **No context**: "Fixed it." (what was the problem?)
❌ **Generic next action**: "Do more work" (not specific)
❌ **Missing details**: Insufficient information to understand decision

## Phase-Section Mapping

When updating journal sections based on phase:

| Phase | Section to Update | Type of Content |
|-------|------------------|-----------------|
| Phase 1 | Task Understanding | Task analysis, concerns, dependencies |
| Phase 2 | Solution Design | Architecture, design decisions, tradeoffs |
| Phase 3 | Test Strategy | Testing approach, coverage, edge cases |
| Phase 4 | Implementation Notes | Challenges, solutions, patterns used |
| Phase 5 | Refactoring Decisions | Quality improvements, refactoring rationale |
| Phase 6 | *(Progress Log only)* | Verification results |
| Phase 7 | Key Learnings | Insights, what worked, future improvements |
| Phase 8 | *(Progress Log only)* | Completion summary |

## Integration Notes

### Architecture Pattern: Main Agent → Journaling Subagent → This Skill

This skill is designed to be used **BY the journaling subagent** (`.claude/agents/journaling.md`), NOT by main execution agents directly.

**Correct Usage Pattern**:

1. **Main execution agent** decides journaling is needed:
   - After completing a phase
   - When making significant decisions
   - After solving implementation challenges
   - When gaining key insights

2. **Main agent prepares content**:
   - What happened and why
   - Decisions made and reasoning
   - Challenges encountered and solutions
   - Insights gained

3. **Main agent calls journaling subagent** with prepared content:
   ```
   Use Task tool to invoke journaling subagent with:
   - task_id, phase, activity
   - content, next_action
   - Optional: is_phase_transition, update_sections, adr_references
   ```

4. **Journaling subagent uses this skill** for guidance:
   - Loads HOW-TO instructions from this skill
   - Validates content quality per skill standards
   - Formats entries per skill format
   - Updates journal file per skill structure rules
   - Returns confirmation to main agent

5. **Main agent continues** with task execution

### Why This Architecture?

**Separation of Concerns**:
- **Main agent**: Task execution logic, decides WHEN and WHAT to journal
- **Journaling subagent**: Journaling orchestration, handles mechanics
- **This skill**: Detailed HOW-TO instructions for mechanics

**Benefits**:
- Main agent stays focused on task execution
- Journaling expertise centralized in subagent
- Consistent quality enforcement across all journaling
- Easier to evolve journaling capabilities

### For Main Execution Agents

❌ **Don't**: Use this skill directly
✅ **Do**: Call the journaling subagent with prepared content

### For Journaling Subagent

✅ **Do**: Use this skill as your instruction manual for:
- Entry format standards
- Quality validation criteria
- Phase-section mapping
- File structure requirements
- Error handling procedures

## Reference: Content Guidelines for Agents

When preparing content to provide to this skill, consider:

### Phase 1 (Task Analysis)
Include: Task understanding, ambiguities identified, concerns raised, dependencies verified

### Phase 2 (Solution Design)
Include: Design decisions made, alternatives considered and rejected, tradeoffs accepted, architectural choices

### Phase 3 (Test Creation)
Include: Testing approach chosen and rationale, scenarios covered, edge cases identified, coverage strategy

### Phase 4 (Implementation)
Include: Challenges encountered, solutions applied, code patterns used, deviations from design

### Phase 5 (Refactor)
Include: What was improved, why it needed improvement, how it's better, quality metrics

### Phase 6 (Verification)
Include: What was verified, acceptance criteria status, quality checks performed, issues found

### Phase 7 (Reflection)
Include: Key learnings, what worked well, improvements for next time, follow-up tasks

## Examples for Agent Reference

These examples show the **content** that agents should prepare when calling this skill.

### Example 1: Design Decision Content
```
Decided to use JWT-based authentication instead of session-based auth after reviewing the tech-stack.md recommendations and considering our microservices architecture.

**Considered alternatives:**
1. Session-based (cookies) - Rejected due to cross-domain complexity
2. OAuth2 only - Rejected as over-engineered for our current needs
3. JWT with refresh tokens - **Selected** for stateless scalability

**Decision:** Implementing JWT with 15-minute access tokens and 7-day refresh tokens. Created ADR-005 to document this choice and the security considerations around token storage.
```

### Example 2: Implementation Challenge Content
```
**Challenge**: Encountered circular dependency between users and organizations tables during schema migration.

**Solution**: Added deferred constraints using DEFERRABLE INITIALLY DEFERRED on foreign keys and adjusted migration order to create tables first, then add constraints in a second pass.

**Learning**: PostgreSQL deferred constraints allow us to insert related records in the same transaction without constraint violations. This pattern should be documented for future multi-table migrations.
```

### Example 3: Phase Transition Content
```
Created comprehensive test suite covering:
- User registration (happy path + validation errors)
- Login flow (success, invalid credentials, rate limiting)
- Token refresh (valid, expired, revoked tokens)
- Password reset flow (request, verify, complete)

All tests currently failing as expected (TDD). Test coverage focuses on behavior, not implementation details. Edge cases include concurrent registration attempts and token expiration boundary conditions.
```

## Error Handling

### Invalid Input
If provided content fails quality validation, return:
- Specific issues identified
- Examples of what's missing
- Guidance for improvement

### Missing Journal File
If journal file doesn't exist:
- Error: Journal not initialized for this task
- Suggest: Task should be started via task-start skill first

### Malformed Journal
If journal structure is incorrect:
- Attempt to fix common issues (missing sections)
- Report structural problems if unfixable

## References

- Journal guidelines: `execution/shared/journal-guidelines.md`
- Task type workflows: `execution/workflows/`
- Project guidelines: `CLAUDE.md`
