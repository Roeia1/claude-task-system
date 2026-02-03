---
name: init
description: Initialize .saga/ directory structure for SAGA epic/story workflow
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Bash(mkdir:*, ls:*, grep:*), Edit
---

# Initialize SAGA

Initialize the `.saga/` directory structure for epic/story workflow management.

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Check existing .saga | Check if `.saga/` already exists using `ls .saga/ 2>/dev/null`. If it exists, report to user: "SAGA is already initialized in this project. The .saga/ directory exists with:" followed by listing contents. Then stop - do not reinitialize. If it doesn't exist, proceed to create structure. | Checking existing structure | - | Create directory structure |
| Create directory structure | Create the SAGA directory structure using Bash: `mkdir -p .saga/epics .saga/archive .saga/worktrees`. This creates: (1) `.saga/epics/` - for epic definition files, (2) `.saga/archive/` - for completed/archived stories, (3) `.saga/worktrees/` - for git worktree isolation during story execution. | Creating directories | Check existing .saga | Update gitignore |
| Update gitignore | Check if `.gitignore` exists and if it already contains `.saga/worktrees/`. Use `grep -q '.saga/worktrees/' .gitignore 2>/dev/null` to check. If pattern NOT found: append the worktrees pattern to `.gitignore` using Edit tool. Add a newline, then the comment `# SAGA worktrees (git worktree isolation for stories)`, then `.saga/worktrees/` on the next line. If `.gitignore` doesn't exist, create it with just the comment and pattern. If pattern already exists, skip this step. | Updating .gitignore | Create directory structure | Report completion |
| Report completion | Report success to the user with the following message: "SAGA initialized successfully!" followed by "Created directory structure:" with bullet points for `.saga/epics/` (epic definitions), `.saga/archive/` (completed stories), `.saga/worktrees/` (worktree isolation, gitignored). Then show "Next steps:" section. | Reporting completion | Update gitignore | - |

## Completion Message

After initialization, tell the user:

**SAGA initialized successfully!**

Created directory structure:
- `.saga/epics/` - Epic definition files
- `.saga/archive/` - Completed/archived stories
- `.saga/worktrees/` - Git worktree isolation (gitignored)

**Next steps:**
1. **Create an epic**: Use `/create-epic <description>` to define a new feature
2. **Generate stories**: Use `/generate-stories <epic>` to break an epic into stories
3. **Execute a story**: Use `/execute-story <story>` to start autonomous story execution

## Notes

- The `/init` command is idempotent - running it again on an initialized project will simply report the existing structure
- The `.saga/worktrees/` directory is gitignored because worktrees contain full repo checkouts for story isolation
- All SAGA data (epics, stories, sessions) lives in `.saga/` and is committed to the repository (except worktrees)
