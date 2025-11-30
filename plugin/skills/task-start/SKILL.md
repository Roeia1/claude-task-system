---
name: task-start
description: ONLY activate on DIRECT user request to start a task. User must explicitly mention keywords: 'start task', 'begin task', 'work on task [ID]'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to start or resume a task.
---

# Task Start Skill

Prepares environment for task execution using git worktrees. The skill detects context (main repo vs worktree) and routes accordingly:

- **Main repo**: Creates worktree, sets up PR, instructs user to open new session, then STOPS
- **Worktree**: Validates session, loads guidelines, hands off to workflow

## File Locations

- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Task Files**: `task-system/tasks/NNN/task.md`
- **Journals**: `task-system/tasks/NNN/journal.md`
- **Worktrees**: `task-system/worktrees/task-NNN-{type}/`
- **Workflows**: Read from plugin's `skills/task-start/workflows/{type}-workflow.md`
  - `feature-workflow.md`, `bugfix-workflow.md`, `refactor-workflow.md`, `performance-workflow.md`, `deployment-workflow.md`

---

## Step 0: Context Detection

Determine if running from main repository or worktree:

```bash
# Check if .git is a file (worktree) or directory (main repo)
if [ -f ".git" ]; then
    # We're in a worktree
    IN_WORKTREE=true
else
    # We're in main repo
    IN_WORKTREE=false
fi
```

**If in MAIN REPO** -> Continue to Step 1 (Main Repo Path)
**If in WORKTREE** -> Jump to Step 0.5 (Worktree Path)

---

# MAIN REPO PATH

## Step 1: Task Selection

1. **Read** `task-system/tasks/TASK-LIST.md`
2. **Filter** PENDING and IN_PROGRESS tasks (exclude COMPLETED)
3. **Display menu**:

   ```
   Select a task:
   1. [001] Add user authentication (PENDING)
   2. [002] Fix login bug (PENDING - blocked by 001)
   3. [005] Refactor API layer (IN_PROGRESS) [worktree exists]

   Enter task number or ID:
   ```

4. **Accept** menu selection OR direct task ID from user input

## Step 2: Validation

1. **Verify task exists** in TASK-LIST.md

   - Not found -> Error: "Task XXX not found"

2. **Check status**:

   - COMPLETED -> Error: "Task XXX already completed"
   - PENDING or IN_PROGRESS -> Continue

3. **Check dependencies** (parse task.md "Dependencies:" section):

   - Verify each dependency is COMPLETED in TASK-LIST.md
   - Any not completed -> Error: "Blocked by: XXX (PENDING), YYY (IN_PROGRESS)"

4. **Check working directory**: `git status --porcelain`
   - Not clean -> Error: "Uncommitted changes - commit or stash first"

## Step 3: State Detection

Determine task state based on TASK-LIST status, journal existence, and worktree existence:

| TASK-LIST Status | Journal Exists? | Worktree Exists? | State                              |
| ---------------- | --------------- | ---------------- | ---------------------------------- |
| PENDING          | No              | No               | NEW                                |
| PENDING          | Yes             | Yes              | CONTINUING (worktree exists)       |
| IN_PROGRESS      | Yes             | Yes              | CONTINUING (worktree exists)       |
| IN_PROGRESS      | No              | No               | ERROR (corrupted state)            |

**Check for existing worktree**:
```bash
git worktree list | grep "task-$TASK_ID"
```

**Check TASK-LIST.md for worktree marker**:
```bash
grep "task-$TASK_ID" TASK-LIST.md | grep -oE '\[worktree: [^]]+\]'
```

**For CONTINUING tasks with worktree**:
- Worktree already exists -> Skip to Step 5.5 (instruct user to open worktree)

## Step 4: Git Setup (NEW tasks only)

**Detect default branch**:

```bash
git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
```

Fallback: try "main", then "master"

**Create worktree**:

1. Ensure clean state: `git checkout {default} && git pull`
2. Create parent directory: `mkdir -p task-system/worktrees`
3. Parse task type from TASK-LIST.md or task.md
4. Sanitize task title for branch name
5. Create worktree with new branch:
   ```bash
   git worktree add "task-system/worktrees/task-XXX-{type}" -b feature/task-XXX-description
   ```

## Step 5: PR Setup

**Check for existing PR**:

```bash
gh pr list --head feature/task-XXX-* --state open --json number,url
```

**If PR exists**: Record PR number and URL, continue

**If no open PR**:

1. Make initial commit in worktree:
   ```bash
   git -C task-system/worktrees/task-XXX-{type} add -A
   git -C task-system/worktrees/task-XXX-{type} commit -m "chore(task-XXX): initialize task setup" --allow-empty
   git -C task-system/worktrees/task-XXX-{type} push -u origin feature/task-XXX-description
   ```
2. Create draft PR:
   ```bash
   gh pr create --draft --title "Task XXX: {title}" --body "Work in progress for task XXX" --head feature/task-XXX-description
   ```
3. Record PR number and URL

## Step 5.5: Worktree Finalization

1. **Prepend isolation instructions** to CLAUDE.md in worktree:

   ```markdown
   # Task XXX Worktree - ISOLATED ENVIRONMENT

   ## CRITICAL: Scope Isolation
   1. NEVER access parent directories (no `../`)
   2. NEVER use absolute paths to main repo
   3. ALL file operations relative to this worktree root
   4. This IS your root directory

   ### Task Context
   - Task ID: XXX
   - Type: [type]
   - Branch: [branch-name]
   - PR: #[number]

   ---
   [Original CLAUDE.md follows]
   ```

2. **Update TASK-LIST.md** in main repo:
   - Move task from PENDING to IN_PROGRESS (if applicable)
   - Add worktree marker: `[worktree: task-system/worktrees/task-XXX-{type}]`

3. **Commit status update** in main repo:
   ```bash
   git add task-system/tasks/TASK-LIST.md
   git commit -m "chore(task-XXX): start task in worktree"
   git push
   ```

4. **Sync TASK-LIST.md to worktree**:
   ```bash
   cp task-system/tasks/TASK-LIST.md task-system/worktrees/task-XXX-{type}/task-system/tasks/TASK-LIST.md
   ```

5. **Display instructions and STOP**:

   ```
   ===============================================================
   WORKTREE READY - NEW SESSION REQUIRED
   ===============================================================

   Task XXX worktree is ready!

   Location: task-system/worktrees/task-XXX-{type}/
   Branch: feature/task-XXX-description
   PR: #YY (draft)

   ---------------------------------------------------------------
   NEXT STEP: Open a new Claude session in the worktree
   ---------------------------------------------------------------

   1. Open a new terminal
   2. cd task-system/worktrees/task-XXX-{type}
   3. Start Claude Code (e.g., `claude`)
   4. Say "start task" or "start task XXX" to continue

   This session will now STOP.
   ===============================================================
   ```

6. **STOP** - Do not continue with workflow execution

---

# WORKTREE PATH

## Step 0.5: Session Validation

1. **Extract task ID** from current path:
   ```bash
   CURRENT_DIR=$(pwd)
   TASK_ID=$(echo "$CURRENT_DIR" | grep -oE "task-([0-9]{3})" | head -1 | cut -d'-' -f2)
   ```

2. **Verify in valid worktree**:
   - Path should match pattern `*/task-system/worktrees/task-XXX-{type}`
   - Task ID can be extracted

3. **Read TASK-LIST.md** from worktree

4. **Find expected worktree path** from task entry:
   ```bash
   EXPECTED_PATH=$(grep "task-$TASK_ID" task-system/tasks/TASK-LIST.md | grep -oE '\[worktree: [^]]+\]' | sed 's/\[worktree: //' | sed 's/\]//')
   ```

5. **Compare paths**:
   - If current path doesn't match expected -> Error with instructions:
     ```
     ===============================================================
     SESSION LOCATION MISMATCH
     ===============================================================

     You're running in the wrong worktree for this task.

     Current location: [current-path]
     Expected location: [expected-path]

     ---------------------------------------------------------------
     NEXT STEP: Open correct Claude session
     ---------------------------------------------------------------

     1. Close this Claude session
     2. cd [expected-path]
     3. Start Claude Code
     4. Say "start task XXX" to continue
     ===============================================================
     ```
     **STOP**

## Step 1: Task Confirmation (Worktree)

1. **Auto-detect task ID** from worktree path

2. **If user specified a task ID**:
   - Verify it matches the worktree's task ID
   - If mismatch: Error "This worktree is for task XXX, not task YYY"

3. **If user didn't specify a task ID**:
   - Ask for confirmation: "This worktree is for task XXX: [title]. Continue with this task? (yes/no)"
   - If no: Instruct user to navigate to correct worktree

## Step 2: Validation (Worktree)

1. **Verify task exists** in TASK-LIST.md
   - Not found -> Error: "Task XXX not found"

2. **Check status**:
   - COMPLETED -> Error: "Task XXX already completed"
   - PENDING or IN_PROGRESS -> Continue

3. **Check dependencies** (parse task.md "Dependencies:" section):
   - Verify each dependency is COMPLETED in TASK-LIST.md
   - Any not completed -> Error: "Blocked by: XXX (PENDING), YYY (IN_PROGRESS)"

4. **Skip git clean check** (we're in a worktree, changes expected)

## Step 6: Load Journaling Guidelines

Read `journaling-guidelines.md` in this skill folder.

**Note**: Journal creation is handled by the workflow, not this skill. This step only loads the guidelines for reference.

## Step 8: Handoff

**Display task context**:

```
===============================================================
Task XXX Ready for Execution
===============================================================

Branch: feature/task-XXX-description
PR: #YY (draft)
Type: {type}

---------------------------------------------------------------
Ready to begin workflow execution
---------------------------------------------------------------

Read the workflow at: plugin's skills/task-start/workflows/{type}-workflow.md

You are in an ISOLATED worktree environment:
- All file operations are relative to this directory
- Do NOT use ../ paths or absolute paths to main repo
- This worktree IS your root directory
===============================================================
```

**Point to type-specific workflow** for Phase 1 execution.

---

## Error Handling

| Error                          | Message                                              |
| ------------------------------ | ---------------------------------------------------- |
| Task not found                 | "Task XXX not found in TASK-LIST"                    |
| Task completed                 | "Task XXX already completed"                         |
| Dependencies not met           | "Blocked by: XXX (PENDING), YYY (IN_PROGRESS)"       |
| Dirty working directory        | "Uncommitted changes - commit or stash first"        |
| Worktree exists (from main)    | Instructions to open worktree session -> STOP        |
| Wrong session location         | Instructions to open correct session -> STOP         |
| Task ID mismatch in worktree   | "This worktree is for task XXX, not task YYY"        |
| Corrupted state                | "Task state corrupted - check TASK-LIST and worktree"|
| Workflow file missing          | "No workflow found for type: XXX"                    |

## Worktree Directory Structure

```
task-system/worktrees/
├── task-001-feature/        # Feature task worktree
│   ├── .git (file)          # Links to main .git
│   ├── CLAUDE.md            # Isolation instructions + original content
│   ├── task-system/
│   │   └── tasks/
│   │       ├── TASK-LIST.md # Synced copy
│   │       └── 001/
│   │           ├── task.md
│   │           └── journal.md
│   └── [all other files]    # Complete repo copy
└── task-002-refactor/       # Another task worktree
    └── ...
```

## Critical Rules

- **Always use worktrees**: Every task runs in its own worktree
- **Isolation**: Each worktree is a completely isolated environment
- **No parent access**: Never use `../` paths or absolute paths to main repo
- **All operations relative**: Treat worktree as root
- **Branch locked**: Cannot switch branches in worktree
- **Two-session workflow**: Main repo creates worktree, worktree executes task
