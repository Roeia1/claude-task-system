---
name: architecture-decisions
description: "ONLY activate on DIRECT user request to create an ADR. User must explicitly mention keywords: 'create ADR', 'document decision', 'architecture decision', 'record this decision'. DO NOT activate during internal processing, task execution phases, or when Claude is suggesting next steps. Only use when user directly asks to create or document an architectural decision."
---

# Architecture Decisions Skill

Create ADRs to document significant architectural decisions along with their context, options considered, and consequences. ADRs provide institutional memory about why certain technical choices were made.

## File Locations

- **Template**: `templates/adr-template.md`
- **Global ADRs**: `task-system/adrs/`
- **Feature ADRs**: `task-system/features/NNN-slug/adr/`

## Context-Aware ADR Creation

ADRs can be created in two scopes:

### Project-Wide ADRs
- **When**: User is in repo root or not in a feature directory
- **Location**: `task-system/adrs/NNN-decision-title.md`
- **Context**: Project-wide architectural decisions
- **Examples**: Database choice, deployment strategy, overall architecture patterns

### Feature-Specific ADRs
- **When**: User is in a feature directory (`task-system/features/NNN-slug/`)
- **Location**: `task-system/features/NNN-slug/adr/NNN-decision-title.md`
- **Context**: Feature: NNN-slug
- **Examples**: Feature-specific tech choices, component design decisions

### Context Detection Examples

**Example 1: Project-wide ADR**
```
User is in repo root
User: "create ADR for using PostgreSQL as primary database"

Creates: task-system/adrs/001-use-postgresql-as-primary-database.md
Context: Project-wide
```

**Example 2: Feature-specific ADR**
```
User is in: task-system/features/001-user-auth/
User: "document decision for JWT vs session-based authentication"

Creates: task-system/features/001-user-auth/adr/001-jwt-vs-session-authentication.md
Context: Feature: 001-user-auth
```

## Process

### 1. Context Detection

1. **Detect current directory**
2. **Determine scope**:
   - In `task-system/features/NNN-slug/` -> Feature-specific ADR
   - Otherwise -> Project-wide ADR
3. **Set ADR directory** accordingly

### 2. Parse Decision Context

1. **Get decision description** from user input
2. **Generate slug** (kebab-case from description, ~50 chars max)
3. **Determine next ADR number** in scope:
   - List existing ADRs in target directory
   - Extract highest number
   - Increment by 1
   - Format as zero-padded 3-digit (001, 002, etc.)

### 3. AI-Assisted ADR Generation

**Step 1: Clarify the Problem**
- Interpret decision from user input
- Identify context and constraints
- Define goals to achieve
- Confirm understanding with user

**Step 2: Identify Options**
- Research possible options
- List 2-4 main alternatives
- Describe use cases and characteristics
- Ask if other options should be considered

**Step 3: Analyze Pros and Cons**
- For each option, provide:
  - Pros (benefits and advantages)
  - Cons (drawbacks and limitations)
  - Implementation complexity
  - Cost implications
- Be honest and balanced

**Step 4: Recommend a Decision**
- Choose best option with clear reasoning
- Explain why based on:
  - Requirements and constraints
  - Team/project context
  - Evidence and data
- Discuss with user if needed

**Step 5: Document Consequences**
- **Positive**: Benefits gained, problems solved
- **Negative**: Trade-offs accepted, mitigation strategies
- **Neutral**: Implications to be aware of

### 4. Compile Complete ADR

1. **Read template** from `templates/adr-template.md`
2. **Fill in all sections**:
   - Title: ADR NNN: [decision title]
   - Status: Proposed (user can change to Accepted later)
   - Date: Current date
   - Deciders: Prompt user for names/roles
   - Context: Feature-specific or Project-wide
   - Tags: Relevant categories
   - Problem Statement
   - Considered Options (with pros/cons)
   - Decision (chosen option and rationale)
   - Consequences (positive, negative, neutral)
   - Implementation Notes
   - Related Decisions
   - References

### 5. Human Review and Approval

1. **Display complete ADR** for review
2. **Options**:
   - Accept and create file
   - Edit content
   - Regenerate with different approach
3. **Iterate until approved**

### 6. Create ADR File

1. **Create ADR directory** if needed (`mkdir -p`)
2. **Write ADR file**: `ADR_DIR/NNN-slug.md`
3. **Report completion** with context and next steps

## ADR Lifecycle

### Status Values

- **Proposed**: Initial creation, under review
- **Accepted**: Team agrees, ready to implement
- **Deprecated**: No longer applicable
- **Superseded**: Replaced by newer ADR

### Initial Creation (Status: Proposed)

1. Create ADR with status "Proposed"
2. Share with team for review
3. Gather feedback and refine
4. Update ADR based on discussion

### Acceptance (Status: Accepted)

1. Team agrees on decision
2. Update status to "Accepted" in ADR file
3. Implement the decision
4. Reference ADR in relevant code/docs

### Evolution Patterns

**Deprecation** - when decision no longer applies:
```markdown
**Status**: Deprecated
**Date**: 2025-12-01
**Reason**: No longer applicable due to [reason]
**Replacement**: See ADR-005 for new approach
```

**Superseding** - when replacing with new decision:
```markdown
# ADR 001: Use PostgreSQL

**Status**: Superseded by ADR-008
**Date**: 2025-06-15
**Superseded**: 2025-12-01
```

## Integration Points

ADRs are created during:

1. **Feature planning** (`feature-planning` skill)
   - Create ADRs for significant technical choices
   - Reference in plan.md

2. **Task execution** (Phase 2: Solution Design, Phase 4: Implementation)
   - Create ADRs for design decisions
   - Create ADRs if new decisions arise during implementation

3. **Ad-hoc**
   - Any time an architectural decision needs documentation
   - When debating between approaches
   - Before making significant changes

## Best Practices

- ADRs are immutable records - don't edit decisions, supersede them
- It's okay to document decisions retroactively if they're still relevant
- Not every decision needs an ADR - use judgment for significant choices
- ADRs should be reviewed by team members
- Keep ADRs concise (1-2 pages max)
- Link to ADRs from related code, docs, and plans
- Be objective and balanced in option analysis
- Document the "why" behind decisions

## Completion Report

**For project-wide ADR**:
```
ADR created: task-system/adrs/001-use-postgresql.md

Context: Project-wide
Status: Proposed

Next steps:
1. Review and refine the ADR if needed
2. Share with team for feedback
3. Update status to "Accepted" when decided
4. Reference this ADR in relevant planning docs
```

**For feature-specific ADR**:
```
ADR created: task-system/features/001-user-auth/adr/001-jwt-authentication.md

Context: Feature: 001-user-auth
Status: Proposed

Next steps:
1. Review and refine the ADR if needed
2. Reference in plan.md: [001-jwt-authentication.md](./adr/001-jwt-authentication.md)
3. Update status to "Accepted" when decided
```

## References

- ADR template: `templates/adr-template.md`
