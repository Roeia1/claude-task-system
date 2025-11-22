# Parallel Task Workflow Guide

This guide explains how to work on multiple tasks simultaneously using the parallel workflow system.

## Overview

The parallel workflow allows developers to work on multiple independent tasks concurrently using git worktrees. Each task gets its own isolated workspace while sharing the same repository history.

## When to Use Parallel Workflow

**Use parallel workflow when:**
- Working on multiple independent tasks
- Waiting for PR reviews on one task while starting another
- Switching between feature development and bug fixes
- Managing multiple small tasks efficiently

**Use regular workflow when:**
- Tasks have dependencies on each other
- Working on a single focused task
- Collaborating closely with others on the same task
- New to the project (start simple)

## Getting Started

### Starting a Parallel Task

```bash
/project:parallel-start-task
```

This command will:
1. Show available PENDING tasks
2. Check task dependencies
3. Create a new worktree in `worktrees/task-XXX-type/`
4. Set up the task with branch and PR
5. Update TASK-LIST.md with worktree marker

### Working in Parallel

After starting a parallel task:
1. Open a new terminal window/tab
2. Navigate to the worktree: `cd worktrees/task-XXX-feature/`
3. Work on the task following the normal phase-based workflow
4. Keep each terminal dedicated to its task

### Completing a Parallel Task

Parallel task completion is a two-step process:

#### Step 1: Finalize (from worktree)
```bash
# Interactive mode - shows menu of worktree tasks
/project:parallel-finalize-task

# Direct mode - specify task ID
/project:parallel-finalize-task 013
```

This will finalize documentation and merge the PR.

#### Step 2: Cleanup (from main repository)
```bash
# From main repository
/project:parallel-cleanup-worktree 013
```

This will remove the worktree and clean up references.

## Best Practices

### Organization
- **One Terminal Per Task**: Keep terminals dedicated to specific tasks
- **Clear Naming**: Use descriptive branch names for easy identification
- **Regular Commits**: Commit frequently to avoid conflicts

### Task Selection
- **Check Dependencies**: Ensure task dependencies are COMPLETED
- **Independent Tasks**: Choose tasks that don't conflict with each other
- **Resource Consideration**: Limit parallel tasks based on system resources

### Workflow Management
- **Phase Discipline**: Follow the phase-based workflow in each worktree
- **Journal Updates**: Keep task journals updated in each worktree
- **Regular Syncing**: Pull main branch updates regularly

## Common Scenarios

### Scenario 1: Feature + Bug Fix
```bash
# Terminal 1: Working on feature
/project:parallel-start-task 009

# Terminal 2: Urgent bug fix comes in
/project:parallel-start-task 010
```

### Scenario 2: Blocked on Review
```bash
# Complete Phase 6, PR ready for review
# While waiting, start another task
/project:parallel-start-task 011
```

### Scenario 3: Multiple Small Tasks
```bash
# Work on several small refactoring tasks
/project:parallel-start-task  # Choose task 1
/project:parallel-start-task  # Choose task 2
/project:parallel-start-task  # Choose task 3
```

## Multi-Terminal Concurrent Usage

### How It Works
Each worktree operates as an independent workspace with its own:
- **Working directory**: Complete copy of the repository files
- **HEAD pointer**: Can be on different branches simultaneously  
- **Git status**: Independent staging area and working tree state
- **Process isolation**: No conflicts between terminal sessions

### Best Practices for Concurrent Development

#### Terminal Management
```bash
# Terminal 1: Feature development
cd worktrees/task-013-feature
# Work on feature implementation...

# Terminal 2: Bug fix (simultaneously)
cd worktrees/task-015-bugfix  
# Fix urgent bug without affecting feature work...

# Terminal 3: Main repository
cd /home/roei/projects/Titinski
# Review completed PRs, start new tasks...
```

#### Safe Concurrent Operations
✅ **Safe to do concurrently**:
- Commit, push, pull in different worktrees
- Run tests in different worktrees
- Edit different files in different worktrees
- Create PRs from different branches

⚠️ **Requires coordination**:
- Merging PRs (one at a time to avoid conflicts)
- Updating main branch (coordinate timing)
- Working on dependent tasks (respect dependencies)

#### Memory and Performance
- **Efficient**: Worktrees share the same `.git` repository data
- **Low overhead**: Only working files are duplicated, not git history
- **Scalable**: Can have 3-5+ concurrent worktrees without performance issues
- **No conflicts**: Each terminal operates independently

### Workflow Example: Two Developers, Same Machine

**Developer A (Terminal 1)**:
```bash
# Working on database schema
/project:parallel-start-task 009
cd worktrees/task-009-feature
# Phase-based development...
```

**Developer A (Terminal 2)**:
```bash
# Quick bug fix while waiting for schema review
/project:parallel-start-task 016  
cd worktrees/task-016-bugfix
# Fix and complete quickly...
/project:parallel-finalize-task

# Later, from main repository:
cd /home/roei/projects/Titinski
/project:parallel-cleanup-worktree 016
```

**No interference**: Both tasks progress independently, share same git repository efficiently.

### State Management
- **TASK-LIST.md tracking**: Prevents duplicate work on same task
- **Independent journals**: Each worktree maintains its own task progress
- **Branch isolation**: No branch switching conflicts between terminals
- **Clean completion**: Each task completes and cleans up independently

### Troubleshooting Multi-Terminal Issues

#### "Permission denied" or "Device busy"
```bash
# Usually means a process is still using the directory
# Check for running processes:
lsof +D worktrees/task-XXX-type

# Or force cleanup:
git worktree remove worktrees/task-XXX-type --force
```

#### Memory Usage Concerns
```bash
# Check worktree status and size:
du -sh worktrees/*

# List all active worktrees:
git worktree list
```

## Troubleshooting

### "Task already active in worktree"
- Task is being worked on in a parallel worktree
- Check `worktrees/` for the active worktree
- Resume work in that worktree's directory

### "Worktree already exists"
- Previous worktree wasn't cleaned up properly
- Remove manually: `git worktree remove worktrees/task-XXX-type`
- Then retry the parallel-start-task command

### Finding Active Worktrees
```bash
git worktree list
```
This shows all active worktrees and their locations.

### Cleaning Up Stale Worktrees
```bash
git worktree prune
```
Removes references to deleted worktrees.

## Regular vs Parallel Comparison

| Aspect | Regular Workflow | Parallel Workflow |
|--------|-----------------|-------------------|
| Location | Main repository | Separate worktree |
| Start Command | `/project:start-task` | `/project:parallel-start-task` |
| Complete Command | `/project:complete-task` | `/project:parallel-finalize-task` + `/project:parallel-cleanup-worktree` |
| Task Selection | Can use task ID or menu | Can use task ID or menu |
| Task Limit | One at a time | Multiple concurrent |
| Terminal Usage | Single terminal | Multiple terminals |
| Cleanup | None needed | Worktree removal |

## Important Notes

- Worktrees share git history but have independent working directories
- Each worktree has its own journal in `project-tasks/tasks/XXX/journal.md`
- TASK-LIST.md shows which tasks are in worktrees with `[worktree: path]`
- **NEW**: Task completion is now split into two commands:
  - `/project:parallel-finalize-task` - Run from within the worktree to merge PR
  - `/project:parallel-cleanup-worktree` - Run from main repository to remove worktree
- Regular start-task will detect and block parallel tasks

## Completing Parallel Tasks (Split Commands)

Due to Claude Code's scope limitations, parallel task completion is now a two-step process:

### Step 1: Finalize from Worktree
```bash
# From within the worktree
cd worktrees/task-XXX-type
/project:parallel-finalize-task

# This will:
# - Update documentation
# - Merge the PR
# - Provide cleanup instructions
```

### Step 2: Cleanup from Main Repository
```bash
# Open NEW Claude Code session in main repo
cd /home/roei/projects/Titinski
/project:parallel-cleanup-worktree XXX

# This will:
# - Remove the worktree
# - Clean up git references
```


## Summary

The parallel workflow enhances developer productivity by enabling concurrent task execution. Use it when working on independent tasks, but remember to maintain discipline with the phase-based workflow in each worktree. The automated completion commands handle all the complexity of managing multiple workspaces.