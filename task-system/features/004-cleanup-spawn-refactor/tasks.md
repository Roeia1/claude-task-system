# Tasks for Feature 004: Unified Cleanup Spawn Using claude-spawn Script

Generated from: plan.md
**Generated**: 2025-12-22

## Task List

| ID  | Title                                      | Type     | Priority | PR  |
| --- | ------------------------------------------ | -------- | -------- | --- |
| 011 | Unify cleanup spawn to use claude-spawn.sh | refactor | P1       | #21 |

## Dependencies

```mermaid
graph TD
    011[Task 011: Unify cleanup spawn]
```

No dependencies - single task implementation.

## Scope

This single task covers all phases from the technical plan:

1. **Phase 1**: Update task-cleanup/SKILL.md to use claude-spawn.sh
2. **Phase 2**: Remove obsolete spawn-cleanup.sh script
3. **Phase 3**: Update related documentation (CLAUDE.md, task-completer.md)

## Files Affected

- `plugin/skills/task-cleanup/SKILL.md` - Update spawn invocation
- `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh` - Delete
- `CLAUDE.md` - Update references
- `plugin/agents/task-completer.md` - Update references
