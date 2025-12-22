---
name: feature-planning
description: "ONLY activate on DIRECT user request to create a technical plan. User must explicitly mention keywords: 'plan feature', 'technical plan', 'create plan'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to plan a feature."
---

# Feature Planning Skill

When activated, help the user create a technical implementation plan that describes HOW to build a feature.

## File Locations

- **Plan Template**: `templates/plan-template.md`
- **ADR Template**: `../architecture-decisions/templates/adr-template.md`
- **Input**: `task-system/features/NNN-slug/feature.md`
- **Output**: `task-system/features/NNN-slug/plan.md`
- **ADRs**: `task-system/features/NNN-slug/adr/`

## Prerequisites

1. **Feature directory must exist** with `feature.md`
2. **feature.md must be complete** (no unresolved [NEEDS CLARIFICATION] markers)

## Process

1. **Detect current feature**

   - Check if current directory is under `task-system/features/NNN-slug/`
   - If yes: Use that feature
   - If no: List available features and prompt user to select
   - If only one feature exists: Use it automatically

2. **Validate feature.md exists**

   ```bash
   if [[ ! -f "task-system/features/NNN-slug/feature.md" ]]; then
     echo "Error: feature.md not found"
     echo "Say 'define feature [name]' first"
     exit 1
   fi
   ```

3. **Check for unresolved clarifications**

   - Search feature.md for `[NEEDS CLARIFICATION:`
   - If found: Warn user and ask if they want to proceed anyway

4. **Read feature.md**

   - Parse user stories, requirements, acceptance criteria
   - Extract functional and non-functional requirements
   - Note dependencies and constraints

5. **Load plan template**

   - Read plan template from `templates/plan-template.md`
   - Use as structure for generation

6. **AI-assisted technical planning** (7 phases with human review)

7. **Interactive ADR creation** for significant decisions

8. **Finalize and save plan.md** in feature directory

## 7-Phase Technical Planning

### Phase 1: High-level Architecture

- Ask user about preferred architectural approach
- Propose component breakdown with:
  - Purpose
  - Responsibilities
  - Interfaces
- Suggest integration patterns
- Create component diagram (ASCII art)

### Phase 2: Technology Selection

- Propose technology choices based on requirements
- For each major choice, explain rationale
- Check against existing tech stack (if any)
- **Create ADRs for significant tech decisions**

### Phase 3: Data Modeling

- Design data models based on requirements
- Define entities, fields, relationships
- Consider data validation and constraints

### Phase 4: API Design (if applicable)

- Design API endpoints from user stories
- Define request/response formats
- Specify error handling
- Authentication/authorization approach

### Phase 5: Implementation Strategy

- Break into phases (Foundation, Core, Integration, Polish)
- Identify dependencies between phases
- Suggest parallelization opportunities

### Phase 6: Testing Strategy

- Unit testing approach and coverage targets
- Integration test scenarios
- E2E test user flows
- Performance testing considerations

### Phase 7: Risk Assessment

- Identify technical risks
- Assess likelihood and impact
- Propose mitigation strategies

## Interactive ADR Creation

For each significant architectural decision:

```
I've identified an architectural decision: [Decision Title]

Options considered:
1. [Option A] - [brief description]
2. [Option B] - [brief description]

I recommend: [Option X] because [reasoning]

Create ADR for this decision? [y/n]
```

If yes: Activate the **architecture-decisions** skill inline

## Human Review Checkpoints

After each phase, show the generated content and ask:

```
[Phase N generated content]

Does this technical approach look correct? [y/n/revise]
- y: Continue to next phase
- n: Provide feedback and regenerate
- revise: Make specific changes
```

## Technology Decision Guidelines

### When to Create an ADR

Create an ADR for decisions about:

- **Database choice**: PostgreSQL vs MongoDB vs DynamoDB
- **Framework selection**: Express vs NestJS vs Fastify
- **Authentication method**: JWT vs session-based vs OAuth
- **API style**: REST vs GraphQL vs gRPC
- **Deployment approach**: Serverless vs containers vs VMs
- **Major library choices**: ORM selection, validation library, etc.

### Technology Selection Process

For each significant technology choice:

1. **List options** (2-3 realistic alternatives)
2. **Evaluate pros/cons** of each
3. **Consider**:
   - Team familiarity
   - Community support
   - Performance characteristics
   - Long-term maintainability
   - License and cost
4. **Make recommendation** with clear reasoning
5. **Create ADR** to document the decision

## Error Handling

### Feature Not Found

```
Error: No feature found.

Make sure you're in a feature directory or specify:
Say "plan feature" in the repo root

Available features:
- task-system/features/001-user-authentication/
- task-system/features/002-payment-integration/

Which feature? [001/002]:
```

### feature.md Missing

```
Error: feature.md not found in task-system/features/001-example/

Please say "define feature [name]" first to create the feature definition.
```

### Unresolved Clarifications

```
Warning: feature.md contains unresolved clarifications:
- [NEEDS CLARIFICATION: Password reset link expiration time?]
- [NEEDS CLARIFICATION: Support for OAuth providers?]

These should be resolved before creating a technical plan.

Do you want to:
1. Continue anyway (not recommended)
2. Resolve clarifications first (recommended)

Your choice: [1/2]
```

### plan.md Already Exists

```
Warning: plan.md already exists in this feature directory.

Do you want to:
1. Overwrite existing plan
2. Create plan-v2.md
3. Cancel

Your choice: [1/2/3]
```

## Best Practices

### Architecture Design

**Good** (clear components):

```markdown
## System Architecture

### Components

1. **Authentication Service**

   - Purpose: Handle user authentication and session management
   - Responsibilities: Login, logout, token validation
   - Interfaces: REST API, JWT tokens

2. **User Repository**

   - Purpose: Data access layer for user entities
   - Responsibilities: CRUD operations, user queries
   - Interfaces: TypeScript interface, PostgreSQL

3. **Email Service**
   - Purpose: Send transactional emails
   - Responsibilities: Password resets, verification emails
   - Interfaces: Queue-based, SendGrid API
```

**Bad** (vague):

```markdown
## System Architecture

We'll have some services that handle users and authentication.
```

## Key Guidelines

- Focus on HOW to build, not WHAT to build (that's in feature.md)
- For each major technology choice, create an ADR
- Break implementation into logical phases with clear success criteria
- Be specific about data models, API contracts, and architecture
- Include risks and their mitigation strategies

## Notes

- Technical plans should be reviewed with the team before task generation
- Plans are living documents - update as decisions change
- ADRs capture the "why" behind major technical decisions
- Keep plans focused on architecture, not implementation details
- Implementation details go in task files

## Next Steps

After technical plan is complete, suggest running the **task-generation** skill to break down into executable tasks.

## References

- Plan template structure: `templates/plan-template.md`
- ADR template: `../architecture-decisions/templates/adr-template.md`
