# ADR 000: Architecture Decision Records Process

**Status**: Accepted
**Date**: 2025-11-22
**Deciders**: Project Team
**Context**: Project-wide

## Problem Statement

Software projects make hundreds of architectural decisions over their lifetime. Without documentation, the reasoning behind these decisions is lost, leading to:

- Repeated debates about settled issues
- Difficulty onboarding new team members
- Fear of changing "mysterious" code
- Loss of context when original decision-makers leave
- Inability to learn from past decisions

We need a lightweight, sustainable process for capturing architectural decisions and their rationale.

## Decision

We will use **Architecture Decision Records (ADRs)** to document all significant architectural decisions.

### What is an ADR?

An ADR is a short text document that captures a single architectural decision along with its context and consequences. Each ADR describes:

- The **problem** that needs solving
- The **options** considered
- The **decision** made
- The **consequences** (both positive and negative)

### When to Create an ADR

Create an ADR when making decisions about:

**Technology Choices**:
- Choosing a database (PostgreSQL vs MongoDB vs DynamoDB)
- Selecting a framework (React vs Vue vs Angular)
- Picking a cloud provider (AWS vs GCP vs Azure)
- Adopting a new library or tool

**Architecture & Design**:
- System architecture patterns (microservices vs monolith)
- API design (REST vs GraphQL vs gRPC)
- Data flow and storage strategies
- Authentication and authorization approaches
- Deployment and infrastructure decisions

**Standards & Practices**:
- Code organization and structure
- Testing strategies
- CI/CD pipeline design
- Monitoring and observability approach

**When NOT to create an ADR**:
- Trivial decisions with no long-term impact
- Decisions easily reversed without cost
- Implementation details that don't affect architecture
- Temporary workarounds or experiments

**Rule of Thumb**: If you're having a discussion about "should we do X or Y?" and the decision will affect the project for more than a few weeks, create an ADR.

## ADR Structure

Each ADR should follow this template (available in `templates/adr-template.md`):

```markdown
# ADR NNN: [Title]

**Status**: Proposed | Accepted | Deprecated | Superseded
**Date**: YYYY-MM-DD
**Deciders**: [Names/roles]
**Context**: [Project-wide | Feature-specific]

## Problem Statement
[What decision needs to be made and why?]

## Considered Options
1. Option A - [pros/cons]
2. Option B - [pros/cons]
3. Option C - [pros/cons]

## Decision
[Chosen option and reasoning]

## Consequences
- Positive: [benefits]
- Negative: [tradeoffs]
- Neutral: [implications]
```

## ADR Lifecycle

### 1. Proposal Stage

When facing an architectural decision:

1. **Create draft ADR** with status "Proposed"
2. **Document options** with honest pros/cons
3. **Share with team** for feedback
4. **Discuss and refine** based on input

**Command**: `/project:adr "decision context"`

### 2. Review & Decision

1. **Team discussion** (meeting, PR comments, etc.)
2. **Evaluate trade-offs** against project goals
3. **Make decision** by consensus or authority
4. **Update ADR** with chosen option

### 3. Acceptance

1. **Change status** to "Accepted"
2. **Merge PR** containing the ADR
3. **Implement** the decision

### 4. Evolution

Over time, decisions may need to change:

**Deprecation**:
- Mark status as "Deprecated"
- Add explanation of why it's deprecated
- Link to replacement ADR if applicable

**Superseding**:
- Create new ADR with updated decision
- Update old ADR status to "Superseded by ADR-XXX"
- Explain what changed and why

## ADR Organization

### Location

**Global ADRs** (project-wide decisions):
```
docs/adr/
  000-adr-process.md       # This document
  001-database-choice.md
  002-api-framework.md
  003-auth-strategy.md
```

**Feature ADRs** (feature-specific decisions):
```
features/001-user-auth/adr/
  001-jwt-vs-sessions.md
  002-password-hashing.md

features/002-payment/adr/
  001-stripe-integration.md
```

### Numbering

- **Global ADRs**: Sequential starting from 001
- **Feature ADRs**: Sequential within each feature, starting from 001

The `/project:adr` command automatically determines the correct location and number based on your current directory.

### Naming

Format: `NNN-short-title.md`

Examples:
- `001-use-postgresql.md`
- `002-adopt-typescript.md`
- `003-api-versioning-strategy.md`

## Best Practices

### Writing ADRs

**DO**:
- ✅ Be concise (1-2 pages max)
- ✅ Be honest about trade-offs
- ✅ Document ALL serious options considered
- ✅ Explain the "why" not just the "what"
- ✅ Use data and evidence when available
- ✅ Consider future you who won't remember context

**DON'T**:
- ❌ Make it a novel (keep it brief)
- ❌ Only list pros of chosen option
- ❌ Skip documenting rejected options
- ❌ Use jargon without explanation
- ❌ Make it a technical specification
- ❌ Be afraid to say "we don't know"

### Timing

- **Before coding**: ADRs should be written before or during early implementation
- **After discussion**: Write after you've explored options, not before
- **Not retroactive**: Don't document old decisions unless actively revisiting them

### Review

- ADRs should be reviewed by the team
- Use PR process for feedback
- Aim for consensus, but decisions need to be made
- Document disagreements in the ADR

## Consequences

### Positive

- ✅ **Institutional memory**: Context preserved when people leave
- ✅ **Onboarding**: New team members understand "why" not just "what"
- ✅ **Avoid rehashing**: Settled decisions stay settled
- ✅ **Learning**: Track what worked and what didn't
- ✅ **Confidence**: Change code knowing the original reasoning
- ✅ **Better decisions**: Writing forces clear thinking

### Negative

- ⚠️ **Time investment**: Takes time to write ADRs
- ⚠️ **Discipline required**: Easy to skip when busy
- ⚠️ **Maintenance**: Need to update when decisions change

### Neutral

- ℹ️ **Not documentation**: ADRs complement but don't replace technical docs
- ℹ️ **Immutable record**: ADRs aren't edited, they're superseded
- ℹ️ **Team practice**: Effectiveness depends on team adoption

## Implementation

### Getting Started

1. **Read this document** - Understand the process
2. **Review template** - Check `templates/adr-template.md`
3. **Try the command** - Run `/project:adr "your first decision"`
4. **Get feedback** - Share with team for review
5. **Iterate** - Improve based on team input

### Tools

- **Creation**: `/project:adr "decision context"`
- **Template**: `templates/adr-template.md`
- **Storage**: `docs/adr/` (global) or `features/NNN-name/adr/` (feature-specific)

### Workflow Integration

ADRs integrate with our development workflow:

1. **During feature planning** (`/project:plan-feature`):
   - Identify architectural decisions needed
   - Create ADRs for significant choices
   - Reference ADRs in plan.md

2. **During task execution** (`/project:start-task`):
   - Phase 2 (Solution Design): Create ADRs for design decisions
   - Phase 4 (Implementation): Create ADRs if new decisions arise
   - Link ADRs in journal.md

3. **During code review**:
   - Verify ADRs created for architectural changes
   - Check ADRs are referenced in PR description

## References

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Template: `templates/adr-template.md`](../../templates/adr-template.md)
- [Command: `/project:adr`](../../.claude/commands/adr.md)

## Review

This ADR should be reviewed:
- When the team grows significantly
- When the ADR process feels too heavy or too light
- Annually as part of process improvement

---

**Note**: This is ADR 000 because it defines the ADR process itself. Future ADRs start at 001.