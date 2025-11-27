---
name: task-start
description: "ONLY activate on DIRECT user request to start a task. User must explicitly mention keywords: 'start task', 'begin task', 'work on task [ID]'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to start or resume a task."
---

# Task Start Skill

Prepares environment for task execution: validates task, sets up git branch, creates GitHub PR, and initializes journal. After setup, hands off to the task-type workflow.

## File Locations

- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Task Files**: `task-system/tasks/NNN/task.md`
- **Journals**: `task-system/tasks/NNN/journal.md`
- **Workflows**: Read from plugin's `workflows/{type}-workflow.md`
  - `feature-workflow.md`, `bugfix-workflow.md`, `refactor-workflow.md`, `performance-workflow.md`, `deployment-workflow.md`

## Process

### Step 1: Task Selection

1. **Read** `task-system/tasks/TASK-LIST.md`
2. **Filter** PENDING and IN_PROGRESS tasks (exclude COMPLETED)
3. **Display menu**:
   ```
   Select a task:
   1. [001] Add user authentication (PENDING)
   2. [002] Fix login bug (PENDING - blocked by 001)
   3. [005] Refactor API layer (IN_PROGRESS)

   Enter task number or ID:
   ```
4. **Accept** menu selection OR direct task ID from user input

### Step 2: Validation

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

### Step 3: State Detection

Determine task state based on TASK-LIST status and journal existence:

| TASK-LIST Status | Journal Exists? | State |
|------------------|-----------------|-------|
| PENDING | No | NEW |
| PENDING | Yes | CONTINUING (interrupted) |
| IN_PROGRESS | Yes | CONTINUING |
| IN_PROGRESS | No | CONTINUING (warn: no journal) |

### Step 4: Git Setup

**Detect default branch**:
```bash
git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
```
Fallback: try "main", then "master"

**For NEW tasks**:
1. Checkout default branch: `git checkout {default} && git pull`
2. Create feature branch: `git checkout -b feature/task-XXX-description`

**For CONTINUING tasks**:
1. Check local branch: `git branch --list feature/task-XXX-*`
2. If exists -> checkout
3. If not -> check remote: `git branch -r --list origin/feature/task-XXX-*`
   - Remote exists -> `git checkout -b feature/task-XXX-... origin/feature/task-XXX-...`
   - Neither exists -> Error: "Branch not found - task state corrupted"
4. Pull latest: `git pull`

### Step 5: PR Setup

**Check for existing PR**:
```bash
gh pr list --head {branch-name} --state open --json number,url
```

**If PR exists**: Record PR number and URL, continue (reuse existing)

**If no open PR**:
1. Check for closed/merged: `gh pr list --head {branch-name} --state all`
2. Create new draft PR:
   ```bash
   gh pr create --draft --title "Task XXX: {title}" --body "Work in progress for task XXX"
   ```
3. Record PR number and URL

### Step 6: Journal Setup

**For NEW tasks**:
1. Read task.md to get task type
2. Invoke journaling subagent to create journal:
   ```
   Create journal for task {XXX}.
   Phase: "Phase 1"
   Activity: "task started"
   Content: "Task {title} initialized. Task type: {type}.
             Dependencies verified as COMPLETED.
             Branch created: {branch}. PR created: #{pr_number}."
   Next action: "Begin Phase 1: Task Analysis following {type}-workflow.md"
   ```
3. Update TASK-LIST.md: Move task from PENDING to IN_PROGRESS

**For CONTINUING tasks**:
1. Check journal exists at `task-system/tasks/XXX/journal.md`
2. Read existing journal
3. Parse current phase from "## Current Phase" section
4. If journal missing (edge case):
   - Invoke journaling subagent to create journal with recovery context

### Step 7: Handoff

**For NEW tasks**:
```
Task XXX ready for execution.

Branch: feature/task-XXX-description
PR: #123 (draft)
Type: {type}

Read the workflow at: plugin's workflows/{type}-workflow.md
Ready to begin Phase 1: Task Analysis.
```

**For CONTINUING tasks**:
1. Read last 3-5 journal entries for context
2. Display current phase and last activity
3. Ready to continue from current phase

## Error Handling

| Error | Message |
|-------|---------|
| Task not found | "Task XXX not found in TASK-LIST" |
| Task completed | "Task XXX already completed" |
| Dependencies not met | "Blocked by: XXX (PENDING), YYY (IN_PROGRESS)" |
| Dirty working directory | "Uncommitted changes - commit or stash first" |
| Branch missing for IN_PROGRESS | "Branch not found - task state corrupted" |
| Workflow file missing | "No workflow found for type: XXX" |
