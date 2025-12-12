---
name: journal-create
description: Utility skill for creating new journal files. Handles template loading, placeholder replacement, and file creation. ONLY called by the journaling subagent. NOT user-facing.
---

# Journal Create Skill

This skill handles the creation of new journal files when they don't exist. It is called by the journaling subagent before writing the first entry.

## Purpose

This skill focuses on **HOW to create journal files**:

- Template loading and parsing
- Placeholder replacement with task-specific values
- File creation and validation

**Note**: This skill only creates the journal structure. The first entry is added separately using the journal-write skill.

## File Locations

- **Journal Template**: `journal-template.md` (in this skill folder)
- **Journal Output**: `{worktree_path}/task-system/task-{task_id}/journal.md`
- **Task File**: `{worktree_path}/task-system/task-{task_id}/task.md`

**IMPORTANT**: All file paths MUST be constructed using the provided `worktree_path`. Never use relative paths or search for files by name.

## Input Requirements

When calling this skill, provide:

### Required Parameters

- **task_id**: Task number (e.g., "042")
- **worktree_path**: Absolute path to the worktree root (e.g., "/path/to/project/task-system/tasks/042")

### Optional Parameters

- **pr_link**: PR URL if already created (default: "Pending")

## Creation Process

### Step 1: Read Template

Read the journal template from `journal-template.md` in this skill folder

### Step 2: Gather Values

Collect all placeholder values:

| Placeholder       | Value Source                                                  |
| ----------------- | ------------------------------------------------------------- |
| `{TASK_ID}`       | From task_id parameter                                        |
| `{TASK_TITLE}`    | Read first heading from `{worktree_path}/task-system/task-{task_id}/task.md` |
| `{BRANCH_NAME}`   | Run `git branch --show-current` (from worktree_path)          |
| `{PR_LINK}`       | From pr_link parameter or "Pending"                           |
| `{BASE_BRANCH}`   | Run `git symbolic-ref refs/remotes/origin/HEAD` or use "main" |

**IMPORTANT**: When reading task.md, use the full absolute path: `{worktree_path}/task-system/task-{task_id}/task.md`

### Step 3: Replace Placeholders

Replace all placeholders in the template with gathered values:

1. Read template content
2. Replace each `{PLACEHOLDER}` with its value
3. Ensure proper formatting is preserved

### Step 4: Write Journal File

1. Write the populated template to `{worktree_path}/task-system/task-{task_id}/journal.md`
2. Ensure proper formatting is preserved
3. Verify file was created successfully

### Step 5: Return Confirmation

Report back:

- Journal created at `{worktree_path}/task-system/task-{task_id}/journal.md`
- Ready for first entry via journal-write skill

## Error Handling

### Task Directory Missing

If `{worktree_path}/task-system/task-{task_id}/` doesn't exist:

- **Error**: Task not initialized
- **Action**: Report to calling agent that task directory must be created first
- **Do NOT**: Create the task directory (that's the responsibility of task-start)

### Journal Already Exists

If journal file already exists at the path:

- **Do NOT**: Overwrite existing journal
- **Action**: Skip creation, report that journal already exists
- **Note**: Calling agent should proceed with journal-write skill instead

### Git Command Failures

If git commands fail:

- **Branch name**: Use "unknown" as fallback
- **Base branch**: Use "main" as fallback
- **Note**: Log warning but continue with fallbacks

## Best Practices

1. **Preserve template structure**: Maintain exact formatting from template
2. **Validate git values**: Ensure branch names are retrieved correctly
3. **Error clearly**: Report specific issues if creation fails
4. **Single responsibility**: Only create structure - use journal-write for entries
