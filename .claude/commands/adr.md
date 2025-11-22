# adr

**Description**: Create an Architecture Decision Record (ADR)

## Purpose

This command helps document significant architectural decisions along with their context, options considered, and consequences. ADRs provide institutional memory about why certain technical choices were made.

## Usage

```bash
# Context-aware - detects if you're in a feature directory or project root
/project:adr "choice of JWT vs session-based authentication"
/project:adr "use PostgreSQL instead of MongoDB"
/project:adr "adopt microservices architecture"
```

## What It Does

1. **Detects context** (feature-specific vs. project-wide)
2. **Determines next ADR number** (auto-increments within scope)
3. **Loads ADR template** with standard structure
4. **AI-assisted generation**:
   - Problem statement formulation
   - Options analysis with pros/cons
   - Decision recommendation
   - Consequences assessment
5. **Human review and approval**
6. **Creates ADR file** in appropriate location
7. **Reports completion** with ADR details

## Command Logic

### Arguments

- **Required**: Decision context or title
- The argument should briefly describe what decision needs to be made

### Process

1. **Parse decision context from arguments**
   ```
   Decision context: $ARGUMENTS
   ```

2. **Detect ADR scope**

   **Feature-specific ADR** (if in feature directory):
   ```bash
   # Check if current working directory is under planning/features/
   if [[ "$PWD" == */planning/features/[0-9][0-9][0-9]-* ]]; then
     ADR_DIR=$(pwd)/adr
     SCOPE="Feature: $(basename $(pwd))"
   ```

   **Project-wide ADR** (if in repo root or elsewhere):
   ```bash
   else
     ADR_DIR=/home/roei/projects/claude-task-system/docs/adr
     SCOPE="Project-wide"
   fi
   ```

3. **Determine next ADR number**

   - List existing ADRs in target directory
   - Extract highest number (e.g., 003 from "003-api-design.md")
   - Increment by 1
   - Format as zero-padded 3-digit number
   - Note: Global ADRs start at 001 (000 is the process doc)
   - Feature ADRs start at 001 within each feature

4. **Generate slug from decision context**

   - Convert to kebab-case
   - Remove special characters
   - Limit to reasonable length (~50 chars)
   - Example: "Use PostgreSQL instead of MongoDB" → "use-postgresql-instead-of-mongodb"

5. **Load ADR template**

   - Read `planning/templates/adr-template.md`
   - Use as structure for generation

6. **AI-assisted ADR generation**

   **Step 1: Clarify the problem**
   ```
   Let me understand the architectural decision:

   Based on "$ARGUMENTS", I interpret this as:

   Problem: [AI's interpretation]
   Context: [Relevant constraints and requirements]
   Goals: [What we're trying to achieve]

   Is this correct? [y/n/clarify]
   ```

   **Step 2: Identify options**

   ```
   I'll research possible options for this decision.

   Based on the problem, here are the main options:

   1. **[Option A]**: [Brief description]
      - Common use cases: [when to use]
      - Key characteristics: [what makes it unique]

   2. **[Option B]**: [Brief description]
      - Common use cases: [when to use]
      - Key characteristics: [what makes it unique]

   3. **[Option C]**: [Brief description]
      - Common use cases: [when to use]
      - Key characteristics: [what makes it unique]

   Are there other options I should consider? [y/n]
   ```

   **Step 3: Analyze pros and cons**

   For each option, analyze:
   - **Pros**: Benefits and advantages
   - **Cons**: Drawbacks and limitations
   - **Implementation complexity**: Low/Medium/High
   - **Cost implications**: If applicable

   Be honest and balanced - don't cherry-pick only pros for the recommended option

   **Step 4: Recommend a decision**

   ```
   ## Recommendation

   I recommend **[Option X]** for the following reasons:

   1. [Primary reason with evidence]
   2. [Secondary reason with evidence]
   3. [Additional considerations]

   This recommendation is based on:
   - [Requirement/constraint 1]
   - [Requirement/constraint 2]
   - [Team/project context]

   Do you agree with this recommendation? [y/n/discuss]
   ```

   If user wants to discuss:
   - Answer questions
   - Provide more analysis
   - Consider alternative options
   - Refine recommendation

   **Step 5: Document consequences**

   For the chosen option, document:

   **Positive consequences**:
   - What benefits we gain
   - What problems this solves
   - What becomes easier

   **Negative consequences**:
   - What trade-offs we're accepting
   - What becomes harder
   - What we're giving up
   - Mitigation strategies for negatives

   **Neutral consequences**:
   - Changes that are neither good nor bad
   - Implications to be aware of

7. **Compile complete ADR**

   Fill in the template with:
   - **Title**: ADR [NNN]: [decision title]
   - **Status**: "Proposed" (user can change to "Accepted" later)
   - **Date**: Current date
   - **Deciders**: Prompt user for names/roles
   - **Context**: Feature-specific or Project-wide
   - **Tags**: Relevant categories (architecture, database, api, etc.)
   - **Problem Statement**: From analysis
   - **Considered Options**: All options with pros/cons
   - **Decision**: Chosen option and rationale
   - **Consequences**: Positive, negative, neutral
   - **Implementation Notes**: If applicable
   - **Related Decisions**: Links to related ADRs
   - **References**: Links to docs, articles, discussions

8. **Human review**

   ```markdown
   # ADR 001: Use PostgreSQL for Primary Database

   **Status**: Proposed
   **Date**: 2025-11-22
   **Context**: Project-wide
   **Tags**: database, architecture

   ## Problem Statement
   [Generated content]

   ## Considered Options
   [Generated content]

   ## Decision
   [Generated content]

   ## Consequences
   [Generated content]

   ---

   Review this ADR:
   [y] Looks good, create ADR file
   [e] Edit content
   [n] Regenerate with different approach

   Your choice: [y/e/n]
   ```

9. **Create ADR directory if needed**

   ```bash
   mkdir -p "$ADR_DIR"
   ```

10. **Save ADR file**

    ```bash
    ADR_FILE="$ADR_DIR/$ADR_NUMBER-$SLUG.md"
    # Write content to file
    ```

11. **Report completion**

    **For project-wide ADR**:
    ```
    ✅ ADR created: docs/adr/001-use-postgresql.md

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
    ✅ ADR created: planning/features/001-user-auth/adr/001-jwt-authentication.md

    Context: Feature: 001-user-auth
    Status: Proposed

    Next steps:
    1. Review and refine the ADR if needed
    2. Reference in plan.md: [001-jwt-authentication.md](./adr/001-jwt-authentication.md)
    3. Update status to "Accepted" when decided
    ```

## ADR Template Structure

Standard ADR format (from `planning/templates/adr-template.md`):

```markdown
# ADR NNN: [Title]

**Status**: Proposed | Accepted | Deprecated | Superseded
**Date**: YYYY-MM-DD
**Deciders**: [Names/roles]
**Context**: [Project-wide | Feature: name]
**Tags**: [categories]

## Problem Statement
- What decision needs to be made
- Why it needs to be made
- Current situation and constraints

## Considered Options
1. Option A with pros/cons
2. Option B with pros/cons
3. Option C with pros/cons

## Decision
- Chosen option
- Detailed rationale
- Decision drivers

## Consequences
- Positive: Benefits gained
- Negative: Trade-offs accepted
- Neutral: Implications

## Implementation Notes (if applicable)
## Related Decisions (if applicable)
## References
```

## Context Detection Examples

### Example 1: Project-wide ADR

```bash
# User is in repo root
cd /home/roei/projects/claude-task-system
/project:adr "use PostgreSQL for primary database"

# Creates: docs/adr/001-use-postgresql-for-primary-database.md
# Context: Project-wide
```

### Example 2: Feature-specific ADR

```bash
# User is in feature directory
cd /home/roei/projects/claude-task-system/planning/features/001-user-auth
/project:adr "JWT vs session-based authentication"

# Creates: planning/features/001-user-auth/adr/001-jwt-vs-session-authentication.md
# Context: Feature: 001-user-auth
```

### Example 3: Creating ADR during planning

```bash
# During /project:plan-feature, AI suggests an ADR
# User is prompted inline:

During planning, I've identified an architectural decision:

"Should we use JWT or session-based authentication?"

Create ADR for this decision? [y/n]: y

[Runs /project:adr "JWT vs session authentication" inline]
```

## ADR Lifecycle

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

### Evolution

**Deprecation**:
```markdown
**Status**: Deprecated
**Date**: 2025-12-01
**Reason**: No longer applicable due to [reason]
**Replacement**: See ADR-005 for new approach
```

**Superseding**:
```markdown
# ADR 001: Use PostgreSQL

**Status**: Superseded by ADR-008
**Date**: 2025-06-15
**Superseded**: 2025-12-01
```

```markdown
# ADR 008: Migrate to DynamoDB

**Status**: Accepted
**Date**: 2025-12-01
**Supersedes**: ADR-001

## Problem Statement
Our data access patterns have changed, and PostgreSQL...
```

## Error Handling

### No Decision Context Provided

```
Error: No decision context provided.

Usage: /project:adr "decision context or title"

Examples:
  /project:adr "use GraphQL vs REST for API"
  /project:adr "choose between AWS and GCP"
  /project:adr "adopt TypeScript"
```

### Cannot Detect ADR Directory

```
Error: Cannot determine ADR location.

Please run this command from either:
- Repository root (for project-wide ADRs)
- Feature directory (for feature-specific ADRs)

Current directory: /some/other/path
```

## Best Practices

### Good Decision Titles

**Good**:
- "Use PostgreSQL for primary database"
- "Adopt microservices architecture"
- "Choose JWT for API authentication"
- "Use React for frontend framework"

**Bad**:
- "Database" (too vague)
- "Pick something for auth" (unprofessional)
- "We should use X because I like it" (not objective)

### Balanced Analysis

**Good** (honest assessment):
```markdown
## Option 2: MongoDB

**Pros**:
- Flexible schema for evolving data models
- Horizontal scaling out of the box
- Good for unstructured data

**Cons**:
- Weaker consistency guarantees than PostgreSQL
- No ACID transactions across collections
- Learning curve for team unfamiliar with NoSQL
- More difficult to enforce data integrity
```

**Bad** (biased):
```markdown
## Option 2: MongoDB

**Pros**:
- Some people like it

**Cons**:
- Everything else about it is terrible
```

### Consequences

**Good** (specific and actionable):
```markdown
## Consequences

**Positive**:
- ACID transactions ensure data consistency for financial operations
- Strong query capabilities support complex reporting requirements
- Team has 3 years PostgreSQL experience, reducing ramp-up time

**Negative**:
- Vertical scaling limits require careful capacity planning
- Need to manage database migrations carefully
- JSONB queries less performant than native document databases

**Neutral**:
- Requires PostgreSQL-specific deployment infrastructure
- Need to establish backup and recovery procedures
```

**Bad** (vague):
```markdown
## Consequences

**Positive**:
- Good database

**Negative**:
- Some limitations
```

## Integration with Workflow

ADRs integrate at multiple points:

1. **During feature planning** (`/project:plan-feature`):
   - Create ADRs for significant technical choices
   - Reference in plan.md

2. **During task execution** (`/project:start-task`):
   - Phase 2 (Solution Design): Create ADRs for design decisions
   - Phase 4 (Implementation): Create ADRs if new decisions arise

3. **Ad-hoc**:
   - Any time an architectural decision needs documentation
   - When debating between approaches
   - Before making significant changes

## Notes

- ADRs are immutable records - don't edit decisions, supersede them
- It's okay to document decisions retroactively if they're still relevant
- Not every decision needs an ADR - use judgment
- ADRs should be reviewed by team members
- Keep ADRs concise (1-2 pages max)
- Link to ADRs from related code, docs, and plans

---

**Related**: See `docs/adr/000-adr-process.md` for complete ADR methodology.