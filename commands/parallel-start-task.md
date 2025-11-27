# parallel-start-task

Creates a git worktree and starts a task in parallel mode, allowing multiple tasks to be worked on simultaneously.

## What it does

### From Main Repository

1. **Shows available tasks**: Displays PENDING tasks that can be started in parallel
2. **Checks dependencies**: Ensures task dependencies are met before starting
3. **Creates worktree**: Sets up isolated workspace at `task-system/worktrees/task-XXX-type/`
4. **Initializes task**: Creates journal, CLAUDE.md, makes initial commit
5. **Creates PR**: Pushes branch and creates draft PR
6. **Updates tracking**: Marks task with worktree location in TASK-LIST.md

### From Worktree (Claude isolated session)

1. **Verifies context**: Confirms you're in the correct worktree
2. **Shows task status**: Displays current phase and PR info
3. **Provides guidance**: Shows next steps for the current phase
4. **Reinforces isolation**: Reminds about worktree boundaries

## Usage

### Interactive Mode (no arguments)

Shows menu of available tasks:

```
/task-system:parallel-start-task
```

### Direct Task Selection (with task ID)

Start specific task directly:

```
/task-system:parallel-start-task 009
```

## Command Logic

### Step 1: Context Detection

```bash
# Use robust git detection instead of file-based detection
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
CURRENT_DIR=$(pwd)

# Check if current directory is a worktree (not the main repo)
if [ "$REPO_ROOT" != "$CURRENT_DIR" ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    WORKTREE_MODE=true
    # Extract task ID from path: task-system/worktrees/task-XXX-type/
    TASK_ID=$(pwd | grep -oE "task-([0-9]{3})" | cut -d'-' -f2)
else
    WORKTREE_MODE=false
fi
```

### Main Repository Mode Steps

#### Step 2: Task Selection

**With Task ID Argument**:

- Validate task exists and is PENDING
- Check dependencies are COMPLETED
- Verify task not already IN_PROGRESS

**Without Arguments**:

1. Read TASK-LIST.md
2. Filter for PENDING tasks only
3. Check each task's dependencies
4. Display numbered menu of available tasks
5. Show warning for tasks with unmet dependencies

#### Step 3: Pre-flight Checks

1. **Check working directory**: Ensure in main repository (not already in worktree)
2. **Verify clean state**: Check `git status` for uncommitted changes
3. **Check if worktree exists**: Use `git worktree list | grep "task-$TASK_ID"`
4. **Parse task type**: Extract from TASK-LIST.md (feature/refactor/bugfix/performance)

#### Step 4: Create Worktree

1. Create parent directory if needed: `mkdir -p task-system/worktrees`
2. Determine branch name: `feature/task-XXX-description` (based on task type)
3. Create worktree with proper error handling:
   ```bash
   # Check if branch exists
   if git show-ref --verify --quiet refs/heads/feature/task-XXX-description; then
       # Branch exists, attach to it
       git worktree add "task-system/worktrees/task-XXX-[type]" feature/task-XXX-description
   else
       # Create new branch
       git worktree add "task-system/worktrees/task-XXX-[type]" -b feature/task-XXX-description
   fi
   ```

#### Step 5: Initialize Task Files

1. Prepend isolation instructions to existing CLAUDE.md in worktree root
2. Create journal file at `task-system/worktrees/task-XXX-type/task-system/tasks/XXX/journal.md`
3. Initialize journal with appropriate workflow template

#### Step 6: Create PR from Main Repo

1. Make initial commit in worktree:
   ```bash
   git -C task-system/worktrees/task-XXX-type add -A
   git -C task-system/worktrees/task-XXX-type commit -m "chore(task-XXX): initialize task journal and setup"
   ```
2. Push branch:
   ```bash
   git -C task-system/worktrees/task-XXX-type push -u origin feature/task-XXX-description
   ```
3. Create draft PR:
   ```bash
   gh pr create --draft \
     --title "type(task-XXX): Task title from TASK-LIST.md" \
     --body "Task description and details" \
     --head feature/task-XXX-description
   ```
4. Capture PR number and update journal

#### Step 7: Update Task Status in Main Repository

1. Update TASK-LIST.md in main repository:
   - Move task from PENDING to IN_PROGRESS
   - Add worktree marker: `[worktree: task-system/worktrees/task-XXX-type]`
2. Commit change: `git commit -m "chore(task-XXX): start task in parallel worktree"`
3. **IMPORTANT**: Also update TASK-LIST.md in the worktree to maintain consistency

#### Step 8: Final Instructions

Display success message with:

- Worktree location
- Branch name and PR number
- Instructions to open new Claude session
- Next steps for Phase 1

### Worktree Mode Steps

#### Step 2: Verify Context

1. Confirm we're in a valid task worktree
2. Extract task ID and task type from directory path
3. Check that journal and CLAUDE.md exist

#### Step 3: Show Task Status

1. Read journal to determine current phase
2. Get PR info using `gh pr view`
3. Display task context and progress

#### Step 4: Provide Workflow Guidance

1. Read corresponding workflow file
2. Display workflow-specific phase requirements and guidance
3. Show appropriate next steps based on current phase
4. Remind about isolation rules
5. Confirm ready to proceed with work

## CLAUDE.md Template

The following isolation instructions should be **prepended** to the existing CLAUDE.md file:

```markdown
# Task XXX Worktree - ISOLATED ENVIRONMENT

## CRITICAL: Scope Isolation

You are working in a Git worktree for Task XXX. This is an ISOLATED environment.

### STRICT RULES:

1. **NEVER access parent directories** - No `../` paths
2. **NEVER use absolute paths** to main repo
3. **ALL file operations** must be relative to this worktree root
4. **This IS your root** - treat it as if nothing exists above this directory

### Task Context

- **Task ID**: XXX
- **Type**: [feature/refactor/bugfix/performance]
- **Branch**: [branch-name]
- **PR**: #[pr-number]
- **Description**: [task description]

### Working Directory

You are in: `task-system/worktrees/task-XXX-type/`
This contains a complete copy of the repository for this specific task.

### Allowed Operations

- Edit any file within this worktree
- Run commands relative to this directory
- Create new files for this task
- Commit and push to the task branch

### Forbidden Operations

- Access parent directories with ../
- Use absolute paths to main repository
- Reference files outside this worktree
- Switch branches (you're locked to the task branch)

Remember: You're in an isolated environment. Everything you need is in this worktree.

---

[Original CLAUDE.md content follows below]
```

## Error Handling

### Task Already Active

```
Error: Task XXX is already IN_PROGRESS

This task has already been started.
- Regular mode: Use /task-system:start-task to continue
- Parallel mode: Check task-system/worktrees/task-XXX-type/
```

### Worktree Already Exists

```
Error: Worktree already exists at task-system/worktrees/task-XXX-type

Options:
1. Resume existing work:
   - cd task-system/worktrees/task-XXX-type
   - claude (to start isolated session)

2. Remove and recreate:
   - git worktree remove task-system/worktrees/task-XXX-type
   - Run this command again

Warning: Removing a worktree will permanently delete any uncommitted changes!
```

### Dependencies Not Met

```
Warning: Task XXX has unmet dependencies:
- Task YYY (PENDING)
- Task ZZZ (IN_PROGRESS)

This task cannot be started until dependencies are COMPLETED.
```

### Uncommitted Changes

```
Error: You have uncommitted changes in the current repository
Please commit or stash your changes before starting a parallel task.
```

## Success Output Examples

### Main Repository Mode

```
Task 009 started in parallel worktree!

Worktree created at: task-system/worktrees/task-009-feature/
Branch: feature/task-009-postgresql-schema
PR: #55 (draft)

All files initialized:
- CLAUDE.md (isolation instructions)
- Journal (Phase 1 ready)
- Initial commit pushed

To start working:
1. Open a new terminal
2. cd task-system/worktrees/task-009-feature
3. claude
4. Begin Phase 1 analysis

You can continue working on other tasks in this terminal.
```

### Worktree Mode

```
Task 015 Worktree (Isolated Environment)

Branch: refactor/task-015-resolve-lint-issues
PR: #56 (draft)
Current Phase: 1 - Analysis & Planning

You are in an isolated worktree. All work must stay within this directory.

Ready to begin Phase 1 - follow the refactor workflow.
```

## Important Notes

- Each task gets its own isolated worktree inside task-system/worktrees/
- Claude sessions started in worktrees are OS-level restricted to that directory
- Main repo mode does ALL initialization including PR creation
- Worktree mode just verifies and guides the isolated work
- CLAUDE.md in each worktree has isolation rules prepended to preserve project context
- Complete parallel tasks using parallel-finalize-task (from worktree) then parallel-cleanup-worktree (from main repo)
- **TASK-LIST.md Synchronization**: The command updates TASK-LIST.md in both main repository and worktree to ensure consistency
