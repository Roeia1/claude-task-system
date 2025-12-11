# adr

**Description**: Create an Architecture Decision Record (ADR)

## Purpose

This command helps document significant architectural decisions along with their context, options considered, and consequences. ADRs provide institutional memory about why certain technical choices were made.

## Usage

```bash
# Context-aware - detects if you're in a feature directory or project root
/task-system:adr "choice of JWT vs session-based authentication"
/task-system:adr "use PostgreSQL instead of MongoDB"
/task-system:adr "adopt microservices architecture"
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
   # Check if current working directory is under task-system/features/
   if [[ "$PWD" == */task-system/features/[0-9][0-9][0-9]-* ]]; then
     ADR_DIR=$(pwd)/adr
     SCOPE="Feature: $(basename $(pwd))"
   ```

   **Project-wide ADR** (if in repo root or elsewhere):
   ```bash
   else
     ADR_DIR=task-system/adrs
     SCOPE="Project-wide"
   fi
   ```

3. **Determine next ADR number**

   - List existing ADRs in target directory
   - Extract highest number (e.g., 003 from "003-api-design.md")
   - Increment by 1
   - Format as zero-padded 3-digit number
   - Note: Global ADRs start at 001
   - Feature ADRs start at 001 within each feature

4. **Generate slug from decision context**

   - Convert to kebab-case
   - Remove special characters
   - Limit to reasonable length (~50 chars)
   - Example: "Use PostgreSQL instead of MongoDB" -> "use-postgresql-instead-of-mongodb"

5. **Load ADR template**

   - Read adr-template.md from plugin's templates/planning/
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
   **Step 3: Analyze pros and cons**
   **Step 4: Recommend a decision**
   **Step 5: Document consequences**

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

## ADR Template Structure

Standard ADR format:

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
/task-system:adr "use PostgreSQL for primary database"

# Creates: task-system/adrs/001-use-postgresql-for-primary-database.md
# Context: Project-wide
```

### Example 2: Feature-specific ADR

```bash
# User is in feature directory
cd task-system/features/001-user-auth
/task-system:adr "JWT vs session-based authentication"

# Creates: task-system/features/001-user-auth/adr/001-jwt-vs-session-authentication.md
# Context: Feature: 001-user-auth
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

## Integration with Workflow

ADRs integrate at multiple points:

1. **During feature planning** (feature-planning skill):
   - Create ADRs for significant technical choices
   - Reference in plan.md

2. **During task execution** (`/task-system:start-task`):
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
