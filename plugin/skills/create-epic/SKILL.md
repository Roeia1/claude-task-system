---
name: create-epic
description: Create a new epic document with vision and architecture sections
argument-hint: "<description>"
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Write, Bash(mkdir:*), AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# Create Epic Skill

**Epic description**: $0

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Validate epic description | The epic description is provided via `$0` above. If no description is provided (empty string or whitespace only), report an error and stop: `Error: No epic description provided.` followed by `Usage: /create-epic <description>` and `Example: /create-epic "User authentication with OAuth"`. If a description is provided, proceed to the next task. | Validating description | - | Generate epic slug |
| Generate epic slug | Convert the description to a URL-friendly slug. Rules: (1) Convert to lowercase, (2) Replace spaces and special characters with hyphens, (3) Remove consecutive hyphens, (4) Trim leading/trailing hyphens. Example: "User Authentication System" → "user-authentication-system". Store the slug for use in subsequent tasks. | Generating slug | Validate epic description | Check existing epic |
| Check existing epic | Check if the directory `${SAGA_PROJECT_DIR}/.saga/epics/<slug>/` already exists using Bash `ls`. If it exists, use AskUserQuestion with: question "An epic with slug '<slug>' already exists. What would you like to do?", header "Epic exists", options: (1) "Choose a different name" with description "Enter a new description for a unique slug", (2) "Overwrite existing" with description "Replace the existing epic.md file", (3) "Cancel" with description "Abort epic creation". If user chooses "different name", ask for new description and restart from "Generate epic slug". If user chooses "Cancel", stop execution with message "Epic creation cancelled." If user chooses "Overwrite", proceed. If directory doesn't exist, proceed. | Checking existing epic | Generate epic slug | Create directory structure |
| Create directory structure | Create the epic directory structure using Bash: `mkdir -p ${SAGA_PROJECT_DIR}/.saga/epics/<slug>/stories`. This creates both the epic directory and an empty stories subdirectory for future story files. | Creating directories | Check existing epic | Read epic template |
| Read epic template | Read the template file from `${SAGA_PLUGIN_ROOT}/skills/create-epic/templates/epic-template.md` using the Read tool. This template contains the structure for the epic document with placeholder sections for: Overview, Goals, Success Metrics, Scope (In/Out), Non-Functional Requirements, Technical Approach, Key Decisions, Data Models, Interface Contracts, Tech Stack, and Open Questions. | Reading template | Create directory structure | Dialog for vision |
| Dialog for vision | Engage user in dialog to build the Vision sections. For each section, generate initial content based on the epic description, then ask clarifying questions using AskUserQuestion. Sections to cover: (1) **Overview**: Draft based on description, ask if it captures the intent. (2) **Goals**: Propose 2-3 goals, ask user to confirm/modify/add. (3) **Success Metrics**: Suggest measurable outcomes, refine with user. (4) **Scope - In Scope**: What features/functionality is included. (5) **Scope - Out of Scope**: What is explicitly excluded or deferred. (6) **Non-Functional Requirements**: Performance targets, security requirements, usability constraints. Mark ambiguities with `[NEEDS CLARIFICATION: question]` in drafts. Clarify vague terms ("fast", "easy", "simple"), ambiguous scope boundaries, and missing critical details before finalizing. | Discussing vision | Read epic template | Dialog for architecture |
| Dialog for architecture | Engage user in dialog to build the Architecture sections. For each section, propose initial content and refine through questions. Sections to cover: (1) **Technical Approach**: High-level architecture and implementation strategy. (2) **Data Models**: Schema definitions, data structures, or entity definitions (if applicable). (3) **Interface Contracts**: APIs, contracts, or interfaces between components/stories. (4) **Tech Stack**: Technologies to use with their purposes. (5) **Key Decisions**: Major technical choices with format: Choice (what was decided), Rationale (why), Alternatives Considered. (6) **Open Questions**: Unresolved technical questions that need future resolution. Mark technical gaps with `[NEEDS CLARIFICATION: question]` and resolve through dialog before finalizing. | Discussing architecture | Dialog for vision | Write epic file |
| Write epic file | Generate the complete epic.md content using the template structure, filling in all sections based on the dialog results. Use the Write tool to save to `${SAGA_PROJECT_DIR}/.saga/epics/<slug>/epic.md`. The file should have the epic title as an H1 header, followed by all Vision and Architecture sections populated with the finalized content from the user dialog. | Writing epic file | Dialog for architecture | Report completion |
| Report completion | Output a completion message to the user: `Epic created: .saga/epics/<slug>/` followed by `Files:` section listing `- .saga/epics/<slug>/epic.md` and `- .saga/epics/<slug>/stories/ (empty, for future stories)`. Then show `Next steps:` with `- Review and refine epic.md as needed` and `- Run /generate-stories to create stories from this epic`. | Reporting completion | Write epic file | - |

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
- Stories will be generated from the epic using `/generate-stories`
- Slug must be unique within `.saga/epics/`
