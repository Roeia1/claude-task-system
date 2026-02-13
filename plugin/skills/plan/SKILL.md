---
name: plan
description: Collaboratively plan a goal, then create stories (standalone or epic-based)
argument-hint: "<goal>"
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git:*), Bash(gh:*), Bash(ls:*), Read, Write, Glob, Grep, AskUserQuestion, Task, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# Plan Skill

**Goal**: $0

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Validate goal | The goal is provided via `$0` above. If no goal is provided (empty string or whitespace only), report an error and stop: `Error: No goal provided.` followed by `Usage: /plan <goal>` and `Example: /plan "user authentication with OAuth"`. If a goal is provided, proceed to the next task. | Validating goal | - | Explore the codebase |
| Explore the codebase | Read relevant code, files, and project structure to understand the current state of the project **in relation to the goal**. Use Glob, Grep, and Read to find files, patterns, and existing implementations that are relevant. The purpose is to build enough context so you can ask informed questions and make good suggestions during the collaborative discussion. Focus on: (1) Existing code that the goal touches or depends on, (2) Patterns and conventions already in use, (3) Data models, APIs, or interfaces that are relevant, (4) Tests and documentation that provide context. Do NOT ask the user questions in this task — just gather context silently. | Exploring codebase | Validate goal | Collaborate on the goal |
| Collaborate on the goal | This is the core of the skill — a **multi-turn collaborative discussion** using AskUserQuestion. Deeply understand the goal by probing relevant aspects. Use the following checklist as **guidance for what to explore** (not mandatory sections — only ask about what's relevant to the goal): (1) **Goals & success criteria** — What does success look like? What are the measurable outcomes? (2) **Scope boundaries** — What's in scope vs explicitly out of scope? What are the edges? (3) **Technical approach** — How should this be built? What patterns/architecture to use? (4) **Data models** — Any new schemas, entities, or data structures needed? (5) **Interface contracts** — APIs, component interfaces, or contracts between parts? (6) **Tech stack** — Any new technologies or libraries needed? (7) **Key decisions** — Any choices to make? Tradeoffs to consider? (8) **Non-functional requirements** — Performance, security, accessibility concerns? (9) **Open questions** — What's still unclear or needs future resolution? Ask about gaps, challenge vague assumptions, and surface risks. The discussion should feel natural — group related questions, skip irrelevant areas, and go deeper where needed. Use your codebase exploration to inform your questions (e.g., "I see you already have X — should we extend it or build something new?"). Continue until you have a thorough understanding of the goal. The output of this task is a rich, comprehensive understanding captured as context for the next tasks. | Discussing the goal | Explore the codebase | Check existing items |
| Check existing items | Run `ls ${SAGA_PROJECT_DIR}/.saga/epics/ 2>/dev/null` and `ls ${SAGA_PROJECT_DIR}/.saga/stories/ 2>/dev/null` to see existing epic and story IDs. These IDs must not be reused — all new IDs must be globally unique. | Checking existing items | Collaborate on the goal | Propose work structure |
| Propose work structure | Based on the deep understanding from the discussion, decide whether this goal is a **single story** or a **multi-story epic**: **Single-story** — The goal is a cohesive deliverable (one branch, one PR, roughly 3-8 tasks). Appropriate when: the work has a single logical implementation boundary, one developer could review it as one PR, there's no benefit to splitting into separate branches. Propose: story ID (URL-friendly, lowercase, hyphens, 3-5 words), title, and an **extensive description** in rich markdown capturing all context from the discussion (scope, approach, acceptance criteria, technical details, edge cases, decisions made). **Multi-story (epic)** — The goal has multiple logical implementation boundaries that benefit from separate branches/PRs. Appropriate when: the work naturally splits into independent deliverables, separate PRs would be easier to review, stories have clear boundaries. Propose: epic ID, title, and **extensive description**, plus a list of stories. Each story needs: ID (globally unique, URL-friendly), title, description (extensive markdown), and inter-story dependencies. Present the proposal to the user using AskUserQuestion with options: (1) "Approve" — proceed as proposed, (2) "Modify" — make changes to the proposal, (3) "Cancel" — abort planning. If user selects "Modify", iterate on the proposal and present again. If user selects "Cancel", stop with message "Planning cancelled." If user selects "Approve", proceed. | Proposing structure | Check existing items | Create artifacts |
| Create artifacts | **Single-story path**: Spawn one `saga-core:generate-story` agent using the Task tool with: `epic_id: none`, `story_id: <proposed_story_id>`, `story_title: <proposed_title>`, `story_description: <the extensive description>`, `other_stories: (none)`. **Multi-story (epic) path**: First, write the epic JSON to `${SAGA_PROJECT_DIR}/.saga/epics/<epic_id>.json` with structure `{ "id": "<id>", "title": "<title>", "description": "<extensive markdown description>", "children": [<story_ids>] }`. Then spawn **parallel** `saga-core:generate-story` agents (ALL in a single message with multiple Task tool calls) for every story: `epic_id: <epic_id>`, `story_id: <story_id>`, `story_title: <story_title>`, `story_description: <extensive story description>`, `other_stories:` listing all OTHER stories as `- <title>: <description>` so each agent knows its boundaries. | Creating artifacts | Propose work structure | Collect results |
| Collect results | Wait for all Task agents to complete. Each agent returns a JSON result with fields: `story_id`, `story_title`, `branch`, `worktree_path`, `pr_url`. Collect all results into an array for the completion report. | Collecting results | Create artifacts | Report completion |
| Report completion | Output a completion message. **Single-story**: `Story created: <story_id>` followed by a table with columns Story, Branch, PR showing the story details. **Multi-story**: `Stories created for epic: <epic_id>` followed by a table with columns Story, ID, Branch, PR for each story. Then show `Next steps:` with `- Run /execute-story <story-id> to start implementation`. | Reporting completion | Collect results | - |

## Collaboration Guidelines

The collaborative discussion is the heart of this skill. Follow these principles:

- **Be thorough**: The goal is a deep, extensive understanding — not a quick checkbox exercise
- **Be informed**: Use your codebase exploration to ask specific, contextual questions (e.g., "I see you have a `User` model with these fields — do we need to extend it?")
- **Be natural**: Group related questions together, skip areas that aren't relevant, go deeper where needed
- **Challenge assumptions**: If something is vague ("make it fast", "simple UI"), ask what that means concretely
- **Surface risks**: Point out potential issues, edge cases, or tradeoffs the user might not have considered
- **Capture everything**: The resulting descriptions should be extensive — a developer reading only the description should fully understand what to build and why

## Notes

- Stories represent logical implementation boundaries, not atomic tasks
- Each story gets its own branch, worktree, and PR via the generate-story agent
- Story agents run in parallel for efficiency
- The `other_stories` context prevents overlap between story scopes
- Story and epic IDs must be globally unique — check `.saga/epics/` and `.saga/stories/` before generating
- When creating a single story (no epic), pass `epic_id: none` to the generate-story agent
- The extensive description is critical — it replaces what the old epic template captured in rigid sections
