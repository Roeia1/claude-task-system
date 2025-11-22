# start-task

Shows available actionable tasks and initiates work on the selected task following instructions according to TASK-WORKFLOW.md.

## What it does

1. **Displays available tasks**: Shows PENDING and IN_PROGRESS tasks from TASK-LIST.md
2. **Interactive selection**: Presents numbered menu for easy task selection (when no task ID provided)
3. **Direct task start**: Directly starts specified task when task ID is provided as argument
4. **Task initialization**: Sets up selected task and prepares for execution

## Usage

### Interactive Mode (no arguments)

Simply run the command and follow the interactive prompts:

```
/project:start-task
```

### Direct Task Selection (with task ID)

Provide a task ID number to directly start that task:

```
/project:start-task 005
/project:start-task 010
```

### Interactive Selection Example

```
Select a task to work on:
1. [002] Add Victory Retailer XML Parser (PENDING)
2. [003] Implement MCP Server for Titinski (PENDING - blocked by task 001)
3. [001] Create Database Schema for Products (IN_PROGRESS - Phase 4)
4. [009] Design PostgreSQL Schema (IN_PROGRESS - Phase 2) [PARALLEL]

Select task (1-4):
```

**Note**: Tasks marked with [PARALLEL] are active in worktrees and cannot be selected here.

## Command Logic

### With Task ID Argument

If a task ID is provided (e.g., `/project:start-task 005`):

- Use task ID from arguments to directly start that task
- **Validate task ID**: Ensure the task exists in TASK-LIST.md
- **Check task status**: Verify task is PENDING or IN_PROGRESS
- **Direct initialization**: Skip interactive selection and proceed directly to task setup

### Without Arguments (Interactive Mode)

If no task ID is provided (arguments are empty):

1. **Display task list**: Show all PENDING and IN_PROGRESS tasks
2. **Interactive selection**: Present numbered menu
3. **Task initialization**: Proceed with selected task

---

**TASK EXECUTION:**

If $ARGUMENTS is provided, start that task directly. Otherwise, show interactive task selection.

## After Task Selection/Direct Start

Once a task is identified (either through selection or direct ID), immediately:

### Check for Parallel Execution

**IMPORTANT**: Before proceeding with setup, check if the selected task is already active in a worktree:

1. **Parse TASK-LIST.md** for the selected task
2. **Look for worktree marker**: Check if task line contains `[worktree: path]`
3. **If worktree detected**:

   ```
   Error: Task XXX is already active in a parallel worktree.

   This task is being worked on at: worktrees/task-XXX-type

   To work on a different task in parallel, use:
   /project:parallel-start-task

   To continue work on this task:
   1. Open a new terminal
   2. cd worktrees/task-XXX-type
   3. Continue from the current phase
   ```

   **EXIT** - Do not proceed with setup

4. **If no worktree marker**: Continue to setup phase

### A. Complete Setup Phase

1. **Read appropriate workflow**: Based on task type, read the corresponding workflow file:
   - Feature tasks: `execution/templates/task-types/feature.md`
   - Refactor tasks: `execution/templates/task-types/refactor.md`
   - Bugfix tasks: `execution/templates/task-types/bugfix.md`
   - Performance tasks: `execution/templates/task-types/performance.md`
   - Deployment tasks: `execution/templates/task-types/deployment.md`
2. **Read the task file**: `execution/tasks/XXX/task.md` to understand requirements, objectives, and acceptance criteria
3. **Determine current state and handle setup**:

#### For New Tasks (PENDING):

1. **Git Setup**:
   - Ensure working directory is clean: `git status`
   - Checkout and update main branch: `git checkout main && git pull origin main`
   - Create feature branch: `git checkout -b feature/task-XXX-brief-description`
   - Create draft PR immediately with task title
2. **Journal Creation**:
   - Create task journal file: `execution/tasks/{task-id}/journal.md`
   - Initialize with template structure from appropriate task-type workflow
   - Update journal with git references (branch name, PR number)
   - Include task type in journal header
3. **Status Update**: Mark task as IN_PROGRESS in TASK-LIST.md

#### For Ongoing Tasks (IN_PROGRESS):

1. **Git Setup**:
   - Checkout existing task branch: `git checkout feature/task-XXX-description`
2. **Progress Review**:
   - Read existing journal: `execution/tasks/XXX/journal.md`
   - Identify task type and current phase from journal
   - Verify using correct workflow for task type
   - Summarize current state for user

### B. Begin Task Execution

4. **Handoff complete**: Setup finished, ready for phase execution
5. **Ask for explicit permission** to proceed to the appropriate phase:
   - **New tasks**: Request permission to begin Phase 1 (Task Analysis)
   - **Ongoing tasks**: Request permission to continue from current phase
