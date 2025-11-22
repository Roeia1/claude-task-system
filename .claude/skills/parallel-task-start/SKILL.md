---
name: parallel-task-start
description: "ONLY activate on DIRECT user request to start a parallel task. User must explicitly mention keywords: 'parallel task', 'start worktree', 'work on multiple tasks', 'concurrent task'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to start a task in parallel using worktrees."
---

# Parallel Task Start Skill

When activated, create a git worktree and start a task in parallel mode for concurrent task execution.

## File Locations

- **Task List**: `execution/TASK-LIST.md`
- **Task File**: `execution/tasks/NNN/task.md`
- **Journal**: `execution/tasks/NNN/journal.md` (created in worktree)
- **8-Phase Workflow**: `execution/TASK-WORKFLOW.md`
- **Task Type Workflows**: `execution/templates/task-types/{type}.md`
- **Parallel Guide**: `execution/PARALLEL-WORKFLOW-GUIDE.md`
- **Full Workflow**: `.claude/commands/parallel-start-task.md`

## What is Parallel Execution?

Git worktrees allow working on multiple tasks simultaneously by creating isolated working directories that share the same repository. Each worktree has:
- Independent working directory
- Own branch
- Separate PR
- Isolated Claude session

## Process

### Context Detection

The skill detects whether it's running from:
1. **Main Repository**: Initialize new parallel task
2. **Worktree**: Show status and guidance for existing parallel task

### Main Repository Mode

**Step 1: Task Selection**

1. **Read task list** from `execution/TASK-LIST.md`
2. **Filter for PENDING tasks** only
3. **Check dependencies** are COMPLETED
4. **Interactive selection** or use direct task ID
5. **Validate**: Task not already IN_PROGRESS or in worktree

**Step 2: Pre-flight Checks**

1. **Verify in main repository** (not already in worktree)
2. **Check working directory** is clean
3. **Check if worktree exists** for this task
4. **Parse task type** from task file

**Step 3: Create Worktree**

1. **Create parent directory**: `mkdir -p worktrees`
2. **Determine branch name**: `feature/task-XXX-description`
3. **Create worktree**:
   ```bash
   git worktree add "worktrees/task-XXX-{type}" -b feature/task-XXX-description
   ```
4. **Handle existing branch** scenario appropriately

**Step 4: Initialize Task Files**

1. **Prepend isolation instructions** to CLAUDE.md in worktree root:
   - CRITICAL: Scope isolation rules
   - Task context (ID, type, branch, PR)
   - Working directory location
   - Allowed/forbidden operations
2. **Read task type workflow** from `execution/templates/task-types/{type}.md`
3. **Create journal** at `worktrees/task-XXX-{type}/execution/tasks/NNN/journal.md`:
   - Initialize with task type-specific template
   - Include git references

**Step 5: Create PR from Main Repo**

1. **Make initial commit** in worktree:
   ```bash
   git -C worktrees/task-XXX-{type} add -A
   git -C worktrees/task-XXX-{type} commit -m "chore(task-XXX): initialize task journal and setup"
   git -C worktrees/task-XXX-{type} push -u origin feature/task-XXX-description
   ```
2. **Create draft PR**: `gh pr create --draft`
3. **Capture PR number** and update journal

**Step 6: Update Task Status**

1. **Update TASK-LIST.md** in main repository:
   - Move task from PENDING to IN_PROGRESS
   - Add worktree marker: `[worktree: worktrees/task-XXX-{type}]`
2. **Commit in main repo**: `git commit -m "chore(task-XXX): start task in parallel worktree"`
3. **Sync TASK-LIST.md to worktree**:
   ```bash
   cp execution/TASK-LIST.md "worktrees/task-XXX-{type}/execution/TASK-LIST.md"
   git -C worktrees/task-XXX-{type} add execution/TASK-LIST.md
   git -C worktrees/task-XXX-{type} commit -m "chore(task-XXX): sync TASK-LIST.md from main"
   git -C worktrees/task-XXX-{type} push
   ```

**Step 7: Provide Instructions**

Display success message with:
- Worktree location
- Branch name and PR number
- Instructions to open new Claude session in worktree
- Next steps for Phase 1

### Worktree Mode

**When activated from within a worktree:**

1. **Verify context**: Confirm in valid task worktree
2. **Extract task ID** and type from directory path
3. **Read journal** to determine current phase
4. **Get PR info**: `gh pr view`
5. **Display task context** and progress
6. **Read workflow** from `execution/templates/task-types/{type}.md`
7. **Provide guidance** for current phase
8. **Remind about isolation** rules
9. **Confirm ready** to proceed with work

## Critical Rules

- **Isolation**: Each worktree is an isolated environment
- **No parent access**: Never use `../` paths or absolute paths to main repo
- **All operations relative**: Treat worktree as root
- **Branch locked**: Cannot switch branches in worktree
- **CLAUDE.md preservation**: Isolation instructions prepended, not replaced

## Worktree Directory Structure

```
worktrees/
├── task-001-feature/        # Feature task worktree
│   ├── .git (file)          # Links to main .git
│   ├── CLAUDE.md            # Isolation instructions + original content
│   ├── execution/
│   │   └── tasks/001/
│   │       └── journal.md   # Task journal
│   └── [all other files]    # Complete repo copy
└── task-002-refactor/       # Refactor task worktree
    └── ...
```

## Next Steps

After parallel task start:
- Open new terminal and navigate to worktree
- Start new Claude session in worktree directory
- Begin Phase 1 of 8-phase discipline
- Work continues in isolation from main repo

When ready to complete:
- Use **parallel-task-finalization** skill (from worktree)
- Then **worktree-cleanup** skill (from main repo)

## References

- Complete workflow details: `.claude/commands/parallel-start-task.md`
- Parallel execution guide: `execution/PARALLEL-WORKFLOW-GUIDE.md`
- 8-phase discipline: `execution/TASK-WORKFLOW.md`
- Task type workflows: `execution/templates/task-types/`
- Project guidelines: `CLAUDE.md`
