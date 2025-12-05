# Worktree Workflow Guide

This guide explains how to work on tasks using the worktree-based workflow system. All tasks use git worktrees for isolation.

## Overview

The worktree workflow provides each task with its own isolated workspace while sharing the same repository history. This enables:
- Clean separation between tasks
- Safe concurrent work on multiple tasks
- No branch switching confusion
- Independent working directories

## How It Works

### Starting a Task

From the **main repository**, say "start task" or "start task [ID]":

```
start task
```

This will:
1. Show available PENDING and IN_PROGRESS tasks
2. Check task dependencies
3. Create a new worktree in `task-system/worktrees/task-XXX-type/`
4. Set up the task with branch and PR
5. Update TASK-LIST.md with worktree marker
6. **Instruct you to open a new Claude session in the worktree**
7. **STOP** (you must open a new session to continue)

### Working in the Worktree

After the worktree is created:
1. Open a new terminal window/tab
2. Navigate to the worktree: `cd task-system/worktrees/task-XXX-type/`
3. Start Claude Code in that directory
4. Say "start task" to continue with the workflow
5. Work on the task following the phase-based workflow

### Completing a Task

From within the **worktree**, use complete-task:

```
/task-system:complete-task
```

This will:
- Clean CLAUDE.md (remove isolation instructions)
- Update TASK-LIST.md (move to COMPLETED)
- Finalize journal with Phase 8 entry
- Merge the PR
- **Instruct you to cleanup the worktree from main repo**

### Cleaning Up

From the **main repository**, say "cleanup worktree":

```
cleanup worktree for task XXX
```

This will:
- Remove the worktree directory
- Prune git references
- Update TASK-LIST.md (remove worktree marker)

## Multi-Task Concurrent Usage

### How Concurrent Work Functions

Each worktree operates as an independent workspace with its own:
- **Working directory**: Complete copy of the repository files
- **HEAD pointer**: Can be on different branches simultaneously
- **Git status**: Independent staging area and working tree state
- **Process isolation**: No conflicts between terminal sessions

### Terminal Management

```bash
# Terminal 1: Feature development
cd task-system/worktrees/task-013-feature
claude
# Work on feature implementation...

# Terminal 2: Bug fix (simultaneously)
cd task-system/worktrees/task-015-bugfix
claude
# Fix urgent bug without affecting feature work...

# Terminal 3: Main repository
cd /path/to/project
claude
# Start new tasks, cleanup completed worktrees...
```

### Safe Concurrent Operations

**Safe to do concurrently:**
- Commit, push, pull in different worktrees
- Run tests in different worktrees
- Edit different files in different worktrees
- Create PRs from different branches

**Requires coordination:**
- Merging PRs (one at a time to avoid conflicts)
- Updating main branch (coordinate timing)
- Working on dependent tasks (respect dependencies)

### Memory and Performance

- **Efficient**: Worktrees share the same `.git` repository data
- **Low overhead**: Only working files are duplicated, not git history
- **Scalable**: Can have 3-5+ concurrent worktrees without performance issues
- **No conflicts**: Each terminal operates independently

## Common Scenarios

### Scenario 1: Feature + Bug Fix

```bash
# Terminal 1: Start feature from main repo
cd /path/to/project
claude
> start task 009

# Open worktree session
cd task-system/worktrees/task-009-feature
claude
> start task

# Terminal 2: Urgent bug fix comes in
cd /path/to/project
claude
> start task 010

# Open worktree session
cd task-system/worktrees/task-010-bugfix
claude
> start task
```

### Scenario 2: Blocked on Review

```bash
# Complete Phase 6 in task 009, PR ready for review
# While waiting, start another task from main repo
cd /path/to/project
claude
> start task 011
```

### Scenario 3: Multiple Small Tasks

```bash
# Start several tasks from main repo
cd /path/to/project
claude
> start task 012
# Open worktree, work on it...

> start task 013
# Open worktree, work on it...

> start task 014
# Open worktree, work on it...
```

## Best Practices

### Organization
- **One Terminal Per Task**: Keep terminals dedicated to specific tasks
- **Clear Naming**: Worktrees use descriptive names `task-XXX-type`
- **Regular Commits**: Commit frequently to avoid conflicts

### Task Selection
- **Check Dependencies**: Ensure task dependencies are COMPLETED
- **Independent Tasks**: Choose tasks that don't conflict with each other
- **Resource Consideration**: Limit concurrent worktrees based on system resources

### Workflow Management
- **Phase Discipline**: Follow the phase-based workflow in each worktree
- **Regular Syncing**: Pull main branch updates regularly

## Worktree Isolation

When working in a worktree, remember:
- **This IS your root directory** - treat it as such
- **No parent access** - never use `../` paths
- **No absolute paths** to main repo
- **All operations relative** to worktree root

The CLAUDE.md in each worktree contains isolation instructions that are automatically removed during task completion.

## Troubleshooting

### "Task already active in worktree"
- Task is being worked on in an existing worktree
- Check `task-system/worktrees/` for the worktree
- Resume work in that worktree's directory

### "Worktree already exists"
- Previous worktree wasn't cleaned up
- Remove manually: `git worktree remove task-system/worktrees/task-XXX-type`
- Or use: `cleanup worktree for task XXX` from main repo

### Finding Active Worktrees
```bash
git worktree list
```
Shows all active worktrees and their locations.

### Cleaning Up Stale Worktrees
```bash
git worktree prune
```
Removes references to deleted worktrees.

### "Permission denied" or "Device busy"
```bash
# Usually means a process is still using the directory
# Check for running processes:
lsof +D task-system/worktrees/task-XXX-type

# Or force cleanup:
git worktree remove task-system/worktrees/task-XXX-type --force
```

### Memory Usage Concerns
```bash
# Check worktree status and size:
du -sh task-system/worktrees/*

# List all active worktrees:
git worktree list
```

## Workflow Summary

| Step | Location | Command/Action |
|------|----------|----------------|
| Start task | Main repo | "start task" or "start task [ID]" |
| Continue in worktree | Worktree | "start task" (after opening new session) |
| Complete task | Worktree | `/task-system:complete-task` |
| Cleanup | Main repo | "cleanup worktree for task XXX" |

## Important Notes

- **All tasks use worktrees** - there is no "regular" vs "parallel" workflow
- **Worktrees share git history** but have independent working directories
- **TASK-LIST.md tracking** shows which tasks are in worktrees with `[worktree: path]`
- **Two-session workflow**: Main repo creates worktree, new session works in worktree
- **Cleanup is separate**: After completion, cleanup worktree from main repo
