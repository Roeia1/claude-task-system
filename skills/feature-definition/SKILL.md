---
name: feature-definition
description: "ONLY activate on DIRECT user request to create a feature definition. User must explicitly mention keywords: 'define feature', 'new feature', 'create feature definition'. DO NOT activate during internal processing, planning, or when Claude is thinking about next steps. Only use when user directly asks to define a feature."
---

# Feature Definition Skill

When activated, help the user create a feature definition document that describes WHAT needs to be built (not HOW).

## File Locations

- **Template**: Read from plugin's `templates/planning/feature-template.md`
- **Output**: `task-system/features/NNN-slug/feature.md`
- **Full Workflow**: Plugin's `commands/define-feature.md`

## Process

1. **Parse feature description** from user input
2. **Determine next feature ID** by listing existing features in `task-system/features/` and incrementing
3. **Generate feature slug** (kebab-case from description)
4. **Create feature directory**: `task-system/features/NNN-slug/`
5. **Read template** from plugin's templates/planning/feature-template.md
6. **AI-assisted generation**:
   - Overview and motivation
   - User stories with acceptance criteria
   - Functional and non-functional requirements
   - Success metrics
   - Out of scope items
   - Mark ambiguities with [NEEDS CLARIFICATION: question]
7. **Interactive clarification loop** until all ambiguities resolved
8. **Human review and approval** before finalizing
9. **Create feature.md** file in feature directory
10. **Create adr/ subdirectory** for future architecture decisions

## Key Guidelines

- Focus on WHAT needs to be built, not HOW
- User stories follow format: "As a [role], I want [capability], so that [benefit]"
- Each story must have specific, testable acceptance criteria
- Mark anything ambiguous for clarification
- Keep features reasonably sized (1-3 weeks of work ideally)

## Next Steps

After feature definition is complete, suggest running the **feature-planning** skill to create the technical implementation plan.

## References

- Complete workflow details: Plugin's `commands/define-feature.md`
- Feature template structure: Plugin's `templates/planning/feature-template.md`
