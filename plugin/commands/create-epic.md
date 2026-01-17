---
argument-hint: <description>
description: Create a new epic document (vision + architecture)
allowed-tools: Skill(create-epic), AskUserQuestion
---

# Create Epic

**Epic description**: $ARGUMENTS

Use the Skill tool to invoke `create-epic`. The skill will:
1. Generate a slug from the description
2. Create the epic directory in `.claude-tasks/epics/<slug>/`
3. Engage in dialog with user to clarify vision and architecture
4. Generate epic.md with unified structure (vision above ---, architecture below)
