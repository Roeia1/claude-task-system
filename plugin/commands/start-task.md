# start-task

**Description**: Begin execution of a task following the 8-phase workflow discipline

## Purpose

This command starts task execution by invoking the task-start skill. It handles task selection, validation, branch creation, journal initialization, and guides you through the 8-phase execution workflow.

## Usage

```bash
# Interactive mode - shows menu of PENDING tasks
/task-system:start-task

# Direct task selection
/task-system:start-task 015
```

## What It Does

1. **Task Selection**: Shows PENDING tasks from task-system/tasks/TASK-LIST.md or accepts task ID
2. **Dependency Validation**: Verifies all task dependencies are COMPLETED
3. **Branch Creation**: Creates feature branch `feature/task-XXX-description`
4. **Journal Setup**: Initializes task-system/tasks/XXX/journal.md
5. **PR Creation**: Creates draft PR for the task
6. **Status Update**: Moves task to IN_PROGRESS in TASK-LIST.md
7. **Phase Guidance**: Begins Phase 1 (Task Analysis) of the 8-phase workflow

## Workflow Integration

This command initiates the 8-phase execution discipline:

1. **Phase 1: Task Analysis** - Read and understand requirements
2. **Phase 2: Solution Design** - Plan technical approach
3. **Phase 3: Test Creation (TDD)** - Write tests first
4. **Phase 4: Implementation** - Write code to pass tests
5. **Phase 5: Refactor** - Improve code quality
6. **Phase 6: Verification** - Ensure all criteria met
7. **Phase 7: Reflection** - Document learnings
8. **Phase 8: Completion** - Merge and finalize

Each phase requires explicit permission to proceed. The appropriate workflow file (feature, bugfix, refactor, performance, or deployment) is used based on task type.

## Skill Invocation

This command activates the `task-start` skill which provides:

- Detailed phase-by-phase guidance
- Journaling subagent integration
- Workflow template application
- Permission gate enforcement

## Task Types

The workflow adapts based on task type:

- **feature**: New functionality (feature-workflow.md)
- **bugfix**: Error corrections (bugfix-workflow.md)
- **refactor**: Code improvements (refactor-workflow.md)
- **performance**: Optimization (performance-workflow.md)
- **deployment**: Infrastructure (deployment-workflow.md)

## Prerequisites

- Task must exist in task-system/tasks/XXX/task.md
- Task must be in PENDING status in TASK-LIST.md
- All task dependencies must be COMPLETED
- Working directory must be clean (no uncommitted changes)

## Output

```
Starting Task 015: Implement User Authentication

Task validated:
- Type: feature
- Priority: P1
- Dependencies: None (or all completed)

Git setup:
- Branch: feature/task-015-user-authentication
- PR: #42 (draft)

Files initialized:
- Journal: task-system/tasks/015/journal.md
- Status: Updated to IN_PROGRESS

You are now in Phase 1: Task Analysis
Read the task file and feature context, then document your analysis in the journal.

Ready to proceed with Phase 1?
```

## Error Handling

### No PENDING Tasks
```
No PENDING tasks available.

All tasks are either IN_PROGRESS or COMPLETED.
Create new tasks with /task-system:new-task or /task-system:generate-tasks.
```

### Dependencies Not Met
```
Task 015 has unmet dependencies:
- Task 012 (IN_PROGRESS) - must be COMPLETED first
- Task 014 (PENDING) - must be COMPLETED first

Please complete dependencies before starting this task.
```

### Task Already Started
```
Task 015 is already IN_PROGRESS.

To continue work on this task, simply proceed with the current phase.
Check the journal for current status: task-system/tasks/015/journal.md
```

## Notes

- Use this command for regular (main repository) task execution
- For parallel execution, use `/task-system:parallel-start-task`
- The journaling subagent is invoked automatically throughout execution
- Commit at the end of each phase and at logical milestones
