---
name: create-epic
description: Create a new epic definition with vision and architecture
argument-hint: "<description>"
user-invocable: false
disable-model-invocation: true
allowed-tools: Read, Write, Bash(ls:*), AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# Create Epic Skill

> **Deprecated**: Use `/plan` instead. This skill is retained for backward compatibility but is no longer user-invocable.

**Epic description**: $0

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Validate epic description | The epic description is provided via `$0` above. If no description is provided (empty string or whitespace only), report an error and stop: `Error: No epic description provided.` followed by `Usage: /create-epic <description>` and `Example: /create-epic "User authentication with OAuth"`. If a description is provided, proceed to the next task. | Validating description | - | Generate epic ID |
| Generate epic ID | Convert the description to a URL-friendly ID. Rules: (1) Convert to lowercase, (2) Replace spaces and special characters with hyphens, (3) Remove consecutive hyphens, (4) Trim leading/trailing hyphens. Example: "User Authentication System" → "user-authentication-system". Store the ID for use in subsequent tasks. | Generating ID | Validate epic description | Check existing epic |
| Check existing epic | Check if the file `${SAGA_PROJECT_DIR}/.saga/epics/<id>.json` already exists using Bash `ls`. If it exists, use AskUserQuestion with: question "An epic with ID '<id>' already exists. What would you like to do?", header "Epic exists", options: (1) "Choose a different name" with description "Enter a new description for a unique ID", (2) "Overwrite existing" with description "Replace the existing epic JSON file", (3) "Cancel" with description "Abort epic creation". If user chooses "different name", ask for new description and restart from "Generate epic ID". If user chooses "Cancel", stop execution with message "Epic creation cancelled." If user chooses "Overwrite", proceed. If file doesn't exist, proceed. | Checking existing epic | Generate epic ID | Dialog for vision |
| Dialog for vision | Engage user in dialog to build the Vision sections. For each section, generate initial content based on the epic description, then ask clarifying questions using AskUserQuestion. Sections to cover: (1) **Overview**: Draft based on description, ask if it captures the intent. (2) **Goals**: Propose 2-3 goals, ask user to confirm/modify/add. (3) **Success Metrics**: Suggest measurable outcomes, refine with user. (4) **Scope - In Scope**: What features/functionality is included. (5) **Scope - Out of Scope**: What is explicitly excluded or deferred. (6) **Non-Functional Requirements**: Performance targets, security requirements, usability constraints. Mark ambiguities with `[NEEDS CLARIFICATION: question]` in drafts. Clarify vague terms ("fast", "easy", "simple"), ambiguous scope boundaries, and missing critical details before finalizing. | Discussing vision | Check existing epic | Dialog for architecture |
| Dialog for architecture | Engage user in dialog to build the Architecture sections. For each section, propose initial content and refine through questions. Sections to cover: (1) **Technical Approach**: High-level architecture and implementation strategy. (2) **Data Models**: Schema definitions, data structures, or entity definitions (if applicable). (3) **Interface Contracts**: APIs, contracts, or interfaces between components/stories. (4) **Tech Stack**: Technologies to use with their purposes. (5) **Key Decisions**: Major technical choices with format: Choice (what was decided), Rationale (why), Alternatives Considered. (6) **Open Questions**: Unresolved technical questions that need future resolution. Mark technical gaps with `[NEEDS CLARIFICATION: question]` and resolve through dialog before finalizing. | Discussing architecture | Dialog for vision | Generate epic title |
| Generate epic title | Based on the dialog, create a concise title for the epic. The title should be a short human-readable name summarizing the epic's purpose (e.g., "User Authentication System"). Store it for writing the epic file. | Generating title | Dialog for architecture | Write epic JSON |
| Write epic JSON | Construct the epic JSON object with the following structure: `{ "id": "<id>", "title": "<title>", "description": "<full description>", "children": [] }`. The `description` field should be a comprehensive markdown string that captures all the vision and architecture content from the dialog, organized with markdown headings: Overview, Goals, Success Metrics, Scope (In Scope / Out of Scope), Non-Functional Requirements, Technical Approach, Key Decisions, Data Models, Interface Contracts, Tech Stack, and Open Questions. The `children` array starts empty — it will be populated when stories are generated. Use the Write tool to save as `${SAGA_PROJECT_DIR}/.saga/epics/<id>.json`. Ensure the JSON is valid and properly formatted. | Writing epic JSON | Generate epic title | Report completion |
| Report completion | Output a completion message to the user: `Epic created: .saga/epics/<id>.json` followed by a brief summary of the epic title and key goals. Then show `Next steps:` with `- Review and refine .saga/epics/<id>.json as needed` and `- Run /generate-stories to create stories from this epic`. | Reporting completion | Write epic JSON | - |

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

## Example Epic JSON

```json
{
  "id": "user-authentication-system",
  "title": "User Authentication System",
  "description": "## Overview\n\nA system to authenticate users...\n\n## Goals\n\n- Enable users to securely log in...\n\n## Technical Approach\n\n...",
  "children": []
}
```

## Notes

- Epics are stored as single JSON files at `.saga/epics/<id>.json`
- The `description` field contains rich markdown with all vision and architecture content
- The `children` array is populated by `/generate-stories`
- Epic ID must be unique within `.saga/epics/`
