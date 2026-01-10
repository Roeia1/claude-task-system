# Step 2: Content Generation

Generate task.json content and write it to the worktree.

## Input Context

You have these parameters available:
- `task_id`, `task_type`, `task_title`, `task_brief`, `task_scope`
- `feature_path`, `plan_path`, `adr_paths[]`, `dependencies[]`, `priority`
- `feature_id` (optional)

## Process

### 1. Read Required Files

Read these files to generate task.json:

1. **Task template**: `${CLAUDE_PLUGIN_ROOT}/instructions/task-builder/templates/task.json.template`
2. **Plan**: `{plan_path}` - Focus on sections mentioned in `{task_scope}`
3. **Feature**: `{feature_path}` - Extract acceptance criteria and user value
4. **ADRs**: `{adr_paths}` - Note architectural constraints (if any provided)

### 2. Generate task.json

Follow the template structure exactly. The template defines all fields and their format.

The task.json must be **self-contained** - workers execute tasks using ONLY task.json without reading feature/plan files.

#### Filling Template Fields

| Field | Source |
|-------|--------|
| `meta.id` | Use `{task_id}` exactly as provided |
| `meta.title` | Use `{task_title}` exactly as provided |
| `meta.created` | Today's date in YYYY-MM-DD format |
| `meta.feature` | Use `{feature_id}` if provided, omit field if not |
| `overview` | Distill from feature.md, plan.md, and ADRs (see below) |
| `objectives` | Extract from plan.md `{task_scope}` sections (see below) |

#### Overview: Context Distillation

**CRITICAL**: The overview must contain ALL context a worker needs. Distill from:

1. **From feature.md**: Extract the user value and acceptance criteria relevant to this task
2. **From plan.md**: Extract the technical approach from `{task_scope}` sections
3. **From ADRs**: Include key architectural decisions and constraints

**Distillation Guidelines**:
- Include WHAT needs to be built and WHY it matters
- Include key technical decisions and constraints
- Include relevant acceptance criteria
- Be concise but complete - aim for 3-8 sentences
- Do NOT reference source files (e.g., "see plan.md") - the overview IS the context

#### Objectives: From Plan

Extract discrete objectives from the plan.md `{task_scope}` sections. Each objective should be:
- A single, testable unit of work
- Completable in one focused session
- Independent enough to verify in isolation

**Guidelines**:
- 3-7 objectives per task is typical
- `description` is REQUIRED - be specific and actionable
- `steps` is OPTIONAL - include for complex objectives that benefit from ordered guidance
- `notes` is OPTIONAL - include for constraints, gotchas, or helpful context
- All objectives start with `status: "pending"`

### 3. Validate JSON

Before writing, verify:
- [ ] JSON is syntactically valid (no trailing commas, proper quoting)
- [ ] All required fields present
- [ ] Each objective has id, description, and status
- [ ] Overview is self-contained (no references to source files)

### 4. Write to Worktree

Write the generated content to:
```
task-system/tasks/{task_id}/task-system/task-{task_id}/task.json
```

## Quality Standards

**DO:**
- Follow the template structure exactly
- Distill context completely into overview (worker never reads feature/plan)
- Make objectives specific and testable
- Use concrete file paths and technical details from plan.md
- Validate JSON syntax before writing

**DO NOT:**
- Leave placeholders like `<FILL_IN>` or `[TBD]`
- Reference source files in overview (e.g., "see plan.md for details")
- Create vague objectives like "implement the feature correctly"
- Copy entire plan.md sections verbatim - distill and condense

## Error Handling

If content generation fails:
1. Clean up the worktree: `git worktree remove task-system/tasks/{task_id} --force`
2. Delete the branch: `git branch -D task-{task_id}-{task_type}`
3. Report error with stage: `content_gen`

## Next Step

Once task.json is written successfully, proceed to Step 3 (Finalize).
