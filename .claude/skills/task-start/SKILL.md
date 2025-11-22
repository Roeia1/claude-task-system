---
name: task-start
description: "ONLY activate on DIRECT user request to start a task. User must explicitly mention keywords: 'start task', 'begin task', 'work on task [ID]'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to start or resume a task."
---

# Task Start Skill

When activated, help the user start or resume work on a task following the 8-phase execution discipline.

## File Locations

- **Task List**: `execution/TASK-LIST.md`
- **Task File**: `execution/tasks/NNN/task.md`
- **Journal**: `execution/tasks/NNN/journal.md`
- **Task Type Workflows**: `execution/workflows/{type}-workflow.md`
  - `feature-workflow.md` - New functionality
  - `bugfix-workflow.md` - Error corrections
  - `refactor-workflow.md` - Code improvements
  - `performance-workflow.md` - Optimization
  - `deployment-workflow.md` - Infrastructure
- **Shared Protocols**: `execution/shared/`
- **Full Workflow**: `.claude/commands/start-task.md`

## Process

### Task Selection

1. **Read task list** from `execution/TASK-LIST.md`
2. **Show available tasks** (PENDING and IN_PROGRESS)
3. **Interactive selection** or use direct task ID from user input
4. **Validate task**:
   - Ensure task exists
   - Check dependencies are COMPLETED
   - Verify not already in worktree (check for `[worktree: path]` marker)

### Setup Phase

**For New Tasks (PENDING)**:
1. **Git setup**:
   - Ensure working directory is clean
   - Checkout and update main branch
   - Create feature branch: `git checkout -b feature/task-XXX-description`
   - Create draft PR immediately
2. **Read task file** from `execution/tasks/NNN/task.md`
3. **Read task type workflow** from `execution/workflows/{type}-workflow.md`
4. **Create journal** at `execution/tasks/NNN/journal.md`:
   - Initialize with task type-specific template
   - Include git references (branch, PR number)
5. **Update task status** to IN_PROGRESS in `execution/TASK-LIST.md`

**For Ongoing Tasks (IN_PROGRESS)**:
1. **Checkout task branch**
2. **Read journal** to identify current phase
3. **Read task type workflow** to ensure correct workflow
4. **Summarize current state** for user

### Begin Execution

1. **Follow task type workflow** from `execution/workflows/{type}-workflow.md`
2. **Request permission** to proceed:
   - New tasks: Ask to begin Phase 1 (Task Analysis)
   - Ongoing tasks: Ask to continue from current phase
3. **Follow the 8-phase workflow**:
   - Phase 1: Task Analysis
   - Phase 2: Solution Design
   - Phase 3: Test Creation (TDD)
   - Phase 4: Implementation
   - Phase 5: Refactor
   - Phase 6: Verification & Polish
   - Phase 7: Reflection
   - Phase 8: Completion

## Critical Rules

- **Test-Driven Development**: Tests MUST be written in Phase 3, before implementation
- **Phase Progression**: Each phase requires explicit user permission
- **No Test Modification**: After Phase 3, tests only change with explicit approval
- **Continuous Journaling**: Update journal throughout with decisions and insights
- **Commit Discipline**: Commit and push at end of each phase
- **Sequential Execution**: Complete phases in order, no skipping

## Next Steps

After completing all phases, suggest using the **task-completion** skill to finalize and merge.

## References

- Complete workflow details: `.claude/commands/start-task.md`
- Task type workflows: `execution/workflows/`
- Shared protocols: `execution/shared/`
- Project guidelines: `CLAUDE.md`
