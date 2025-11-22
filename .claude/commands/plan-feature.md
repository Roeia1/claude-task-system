# plan-feature

**Description**: Create technical plan for a feature

## Purpose

This command generates a technical implementation plan for an existing feature definition. It describes HOW to build what was defined in feature.md, including architecture, technology choices, data models, API contracts, and testing strategy.

## Usage

```bash
# Run from within a feature directory
cd planning/features/001-user-authentication
/project:plan-feature

# Or from repo root (will detect current feature directory)
/project:plan-feature
```

## What It Does

1. **Detects feature directory** (current working directory or prompts)
2. **Reads feature.md** to understand requirements
3. **Generates technical plan** with AI assistance:
   - System architecture and components
   - Technology choices with rationale
   - Data models and schemas
   - API contracts (if applicable)
   - Implementation strategy (phases)
   - Testing strategy
   - Risk assessment
4. **Creates ADRs** for significant architectural decisions
5. **Human review and approval** before finalizing
6. **Saves plan.md** in feature directory

## Command Logic

### Prerequisites

1. **Feature directory must exist** with feature.md
2. **Feature.md must be complete** (no unresolved [NEEDS CLARIFICATION] markers)

### Process

1. **Detect current feature**
   - Check if current directory is under `planning/features/NNN-slug/`
   - If yes: Use that feature
   - If no: List available features and prompt user to select
   - If only one feature exists: Use it automatically

2. **Validate feature.md exists**
   ```bash
   if [[ ! -f "planning/features/NNN-slug/feature.md" ]]; then
     echo "Error: feature.md not found"
     echo "Run /project:define-feature first"
     exit 1
   fi
   ```

3. **Check for unresolved clarifications**
   - Search feature.md for `[NEEDS CLARIFICATION:`
   - If found: Error and suggest running `/project:clarify` (future command)
   - For now: Warn user and ask if they want to proceed anyway

4. **Read feature.md**
   - Parse user stories, requirements, acceptance criteria
   - Extract functional and non-functional requirements
   - Note dependencies and constraints

5. **Load plan template**
   - Read `planning/templates/plan-template.md`
   - Use as structure for generation

6. **AI-assisted technical planning**

   **Phase 1: High-level architecture**
   - Ask user about preferred architectural approach
   - Propose component breakdown
   - Suggest integration patterns
   - Create component diagram (ASCII art)

   **Phase 2: Technology selection**
   - Propose technology choices based on requirements
   - For each major choice, explain rationale
   - Check against existing tech stack (if any)
   - **Create ADRs for significant tech decisions**

   **Phase 3: Data modeling**
   - Design data models based on requirements
   - Define entities, fields, relationships
   - Consider data validation and constraints

   **Phase 4: API design** (if applicable)
   - Design API endpoints from user stories
   - Define request/response formats
   - Specify error handling
   - Authentication/authorization approach

   **Phase 5: Implementation strategy**
   - Break into phases (Foundation, Core, Integration, Polish)
   - Identify dependencies between phases
   - Suggest parallelization opportunities

   **Phase 6: Testing strategy**
   - Unit testing approach and coverage targets
   - Integration test scenarios
   - E2E test user flows
   - Performance testing considerations

   **Phase 7: Risk assessment**
   - Identify technical risks
   - Assess likelihood and impact
   - Propose mitigation strategies

7. **Interactive ADR creation**

   For each significant architectural decision:
   ```
   I've identified an architectural decision: [Decision Title]

   Options considered:
   1. [Option A] - [brief description]
   2. [Option B] - [brief description]

   I recommend: [Option X] because [reasoning]

   Create ADR for this decision? [y/n]
   ```

   If yes: Run `/project:adr "[decision title]"` inline

8. **Human review checkpoints**

   After each phase, show the generated content and ask:
   ```
   [Phase N generated content]

   Does this technical approach look correct? [y/n/revise]
   - y: Continue to next phase
   - n: Provide feedback and regenerate
   - revise: Make specific changes
   ```

9. **Finalize plan.md**

   - Compile all phases into complete plan
   - Add links to generated ADRs
   - Include references to feature.md
   - Format with proper markdown

10. **Save and report**
    ```
    ✅ Technical plan created: planning/features/001-user-authentication/plan.md
    📋 ADRs created: 2
       - planning/features/001-user-authentication/adr/001-jwt-authentication.md
       - planning/features/001-user-authentication/adr/002-password-hashing-algorithm.md

    Next steps:
    - Review plan.md and ADRs
    - Refine if needed
    - Run /project:generate-tasks to break down into tasks
    ```

## Template Structure

The generated plan.md follows this structure (from `planning/templates/plan-template.md`):

- **Executive Summary**: 2-3 sentence overview
- **Technical Approach**: Overall strategy and patterns
- **System Architecture**: Components, responsibilities, interactions
- **Technology Choices**: Language, framework, database, libraries (with rationale)
- **Data Models**: Entities, schemas, relationships
- **API Contracts**: Endpoints, request/response formats (if applicable)
- **Implementation Strategy**: Phased approach with dependencies
- **Testing Strategy**: Unit, integration, E2E approaches
- **Security Considerations**: Auth, authorization, data protection
- **Risk Assessment**: Risks, likelihood, impact, mitigation
- **Performance Considerations**: Load expectations, optimization strategies
- **Dependencies**: External services, infrastructure requirements
- **Deployment Plan**: How to deploy and roll back
- **Open Questions**: Items requiring decisions or research
- **Architecture Decisions**: Links to created ADRs

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

### Example: Database Selection

```markdown
## Technology Choices

### Database

**Options Considered**:
1. **PostgreSQL** - Relational database with ACID guarantees
   - Pros: Strong consistency, complex queries, mature
   - Cons: Vertical scaling limits

2. **MongoDB** - Document database
   - Pros: Flexible schema, horizontal scaling
   - Cons: Weaker consistency guarantees, less structured

3. **DynamoDB** - Managed NoSQL database
   - Pros: Serverless, automatic scaling, low ops
   - Cons: Vendor lock-in, query limitations

**Decision**: PostgreSQL

**Rationale**:
- Requirements need ACID transactions (user authentication)
- Data is relational (users, sessions, roles)
- Team has PostgreSQL experience
- JSON support (JSONB) provides schema flexibility where needed

**ADR**: [001-use-postgresql.md](./adr/001-use-postgresql.md)
```

## Implementation Strategy Guidelines

Break implementation into logical phases:

### Phase 1: Foundation (Setup)
- Project structure and configuration
- Database setup and migrations
- CI/CD pipeline
- Development environment setup

**Success Criteria**: Development environment runs, database connected, tests pass

### Phase 2: Core Features
- Implement primary user stories
- Core business logic
- Data models and repositories

**Success Criteria**: Core functionality works end-to-end

### Phase 3: Integration
- External service integrations
- API endpoint completion
- Frontend integration (if applicable)

**Success Criteria**: All integrations working, APIs documented

### Phase 4: Polish
- Error handling refinement
- Performance optimization
- Documentation
- Security hardening

**Success Criteria**: Production-ready quality

## Error Handling

### Feature Not Found

```
Error: No feature found.

Make sure you're in a feature directory or specify:
/project:plan-feature

Available features:
- planning/features/001-user-authentication/
- planning/features/002-payment-integration/

Which feature? [001/002]:
```

### feature.md Missing

```
Error: feature.md not found in planning/features/001-example/

Please run /project:define-feature first to create the feature definition.
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

### API Design

**Good** (complete specification):
```markdown
### POST /api/auth/login

**Purpose**: Authenticate user and return JWT token

**Authentication**: None required

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "expiresAt": "2025-12-01T10:00:00Z"
}
```

**Error Responses**:
- 400: Invalid email or password format
- 401: Invalid credentials
- 429: Too many login attempts
```

### Data Models

**Good** (detailed schema):
```markdown
### Entity: User

```typescript
interface User {
  id: string;              // UUID, primary key
  email: string;           // Unique, validated email
  passwordHash: string;    // bcrypt hash, never exposed in API
  name: string;            // Display name
  role: 'admin' | 'user';  // User role
  isVerified: boolean;     // Email verification status
  createdAt: Date;         // Account creation timestamp
  updatedAt: Date;         // Last modification timestamp
}
```

**Relationships**:
- Has many: Session (1-to-many)
- Has many: PasswordResetToken (1-to-many)
```

## Notes

- Technical plans should be reviewed with the team before task generation
- Plans are living documents - update as decisions change
- ADRs capture the "why" behind major technical decisions
- Keep plans focused on architecture, not implementation details
- Implementation details go in task files

---

**Next Command**: After planning, use `/project:generate-tasks` to break down into executable tasks.