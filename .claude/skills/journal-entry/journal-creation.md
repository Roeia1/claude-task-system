# Journal Creation

This file contains instructions for creating a new journal file when it doesn't exist. This is called by the journaling subagent on first invocation for a task.

## When to Create

Create a journal file when:
- Journal file doesn't exist at `execution/tasks/{task_id}/journal.md`
- Task directory exists at `execution/tasks/{task_id}/`
- This is the first journal invocation for the task

## Creation Process

### Step 1: Read Template

Read the journal template from: `execution/templates/journal-template.md`

### Step 2: Replace Placeholders

Replace all placeholders with task-specific values:

| Placeholder | Replacement | How to Get |
|------------|-------------|------------|
| `{TASK_ID}` | Task number (e.g., "042") | From task_id parameter |
| `{TASK_TITLE}` | Task title | Read from `execution/tasks/{task_id}/task.md` (first heading) |
| `{INITIAL_PHASE}` | Initial phase | From phase parameter (e.g., "Phase 1 - Task Analysis") |
| `{BRANCH_NAME}` | Git branch name | Run `git branch --show-current` |
| `{PR_LINK}` | PR link | Use "Pending" initially (updated when PR created) |
| `{BASE_BRANCH}` | Base branch | Run `git symbolic-ref refs/remotes/origin/HEAD` or use "main" |
| `{FIRST_ENTRY}` | First journal entry | Format the entry being created (see SKILL.md for format) |

### Step 3: Write Journal File

1. Write the populated template to `execution/tasks/{task_id}/journal.md`
2. Ensure proper formatting is preserved
3. Verify file was created successfully

### Step 4: Continue with Entry

After creating the journal file, continue with the normal entry addition process as described in the main SKILL.md file.

## Error Handling

### Task Directory Missing

If `execution/tasks/{task_id}/` doesn't exist:
- **Error**: Task not initialized
- **Action**: Report to calling agent that task directory must be created first
- **Do NOT**: Create the task directory (that's the responsibility of task-start)

### Template Missing

If `execution/templates/journal-template.md` doesn't exist:
- **Error**: Template file missing
- **Action**: Report critical error to calling agent
- **Suggest**: Check repository integrity

### Journal Already Exists

If journal file already exists at the path:
- **Do NOT**: Overwrite existing journal
- **Action**: Skip creation, proceed with reading existing journal
- **Note**: This shouldn't happen in normal flow, but handle gracefully

## Best Practices

1. **Always include first entry**: Never create empty journal with blank Progress Log
2. **Preserve template structure**: Maintain exact formatting from template
3. **Validate git values**: Ensure branch names are retrieved correctly
4. **Error clearly**: Report specific issues if creation fails
