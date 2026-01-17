---
argument-hint: "[epic-slug]"
description: Generate stories from an epic
allowed-tools: Bash(python:*), Skill(generate-stories), AskUserQuestion
---

# Generate Stories

**User input**: $ARGUMENTS

## Epic Resolution

Run the identifier resolver to find the epic:

```bash
python ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver.py "$ARGUMENTS" --type epic --project-root "$CLAUDE_PROJECT_DIR"
```

## Instructions

Based on the resolution above:

### If resolved=true

The epic was found. Use the Skill tool to invoke `generate-stories`.

### If resolved=false with epics array

Multiple epics match. Use AskUserQuestion to disambiguate:

```
question: "Which epic do you want to generate stories for?"
header: "Epic"
multiSelect: false
options: [
  {label: "<slug>", description: "Epic: <slug>"}
  ...for each epic in the epics array
]
```

After the user selects, invoke the `generate-stories` skill with the selected epic slug in context.

### If resolved=false with error

Display the error message to the user. Suggest:
- Use `/create-epic` to create a new epic first
- Check the epic slug spelling
