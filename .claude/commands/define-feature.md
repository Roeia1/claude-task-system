# define-feature

**Description**: Create a new feature definition with AI assistance

## Purpose

This command initiates a new feature by creating a feature definition document that describes WHAT needs to be built (not HOW). It uses AI to help structure requirements, user stories, and acceptance criteria while identifying ambiguities that need clarification.

## Usage

```bash
/project:define-feature "user authentication system"
/project:define-feature "real-time notification center"
/project:define-feature "advanced search with filters"
```

## What It Does

1. **Parses feature description** from command arguments
2. **Determines next feature ID** (auto-increments from existing features)
3. **Creates feature directory** structure (`features/NNN-slug/`)
4. **Generates feature.md** using AI with structured sections:
   - Overview and motivation
   - User stories with acceptance criteria
   - Functional and non-functional requirements
   - Success metrics
   - Out of scope items
5. **Interactive clarification** for any ambiguities detected
6. **Human review and approval** before finalizing

## Command Logic

### Arguments

- **Required**: Feature description (everything after the command)
- The description should be a brief summary of what needs to be built

### Process

1. **Get feature description from arguments**
   ```
   Feature description: $ARGUMENTS
   ```

2. **Determine next feature ID**
   - List existing features in `planning/features/` directory
   - Extract highest NNN number
   - Increment by 1
   - Format as zero-padded 3-digit number (e.g., 001, 002, 010)

3. **Generate feature slug**
   - Convert description to kebab-case
   - Example: "User Authentication System" → "user-authentication-system"
   - Limit to reasonable length (~50 chars)

4. **Create directory structure**
   ```
   planning/features/NNN-slug/
   ├── feature.md    (created now)
   ├── plan.md       (created later by /project:plan-feature)
   ├── tasks.md      (created later by /project:generate-tasks)
   └── adr/          (created as needed by /project:adr)
   ```

5. **Load feature template**
   - Read `planning/templates/feature-template.md`
   - Use as structure for generation

6. **AI-assisted generation**
   - Analyze the feature description
   - Generate user stories with acceptance criteria
   - Identify functional and non-functional requirements
   - Suggest success metrics
   - Define what's out of scope
   - **Mark ambiguities** with [NEEDS CLARIFICATION: question]

7. **Clarification loop**
   - Present detected ambiguities to user
   - Ask clarifying questions
   - Update feature.md with answers
   - Repeat until no ambiguities remain

8. **Human review**
   - Display generated feature.md
   - Ask user: "Does this accurately capture the feature? [y/n/edit]"
   - If "edit": Allow iterative refinement
   - If "n": Regenerate with feedback
   - If "y": Finalize and save

9. **Create feature.md file**
   - Write final content to `planning/features/NNN-slug/feature.md`
   - Create adr/ subdirectory

10. **Report completion**
    ```
    ✅ Feature defined: planning/features/001-user-authentication/
    📄 Feature file: planning/features/001-user-authentication/feature.md

    Next steps:
    - Review and refine feature.md if needed
    - Run /project:plan-feature to create technical plan
    ```

## Template Structure

The generated feature.md follows this structure (from `planning/templates/feature-template.md`):

- **Overview**: Brief description and motivation
- **User Stories**: As a [role], I want [capability], so that [benefit]
  - Each with specific, testable acceptance criteria
- **Functional Requirements**: What the system must do
- **Non-Functional Requirements**: Performance, security, scalability, usability
- **Out of Scope**: What this feature does NOT include
- **Success Metrics**: How to measure success
- **Dependencies**: External services, other features, infrastructure
- **Open Questions**: Items needing clarification before planning

## Clarification Guidelines

### When to Mark [NEEDS CLARIFICATION]

Mark items as needing clarification when:
- **Vague adjectives**: "fast", "easy", "simple" without quantification
- **Ambiguous scope**: Unclear boundaries or edge cases
- **Missing details**: Critical information not specified
- **Multiple interpretations**: Feature could be built different ways
- **Unstated assumptions**: Making assumptions about user intent

### Example Clarifications

**Bad** (guessing):
```markdown
## Functional Requirements
1. Users can reset their password via email
```

**Good** (marks ambiguity):
```markdown
## Functional Requirements
1. Users can reset their password via email
   [NEEDS CLARIFICATION: Should password reset links expire? If so, after how long?]
   [NEEDS CLARIFICATION: What happens if a user requests multiple resets?]
```

## Best Practices

### Feature Descriptions

**Good feature descriptions**:
- "User authentication with email/password and OAuth (Google, GitHub)"
- "Real-time notification center showing system alerts and user messages"
- "Product search with filters for price, category, and availability"

**Poor feature descriptions** (too vague):
- "Better login"
- "Notifications"
- "Search feature"

### Focus on WHAT, not HOW

**Good** (describes value):
```markdown
## Overview
Users need to be able to authenticate securely to access personalized features.
```

**Bad** (describes implementation):
```markdown
## Overview
We'll use JWT tokens with bcrypt password hashing and refresh token rotation.
```

Implementation details belong in plan.md (created with `/project:plan-feature`).

### User Stories

**Good story structure**:
```markdown
### Story: Password Reset

**As a** registered user who forgot my password
**I want** to reset my password via email
**So that** I can regain access to my account

**Acceptance Criteria:**
- [ ] User enters email address on "forgot password" page
- [ ] System sends password reset email within 1 minute
- [ ] Reset link expires after 1 hour
- [ ] User can set new password meeting security requirements
- [ ] Old password no longer works after reset
- [ ] User is automatically logged in after successful reset
```

## Error Handling

### No Feature Description Provided

If `$ARGUMENTS` is empty:
```
Error: No feature description provided.

Usage: /project:define-feature "feature description"

Example: /project:define-feature "user authentication with OAuth"
```

### Feature Already Exists

If a feature with similar name/slug already exists:
```
Warning: Similar feature exists: planning/features/002-user-auth/

Do you want to:
1. Create a new feature anyway
2. Update the existing feature
3. Cancel

Your choice: [1/2/3]
```

## Examples

### Example 1: Simple Feature

```bash
/project:define-feature "export data to CSV"
```

**Generated Structure**:
- User story: "As a user, I want to export my data to CSV so that I can analyze it in Excel"
- Functional requirements: Button to trigger export, all data included, proper CSV formatting
- Non-functional: Export completes within 10 seconds for up to 10,000 records
- Out of scope: Excel/PDF export, scheduled exports, email delivery

### Example 2: Complex Feature

```bash
/project:define-feature "multi-tenant user management with role-based permissions"
```

**AI would ask**:
- [NEEDS CLARIFICATION: How many tenants do we expect to support?]
- [NEEDS CLARIFICATION: Can users belong to multiple tenants?]
- [NEEDS CLARIFICATION: What roles are needed? (Admin, User, etc.)]
- [NEEDS CLARIFICATION: Can permissions be customized per tenant?]

## Notes

- Feature definitions should be reviewed and refined before planning
- Keep features reasonably sized (1-3 weeks of work ideally)
- Large features can be split into multiple smaller features
- Feature IDs are immutable once created (don't reuse numbers)

---

**Next Command**: After defining a feature, use `/project:plan-feature` to create the technical plan.