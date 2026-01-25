---
name: init
description: Initialize .saga/ directory structure
user-invocable: true
---

# Initialize Task System

!`python3 ${CLAUDE_PLUGIN_ROOT}/skills/init/scripts/init_structure.py "$CLAUDE_PROJECT_DIR"`

The initialization script has run. Report the results to the user:

- Created `.saga/epics/` - Directory for epic definitions
- Created `.saga/archive/` - Archive for completed stories
- Created `.saga/worktrees/` - Git worktrees for story isolation (gitignored)
- Updated `.gitignore` to exclude worktrees/

## Next Steps

Tell the user they can now:

1. **Create an epic**: Use `/create-epic <description>` to define a new feature
2. **Generate stories**: Use `/generate-stories <epic>` to break an epic into stories
3. **Implement**: Use `/implement <story>` to start autonomous story execution

The task system is ready for use.
