---
name: create-epic
description: Create a new epic document with vision and architecture sections
argument-hint: "<description>"
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Write, Bash(mkdir:*), AskUserQuestion
---

# Create Epic Skill

**Epic description**: $ARGUMENTS

## Process

### 1. Extract Epic Description

The epic description is provided via `$ARGUMENTS`.

If no description is provided (empty arguments), report an error:
```
Error: No epic description provided.

Usage: /create-epic <description>

Example: /create-epic "User authentication with OAuth"
```

### 2. Generate Epic Slug

Convert the description to a URL-friendly slug:
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters (keep only alphanumeric and hyphens)
- Limit to 50 characters
- Trim trailing hyphens

Example: "User Authentication System" → "user-authentication-system"

### 3. Check for Existing Epic

Check if `.claude-tasks/epics/<slug>/` already exists.

If it exists, use AskUserQuestion to ask:
```
question: "An epic with slug '<slug>' already exists. What would you like to do?"
header: "Epic exists"
options:
  - label: "Choose a different name"
    description: "Enter a new description for a unique slug"
  - label: "Overwrite existing"
    description: "Replace the existing epic.md file"
  - label: "Cancel"
    description: "Abort epic creation"
```

### 4. Create Directory Structure

Create the epic directory:
```bash
mkdir -p $CLAUDE_PROJECT_DIR/.claude-tasks/epics/<slug>/stories
```

### 5. Read Epic Template

Read the template from: `${CLAUDE_PLUGIN_ROOT}/skills/create-epic/templates/epic-template.md`

### 6. AI-Assisted Dialog for Epic Content

Engage the user in a structured dialog to build the epic. Start by analyzing the description and generating initial content, then ask clarifying questions.

#### Vision Section (Above ---)
For each section, generate initial content and ask clarifying questions:

1. **Overview**: Draft based on description, ask if it captures the intent
2. **Goals**: Propose 2-3 goals, ask user to confirm/modify
3. **Success Metrics**: Suggest measurable outcomes, refine with user
4. **Scope**:
   - In Scope: What's included
   - Out of Scope: What's explicitly excluded
5. **Non-Functional Requirements**: Performance, security, usability constraints

#### Architecture Section (Below ---)
For technical planning:

1. **Technical Approach**: High-level architecture decisions
2. **Key Decisions**: Major technical choices with rationale
3. **Data Models**: Schema/structures (if applicable)
4. **Interface Contracts**: APIs between components/stories
5. **Tech Stack**: Technologies to use
6. **Open Questions**: Unresolved technical questions

### 7. Generate Epic Content

Use the template structure to create the epic.md content. Fill in all sections based on the dialog with the user.

### 8. Write Epic File

Write the content to:
```
$CLAUDE_PROJECT_DIR/.claude-tasks/epics/<slug>/epic.md
```

### 9. Report Completion

```
Epic created: .claude-tasks/epics/<slug>/

Files:
- .claude-tasks/epics/<slug>/epic.md
- .claude-tasks/epics/<slug>/stories/ (empty, for future stories)

Next steps:
- Review and refine epic.md as needed
- Run /generate-stories to create stories from this epic
```

## Clarification Guidelines

Mark ambiguities with `[NEEDS CLARIFICATION: question]` in the initial draft, then resolve through dialog:

- **Vague terms**: "fast", "easy", "simple" without quantification
- **Ambiguous scope**: Unclear boundaries
- **Missing details**: Critical information not specified
- **Technical gaps**: Architecture decisions not made

## Example Dialog Flow

**User**: /create-epic "User authentication system"

**Assistant**: I'll create an epic for "User authentication system". Let me draft the initial structure.

Based on your description, here's what I understand:

**Overview**: A system to authenticate users, enabling secure access to protected resources.

**Goals** (proposed):
1. Enable users to securely log in and out
2. Protect user credentials with industry-standard security
3. Support scalable authentication patterns

Do these goals capture your intent? Would you like to modify or add any?

[Continue dialog for each section...]

## Notes

- Epics contain both vision (WHAT) and architecture (HOW) in a unified document
- The `---` separator divides vision from architecture sections
- Stories will be generated from the epic using `/generate-stories`
- Slug must be unique within `.claude-tasks/epics/`
