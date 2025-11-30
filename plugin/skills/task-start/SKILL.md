---
name: task-start
description: ONLY activate on DIRECT user request to start a task. User must explicitly mention keywords: 'start task', 'begin task', 'work on task [ID]'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to start or resume a task.
---

# Task Start Skill

Prepares environment for task execution using git worktrees. Routes to the appropriate flow based on context.

## Step 1: Detect Context

Run the context detection script: `scripts/detect-context.sh`

## Step 2: Execute Flow

**Route based on script output:**

- Output "main" → Read and execute `main-repo-flow.md`
- Output "worktree" → Read and execute `worktree-flow.md`
