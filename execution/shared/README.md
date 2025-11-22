# Shared Task Execution Protocols

This directory contains common protocols and guidelines that apply across all task types.

## Purpose

These protocols are referenced by task-specific workflows to maintain consistency and reduce duplication. Each protocol defines standard procedures that must be followed regardless of task type.

## Available Protocols

### Core Workflow Protocols

- **[pr-review-protocol.md](./pr-review-protocol.md)** - How to handle PR feedback and reviews
- **[test-modification-protocol.md](./test-modification-protocol.md)** - Rules for changing tests after Phase 3
- **[phase-transition-rules.md](./phase-transition-rules.md)** - Permission gates and phase progression

### Documentation Guidelines

- **[journal-guidelines.md](./journal-guidelines.md)** - How to write effective journal entries
- **[completion-protocol.md](./completion-protocol.md)** - Phase 8 task completion steps
- **[verification-checklist.md](./verification-checklist.md)** - Phase 6-7 verification and reflection

## How to Use

Each task-specific workflow (in `execution/workflows/`) references these protocols at appropriate points. When a protocol applies, the workflow will link to the relevant file.

**Example**:
```markdown
## Phase 4: Implementation

...
3. If test modification seems necessary:
   - See: [Test Modification Protocol](../shared/test-modification-protocol.md)
...
```

## Maintenance

When updating these protocols:
- Changes apply to **all task types** automatically
- Review impact across all workflows before modifying
- Update version date at the top of the modified file
- Document breaking changes in commit message

## Philosophy

These shared protocols embody the core discipline of the task execution system:
- Test-Driven Development (TDD)
- Continuous documentation
- Phase-based progression with permission gates
- Systematic quality verification
