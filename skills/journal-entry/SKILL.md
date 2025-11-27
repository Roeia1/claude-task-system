---
name: journal-entry
description: "Utility skill for the journaling subagent. Provides detailed instructions for journal entry mechanics including formatting, validation, and file operations. Called proactively by the journaling subagent (plugin's agents/journaling.md) during task execution. NOT user-facing."
---

# Journal Entry Skill

**SINGLE SOURCE OF TRUTH**: This skill is the authoritative source for journal entry format standards and quality validation criteria. All journaling must conform to the specifications in this file.

A utility skill that handles the mechanics of creating and inserting properly formatted journal entries. This skill is called by the journaling subagent (plugin's `agents/journaling.md`) with prepared content from main execution agents.

## Purpose

This skill focuses on **HOW to journal** (format, quality, mechanics). It is used by the journaling subagent, NOT directly by main execution agents.

**For WHEN to journal and WHAT to include**, see: `journal-guidelines.md` in this skill folder.

This skill is responsible for:
- Defining entry format standards (single source of truth)
- Defining quality validation criteria (single source of truth)
- Providing mechanics instructions to journaling subagent
- Specifying file structure requirements

## File Locations

- **Journal**: `task-system/tasks/NNN/journal.md`
- **Journal Guidelines**: This skill folder's `journal-guidelines.md`
- **Task Type Workflows**: Plugin's `workflows/{type}-workflow.md`

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

## Journal Creation

If the journal file doesn't exist at `task-system/tasks/{task_id}/journal.md`, it must be created before adding the first entry.

**For complete creation instructions**, see: `journal-creation.md` in this skill folder.

## Process

### Step 1: Load Context

1. **Check if journal exists** at `task-system/tasks/{task_id}/journal.md`:
   - If NO: Follow Journal Creation process above
   - If YES: Continue to read and validate

2. **Read journal** (if it exists):
   - Identify current phase from "Current Phase" header
   - Locate "Progress Log" section for insertion point

3. **Validate journal structure**:
   - Ensure required sections exist
   - Verify journal follows proper structure

### Step 2: Validate Input Quality

Before composing the entry, validate the provided content:

- **Meaningful content**: Not vague statements like "did some stuff" or "made progress"
- **Includes reasoning**: For decisions, explains WHY not just WHAT
- **Concrete next action**: Specific action, not "do more work"
- **Proper context**: Explains what was happening
- **Complete information**: Has all necessary details

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

2. **Insert entry in Progress Log**:
   - Locate "## Progress Log" section
   - Add new entry at the end (most recent last)
   - Maintain proper spacing (blank line before each entry)

3. **Write updated journal** back to file

### Step 5: Return Confirmation

Return summary of actions taken:
- Entry added with timestamp
- Phase header updated (if applicable)
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

- **Vague content**: "Did some stuff. Made progress."
- **Missing reasoning**: "Decided to use JWT" (no explanation why)
- **No context**: "Fixed it." (what was the problem?)
- **Generic next action**: "Do more work" (not specific)
- **Missing details**: Insufficient information to understand decision

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

- Journal guidelines: `journal-guidelines.md` (in this skill folder)
- Task type workflows: Plugin's `workflows/`
