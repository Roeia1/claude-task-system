---
name: architecture-decisions
description: "ONLY activate on DIRECT user request to create an ADR. User must explicitly mention keywords: 'create ADR', 'document decision', 'architecture decision'. DO NOT activate during internal processing, discussions, or when suggesting next steps. Only use when user directly asks to create or document an architectural decision."
---

# Architecture Decisions Skill

When activated, create an ADR to document architectural decisions with context, options, and consequences.

## File Locations

- **Template**: Read from plugin's `templates/planning/adr-template.md`
- **Global ADRs**: `task-system/adrs/`
- **Feature ADRs**: `task-system/features/NNN-slug/adr/`
- **Full Workflow**: Plugin's `commands/adr.md`

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

## Process

### 1. Context Detection

1. **Detect current directory**
2. **Determine scope**:
   - In `task-system/features/NNN-slug/` -> Feature-specific ADR
   - Otherwise -> Project-wide ADR
3. **Set ADR directory** accordingly

### 2. Parse Decision Context

1. **Get decision description** from user input
2. **Generate slug** (kebab-case from description)
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

1. **Read template** from plugin's `templates/planning/adr-template.md`
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

- **Proposed**: Initial creation, under review
- **Accepted**: Team agrees, ready to implement
- **Deprecated**: No longer applicable
- **Superseded**: Replaced by newer ADR

## Integration Points

ADRs are created during:
1. **Feature planning** (`feature-planning` skill)
2. **Task execution** (Phase 2: Solution Design)
3. **Ad-hoc** (any time an architectural decision needs documentation)

## Best Practices

- Be objective and balanced in option analysis
- Document the "why" behind decisions
- Keep ADRs concise (1-2 pages max)
- Link ADRs from related code, docs, and plans
- ADRs are immutable - don't edit decisions, supersede them

## Next Steps

After ADR creation:
- Reference ADR in plan.md or task journal
- Update status to "Accepted" when team approves
- Link from relevant documentation

## References

- Complete workflow details: Plugin's `commands/adr.md`
- ADR template: Plugin's `templates/planning/adr-template.md`
