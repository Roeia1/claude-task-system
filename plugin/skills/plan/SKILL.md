---
name: plan
description: Collaboratively plan a goal, then create stories (standalone or epic-based)
argument-hint: "<goal>"
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git:*), Bash(gh:*), Bash(ls:*), Read, Write, Glob, Grep, AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TaskGet
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
| Propose work structure | Based on the deep understanding from the discussion, decide whether this goal is a **single story** or a **multi-story epic**: **Single-story** — The goal is a cohesive deliverable (one branch, one PR, roughly 3-8 tasks). Appropriate when: the work has a single logical implementation boundary, one developer could review it as one PR, there's no benefit to splitting into separate branches. Propose: story ID (URL-friendly, lowercase, hyphens, 3-5 words), title, and an **extensive description** in rich markdown capturing all context from the discussion (scope, approach, acceptance criteria, technical details, edge cases, decisions made). **Multi-story (epic)** — The goal has multiple logical implementation boundaries that benefit from separate branches/PRs. Appropriate when: the work naturally splits into independent deliverables, separate PRs would be easier to review, stories have clear boundaries. Propose: epic ID, title, and **extensive description**, plus a list of stories. Each story needs: ID (globally unique, URL-friendly), title, description (extensive markdown), and inter-story dependencies. Present the proposal to the user using AskUserQuestion with options: (1) "Approve" — proceed as proposed, (2) "Break down further" — split stories into smaller, more granular pieces, (3) "Consolidate" — merge stories together into fewer, larger units. The user can also select "Other" to describe modifications in free text. If the user selects "Break down further", "Consolidate", or provides modification instructions via "Other", apply the changes, re-present the updated proposal, and repeat until approved. If user selects "Approve", proceed. | Proposing structure | Check existing items | Generate story content |
| Generate story content | Run `node $SAGA_PLUGIN_ROOT/scripts/schemas.js create-story-input` to learn all schemas (story, task, epic) and the combined input format. Follow the schema output — it contains field descriptions, realistic examples, and writing guides. Generate the complete JSON for each story following the documented input format, and write each to `${SAGA_PROJECT_DIR}/story-<story_id>.json` using the Write tool. **Multi-story (epic)**: Also write the epic JSON to `${SAGA_PROJECT_DIR}/.saga/epics/<epic_id>.json` following the epic schema from the output. | Generating story content | Propose work structure | Create artifacts |
| Create artifacts | For each `story-<story_id>.json` file written in the previous task, run: `node $SAGA_PLUGIN_ROOT/scripts/create-story.js --input ${SAGA_PROJECT_DIR}/story-<story_id>.json`. The script creates: git branch `story/<story_id>`, worktree, writes story.json + task JSONs, commits, pushes, and creates a draft PR. It outputs JSON with `storyId`, `storyTitle`, `branch`, `worktreePath`, `prUrl`. Run sequentially for each story. After each script completes (success or failure), delete the temp file. Collect JSON output from each run. | Creating artifacts | Generate story content | Report completion |
| Report completion | Output a completion message. **Single-story**: `Story created: <story_id>` followed by a table with columns Story, Branch, PR showing the story details. **Multi-story**: `Stories created for epic: <epic_id>` followed by a table with columns Story, ID, Branch, PR for each story. Then show `Next steps:` with `- Run /execute-story <story-id> to start implementation`. | Reporting completion | Create artifacts | - |

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
- Both single-story and multi-story paths use `create-story.js` — a deterministic script (no LLM agent needed)
- Content is generated here (orchestrator) with full discussion context, then passed as pre-built JSON to the script
- Story and epic IDs must be globally unique — check `.saga/epics/` and `.saga/stories/` before generating
- The extensive description is critical — it replaces what the old epic template captured in rigid sections
