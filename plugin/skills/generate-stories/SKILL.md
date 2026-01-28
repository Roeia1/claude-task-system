---
name: generate-stories
description: Generate stories from an epic
argument-hint: "[epic-slug]"
user-invocable: true
disable-model-invocation: true
allowed-tools: Bash(npx:*), Bash(git:*), Bash(gh:*), Read, Write, AskUserQuestion, Task, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# Generate Stories Skill

!`npx @saga-ai/cli --path "${SAGA_PROJECT_DIR}" find "$0" --type epic`

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Resolve epic | The `saga find` command ran above and output a JSON result. Handle the result based on its structure: (1) **If found=true**: Extract `data.slug` as the epic slug and proceed. (2) **If found=false with matches array**: Use AskUserQuestion to disambiguate with question "Which epic do you want to generate stories for?", header "Epic", multiSelect false, and options array where each item has label "<slug>" and description "Epic: <slug>" for each epic in the matches array. After selection, use the selected slug. (3) **If found=false with error**: Display the error message and suggest using `/create-epic` first to create an epic, then stop. | Resolving epic | - | Read epic document |
| Read epic document | Read the epic file using the Read tool from path `${SAGA_PROJECT_DIR}/.saga/epics/<slug>/epic.md` where `<slug>` is the epic slug resolved in the previous task. This file contains the epic's vision, architecture, goals, and scope that will inform story generation. | Reading epic | Resolve epic | Generate story breakdown |
| Generate story breakdown | Analyze the epic content and generate a lightweight breakdown of stories (titles and descriptions only). Each story should represent a **logical implementation boundary** - a cohesive piece of work that can be broken down into atomic tasks. Stories are not atomic tasks themselves. **Good story boundaries** have: (1) Clear separation of concerns from other stories, (2) A cohesive deliverable (component, endpoint, feature), (3) Enough scope to contain multiple implementation tasks. **Examples of good stories**: "Login form component" (UI + validation + state management), "Password reset API endpoint" (route + controller + email service), "Session token management" (generation + validation + refresh). **Avoid**: (1) Too broad like "Authentication" which should be multiple stories, (2) Too small like "Add button" which is a task not a story. For each story, identify: `title` - clear title describing the deliverable, `description` - 1-2 sentence scope description. | Generating breakdown | Read epic document | Present breakdown for approval |
| Present breakdown for approval | Display the proposed stories to the user in this format: `## Proposed Stories for Epic: <slug>` followed by each story as `### Story N` with `**Title**: <title>` and `**Description**: <description>`. After listing all stories, show a separator `---` and ask: "Would you like to: 1. Approve and create all stories, 2. Modify the breakdown, 3. Cancel". Use AskUserQuestion with question "How would you like to proceed with these stories?", header "Stories", options: (1) "Approve all" with description "Create all stories as proposed", (2) "Modify" with description "Make changes to the breakdown", (3) "Cancel" with description "Abort story generation". If user selects "Modify", work with them to adjust titles/descriptions/add/remove stories, then present again. If user selects "Cancel", stop with message "Story generation cancelled." If user selects "Approve all", proceed. | Getting approval | Generate story breakdown | Spawn story generation agents |
| Spawn story generation agents | For each approved story, spawn a `generate-story` agent using the Task tool. **Critical**: Spawn ALL story agents in a single message with multiple Task tool calls to maximize parallelism. For each Task call use: subagent_type "generate-story", description "Generate story: <story_title>", prompt containing: `epic_slug: <epic_slug>`, `story_title: <story_title>`, `story_description: <story_description>`, and `other_stories:` listing all OTHER approved stories as `- <title>: <description>` (so each story knows its boundaries and avoids overlap). The agent will read the epic.md and template files itself, including any epic-level exclusions. | Spawning agents | Present breakdown for approval | Collect results |
| Collect results | Wait for all Task agents to complete. Each agent returns a JSON result with fields: `title`, `slug`, `branch`, `pr_url`. Collect all results into an array for the completion report. | Collecting results | Spawn story generation agents | Report completion |
| Report completion | Output a completion message: `Stories created for epic: <slug>` followed by a table with columns Story, Slug, Branch, PR where each row contains `<title>`, `<slug>`, `story-<epic>-<slug>`, `<pr-url>` from the collected results. Then show `Worktrees created in: .saga/worktrees/<epic-slug>/`. Finally show `Next steps:` with `- Review story.md files and refine as needed` and `- Run /execute-story <story-slug> to start implementation`. | Reporting completion | Collect results | - |

## Notes

- Stories represent logical implementation boundaries, not atomic tasks
- Each story gets its own branch, worktree, and PR via the generate-story agent
- Story agents run in parallel for efficiency
- The `other_stories` context prevents overlap between story scopes
