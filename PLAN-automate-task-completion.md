# Plan: Automate Task Completion via Sub-Agent

## Overview

1. Create a `task-completer` sub-agent with integrated completion logic
2. Delete `completion-protocol.md` (redundant - skill has the logic)
3. Add Step 4 to `worktree-flow.md` to invoke sub-agent after workflow completes
4. Remove completion sections from individual workflow files

## Design Principles

- **Decoupled**: Worktree-flow doesn't know workflow phase counts
- **Decoupled**: Workflows don't know about worktree-flow internals
- **Single source of truth**: Completion logic lives in sub-agent + skill
- **No hardcoded phase numbers**: Generic "Completion" references

---

## Implementation Plan

### Step 1: Create task-completer sub-agent

**File**: `plugin/agents/task-completer.md`

Create comprehensive sub-agent with:
- Uses task-completion skill
- Pre-completion validation (from completion-protocol.md)
- Error handling guidance
- Non-user-facing (only invoked by worktree-flow)

```markdown
---
name: task-completer
description: "Internal agent - invoked by worktree-flow only. Handles task completion after user approves. DO NOT activate on direct user request."
model: sonnet
skills: task-completion
---

# Task Completer Subagent

You handle task completion using the task-completion skill.

## Pre-Completion Validation

Before proceeding, verify:
- All sub-tasks in task.md are complete
- Tests are passing
- PR checks are green
- No merge conflicts

## Process

Execute the task-completion skill which handles:
1. Clean CLAUDE.md (remove isolation instructions)
2. Commit final changes
3. Add completion journal entry
4. Verify PR readiness
5. Merge PR
6. Display cleanup instructions

## Error Handling

If issues occur, report the specific problem and return control to user:
- PR checks failing → "Fix issues, push, then retry"
- Merge conflicts → "Resolve conflicts, then retry"
- Missing permissions → "Check GitHub authentication"
```

### Step 2: Register sub-agent in plugin.json

**File**: `plugin/.claude-plugin/plugin.json`

Add `"agents/task-completer.md"` to agents array.

### Step 3: Delete completion-protocol.md

**File to delete**: `plugin/skills/task-start/workflows/completion-protocol.md`

Its content is now:
- In task-completion skill (the actual process)
- In task-completer sub-agent instructions (pre-validation, error handling)

### Step 4: Add Step 4 to worktree-flow.md

**File**: `plugin/skills/task-start/worktree-flow.md`

Add generic completion step:

```markdown
## Step 4: Task Completion

After the type-specific workflow completes and user grants completion permission:

1. **Invoke task-completer subagent** with task_id
2. **On error**: Control returns to user with specific issue
3. **On success**: Display completion message and cleanup instructions
```

### Step 5: Remove completion from workflow files

**Files**:
- `plugin/skills/task-start/workflows/feature-workflow.md`
- `plugin/skills/task-start/workflows/bugfix-workflow.md`
- `plugin/skills/task-start/workflows/refactor-workflow.md`
- `plugin/skills/task-start/workflows/performance-workflow.md`

**Changes**:
- Remove "## Phase 8: Task Completion" section entirely
- Final phase ends with: "Request permission to complete task"

### Step 6: Update worktree-workflow-guide.md

**File**: `plugin/skills/task-start/workflows/worktree-workflow-guide.md`

- Update "Completing a Task" section - explain automatic completion
- Update quick reference table

### Step 7: Update main documentation

**Files**:
- `CLAUDE.md` - Remove "Phase 8" references, use "Completion" generically
- `FEATURE-WORKFLOW.md` - Same treatment

### Step 8: Update task-completion skill (optional)

**File**: `plugin/skills/task-completion/SKILL.md`

- Remove "Phase 8" from journal entry template (line 54-58)
- Use generic "Completion" entry instead

---

## Files Summary

### Create (1 file)
- `plugin/agents/task-completer.md`

### Delete (1 file)
- `plugin/skills/task-start/workflows/completion-protocol.md`

### Modify (9 files)
1. `plugin/.claude-plugin/plugin.json` - Register new agent
2. `plugin/skills/task-start/worktree-flow.md` - Add Step 4
3. `plugin/skills/task-start/workflows/feature-workflow.md` - Remove Phase 8
4. `plugin/skills/task-start/workflows/bugfix-workflow.md` - Remove Phase 8
5. `plugin/skills/task-start/workflows/refactor-workflow.md` - Remove Phase 8
6. `plugin/skills/task-start/workflows/performance-workflow.md` - Remove Phase 8
7. `plugin/skills/task-start/workflows/worktree-workflow-guide.md` - Update guide
8. `CLAUDE.md` - Remove Phase 8 references
9. `FEATURE-WORKFLOW.md` - Remove Phase 8 references

### Optional
- `plugin/skills/task-completion/SKILL.md` - Remove "Phase 8" from journal template
