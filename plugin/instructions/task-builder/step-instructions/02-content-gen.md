# Step 2: Content Generation

Generate comprehensive task.md content and write it to the worktree.

## Input Context

You have these parameters available:
- `task_id`, `task_type`, `task_title`, `task_brief`, `task_scope`
- `feature_path`, `plan_path`, `adr_paths[]`, `dependencies[]`, `priority`
- `feature_id` (optional)

## Process

### 1. Read Required Files

```
1. Task template: ${CLAUDE_PLUGIN_ROOT}/instructions/task-builder/templates/task-template.md
2. Plan: {plan_path} - Focus on sections mentioned in {task_scope}
3. Feature: {feature_path} - Extract acceptance criteria and user value
4. ADRs: {adr_paths} - Note architectural constraints (if any provided)
```

### 2. Generate Task Content

**Follow the task template exactly.** The template defines all required sections and their format.

For each section in the template:
- Populate with specific, actionable content derived from plan.md and feature.md
- Use the input parameters (`task_id`, `task_title`, `task_type`, `priority`, `dependencies`, etc.)
- Extract relevant details from `task_scope` sections of plan.md
- Derive acceptance criteria from feature.md requirements

### 3. Write to Worktree

Write the generated content to:
```
task-system/tasks/{task_id}/task-system/task-{task_id}/task.md
```

## Quality Standards

**DO:**
- Follow the template structure exactly
- Use specific file paths from plan.md (not placeholders)
- Make sub-tasks actionable and appropriately sized (5-10 items, 1-4 hours each)
- Include concrete test scenarios in testing strategy
- Derive acceptance criteria from feature requirements

**DO NOT:**
- Leave placeholders like "[TBD]" or "[fill in]"
- Copy entire plan.md - extract only relevant parts
- Include implementation code (that's for execution phase)
- Use vague language like "implement feature correctly"
- Deviate from the template structure

## Error Handling

If content generation fails:
1. Clean up the worktree: `git worktree remove task-system/tasks/{task_id} --force`
2. Delete the branch: `git branch -D task-{task_id}-{task_type}`
3. Report error with stage: `content_gen`

## Next Step

Once task.md is written successfully, proceed to Step 3 (Finalize).
