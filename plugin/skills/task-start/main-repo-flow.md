# Main Repository Flow

Execute this flow when `detect-context.sh` returns "main". This flow creates/locates the worktree and instructs the user to open a new session there.

## File Locations

- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Task Files**: `task-system/tasks/NNN/task.md`
- **Worktrees**: `task-system/worktrees/task-NNN-{type}/`

---

## Step 1: Task Selection

1. **Read** `task-system/tasks/TASK-LIST.md`
2. **If user specified a task ID**: Use that ID directly, continue to Step 2
3. **If no task ID specified**: Display a select task menu of PENDING tasks only:

   ```
   Select a task to start:
   1. [001] Add user authentication
   2. [002] Fix login bug (blocked by 001)
   ```

4. **Accept** menu selection

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

| TASK-LIST Status | Journal Exists? | Worktree Exists? | State                        |
| ---------------- | --------------- | ---------------- | ---------------------------- |
| PENDING          | No              | No               | NEW                          |
| PENDING          | Yes             | Yes              | CONTINUING (worktree exists) |
| IN_PROGRESS      | Yes             | Yes              | CONTINUING (worktree exists) |
| IN_PROGRESS      | No              | No               | ERROR (corrupted state)      |

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

## Error Handling

| Error                        | Message                                               |
| ---------------------------- | ----------------------------------------------------- |
| Task not found               | "Task XXX not found in TASK-LIST"                     |
| Task completed               | "Task XXX already completed"                          |
| Dependencies not met         | "Blocked by: XXX (PENDING), YYY (IN_PROGRESS)"        |
| Dirty working directory      | "Uncommitted changes - commit or stash first"         |
| Worktree exists (continuing) | Instructions to open worktree session -> STOP         |
| Corrupted state              | "Task state corrupted - check TASK-LIST and worktree" |

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
