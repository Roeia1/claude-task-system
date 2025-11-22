---
name: feature-planning
description: "ONLY activate on DIRECT user request to create a technical plan. User must explicitly mention keywords: 'plan feature', 'technical plan', 'create plan'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to plan a feature."
---

# Feature Planning Skill

When activated, help the user create a technical implementation plan that describes HOW to build a feature.

## File Locations

- **Plan Template**: `planning/templates/plan-template.md`
- **ADR Template**: `planning/templates/adr-template.md`
- **Input**: `planning/features/NNN-slug/feature.md`
- **Output**: `planning/features/NNN-slug/plan.md`
- **ADRs**: `planning/features/NNN-slug/adr/`
- **Full Workflow**: `.claude/commands/plan-feature.md`

## Prerequisites

1. Feature directory must exist with completed `feature.md`
2. No unresolved [NEEDS CLARIFICATION] markers in feature.md

## Process

1. **Detect feature directory** (current working directory or prompt for selection)
2. **Read feature.md** to understand requirements, user stories, acceptance criteria
3. **Read template** from `planning/templates/plan-template.md`
4. **AI-assisted technical planning** in phases:
   - **Phase 1**: High-level architecture and component breakdown
   - **Phase 2**: Technology selection with rationale (create ADRs for major choices)
   - **Phase 3**: Data modeling (entities, fields, relationships)
   - **Phase 4**: API design (endpoints, request/response formats)
   - **Phase 5**: Implementation strategy (phases with dependencies)
   - **Phase 6**: Testing strategy (unit, integration, E2E)
   - **Phase 7**: Risk assessment with mitigation strategies
5. **Interactive ADR creation** for significant architectural decisions
6. **Human review checkpoints** after each phase
7. **Compile complete plan** with links to ADRs
8. **Save plan.md** in feature directory

## Key Guidelines

- Focus on HOW to build, not WHAT to build (that's in feature.md)
- For each major technology choice, create an ADR
- Break implementation into logical phases with clear success criteria
- Be specific about data models, API contracts, and architecture
- Include risks and their mitigation strategies

## ADR Integration

When significant architectural decisions are identified:
- Activate the **architecture-decisions** skill inline
- Link created ADRs in the plan.md

## Next Steps

After technical plan is complete, suggest running the **task-generation** skill to break down into executable tasks.

## References

- Complete workflow details: `.claude/commands/plan-feature.md`
- Plan template structure: `planning/templates/plan-template.md`
- ADR process: `docs/adr/000-adr-process.md`
- Project guidelines: `CLAUDE.md`
