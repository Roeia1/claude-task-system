# Task #010: Implement claude-spawn.sh and integrate with task-start

## Git References

- **Branch**: task-010-feature
- **PR**: Pending
- **Base Branch**: master

## Current Phase: Phase 1 - Test Creation

## Progress Log

### 2025-12-22 05:44 - Task Started

Task initialized: Implement claude-spawn.sh and integrate with task-start.

Task type: feature. No dependencies - this is a foundational task.
Branch: task-010-feature. PR draft exists.

This task creates a generic utility script `claude-spawn.sh` that enables seamless handoff to a new Claude session in a different directory using tmux. The goal is to eliminate manual navigation when starting tasks from the wrong location.

Key deliverables:
1. Create plugin/scripts/claude-spawn.sh with argument validation, tmux detection, spawn logic
2. Modify detect-context.sh to return worktree path for requested task
3. Modify task-start SKILL.md to invoke spawn on not_in_worktree error
4. Create comprehensive test suite

**Next:** Begin Phase 1: Test Creation following feature-workflow.md - write failing tests for claude-spawn.sh
