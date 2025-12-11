# Worktree Workflow Guide

This guide explains how to work on tasks using the worktree-based workflow system. All tasks use git worktrees for isolation.

## Overview

The worktree workflow provides each task with its own isolated workspace while sharing the same repository history. This enables:
- Clean separation between tasks
- Safe concurrent work on multiple tasks
- No branch switching confusion
- Independent working directories

## How It Works

### Task Creation

When tasks are created (via `task-generation` or `task-creation` skills), each task gets:
- A worktree in `task-system/tasks/NNN/`
- A branch named `task-NNN-{type}`
- A draft PR on GitHub

### Starting a Task

From the **main repository**, say "start task" or "start task [ID]":

```
start task 015
```

This will:
1. Check if worktree exists for the task
2. Provide instructions to navigate to the worktree
3. **You open a new Claude session in the worktree**

### Working in the Worktree

After navigating to the worktree:
1. Open a new terminal window/tab
2. Navigate to the worktree: `cd task-system/tasks/NNN/`
3. Start Claude Code in that directory
4. Say "start task NNN" to begin the workflow
5. Work on the task following the phase-based workflow

### Completing a Task

From within the **worktree**, after completing all workflow phases and receiving permission, the task-completer subagent is automatically invoked. This handles:
- Cleaning CLAUDE.md (remove isolation instructions)
- Adding completion journal entry
- Verifying PR readiness
- Merging the PR
- Displaying cleanup instructions

### Cleaning Up

From the **main repository**, say "cleanup worktree":

```
cleanup worktree for task 015
```

This will:
- Remove the worktree directory
- Prune git references

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
cd task-system/tasks/013
claude
# Work on feature implementation...

# Terminal 2: Bug fix (simultaneously)
cd task-system/tasks/015
claude
# Fix urgent bug without affecting feature work...

# Terminal 3: Main repository
cd /path/to/project
claude
# Check task status, cleanup completed worktrees...
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
# Terminal 1: Start feature - navigate to existing worktree
cd task-system/tasks/009
claude
> start task 009

# Terminal 2: Urgent bug fix comes in
cd task-system/tasks/010
claude
> start task 010
```

### Scenario 2: Blocked on Review

```bash
# Complete Phase 6 in task 009, PR ready for review
# While waiting, start another task in different worktree
cd task-system/tasks/011
claude
> start task 011
```

### Scenario 3: Resume from Another Machine

```bash
# From main repo on new machine
cd /path/to/project
claude
> resume task 012
# Creates local worktree from remote branch

cd task-system/tasks/012
claude
> start task 012
```

## Best Practices

### Organization
- **One Terminal Per Task**: Keep terminals dedicated to specific tasks
- **Clear Naming**: Worktrees use descriptive names `task-system/tasks/NNN`
- **Regular Commits**: Commit frequently to avoid conflicts

### Task Selection
- **Check Dependencies**: Dependencies are advisory (warn if not merged)
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

The CLAUDE.md in each worktree may contain isolation instructions that are automatically removed during task completion.

## Troubleshooting

### "Task has no worktree"
- Task may exist remotely but not locally
- Use "resume task NNN" to create local worktree from remote

### "Worktree already exists"
- Navigate to existing worktree to continue work
- Or cleanup and recreate if needed

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
lsof +D task-system/tasks/NNN

# Or force cleanup:
git worktree remove task-system/tasks/NNN --force
```

### Memory Usage Concerns
```bash
# Check worktree status and size:
du -sh task-system/tasks/*

# List all active worktrees:
git worktree list
```

## Workflow Summary

| Step | Location | Command/Action |
|------|----------|----------------|
| Create task | Main repo | "create task" or "generate tasks" |
| Start working | Worktree | cd task-system/tasks/NNN && claude |
| Begin workflow | Worktree | "start task NNN" |
| Complete task | Worktree | Grant permission after Phase 7 (automatic completion) |
| Cleanup | Main repo | "cleanup worktree for task NNN" |

## Important Notes

- **Tasks created with worktrees** - each task has worktree, branch, and PR from creation
- **Worktrees share git history** but have independent working directories
- **Task status derived dynamically** - use "list tasks" to see current status
- **Resume remote tasks** - use "resume task NNN" to create local worktree
- **Cleanup is separate** - after completion, cleanup worktree from main repo
