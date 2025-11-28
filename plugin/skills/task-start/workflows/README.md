# Task Execution Workflows

This directory contains complete execution workflows for each task type in the Claude Task System.

## Quick Start: Which Workflow Do I Use?

Choose the workflow that matches your task type:

| Task Type | Workflow File | Use When... |
|-----------|---------------|-------------|
| **feature** | [feature-workflow.md](./feature-workflow.md) | Building new functionality or capabilities |
| **bugfix** | [bugfix-workflow.md](./bugfix-workflow.md) | Fixing errors, defects, or incorrect behavior |
| **refactor** | [refactor-workflow.md](./refactor-workflow.md) | Improving code quality without changing behavior |
| **performance** | [performance-workflow.md](./performance-workflow.md) | Optimizing speed, memory, or resource usage |
| **deployment** | [deployment-workflow.md](./deployment-workflow.md) | Infrastructure, deployment, or operational tasks |

## Workflow Structure

Each workflow follows the **8-Phase Execution Discipline**:

1. **Task Analysis** - Understand requirements and dependencies
2. **Solution Design** - Plan technical approach and architecture
3. **Test Creation (TDD)** - Write tests before implementation
4. **Implementation** - Build functionality to pass tests
5. **Refactor** - Improve code quality and maintainability
6. **Verification & Polish** - Validate acceptance criteria and quality
7. **Reflection** - Document learnings and insights
8. **Completion** - Merge PR and finalize task

## Shared Protocols

All workflows reference common protocols in this directory:

- **[PR Review Protocol](./pr-review-protocol.md)** - Handling PR feedback
- **[Test Modification Protocol](./test-modification-protocol.md)** - Rules for changing tests
- **[Journal Guidelines](../journaling-guidelines.md)** - Writing effective journal entries
- **[Completion Protocol](./completion-protocol.md)** - Phase 8 completion steps
- **[Verification Checklist](./verification-checklist.md)** - Phase 6-7 checks
- **[Phase Transition Rules](./phase-transition-rules.md)** - Permission gates

## Key Differences Between Workflows

### Feature Workflow
- Standard 8-phase progression
- Emphasis on solution design and architecture
- Optional Task Analyzer subagent for Phases 1-2

### Bugfix Workflow
- Phase 2: **Bug Investigation** (reproduce, identify root cause)
- Phase 3: Write test that **reproduces the bug** (must fail)
- Phase 4: **Minimal fix** implementation only
- Phase 5: **Validation & edge cases** instead of general refactoring
- **Critical rule**: Never expand scope beyond the specific bug

### Refactor Workflow
- Phase 2: **Code Analysis** (identify tech debt, review coverage)
- Phase 3: **Safety Net Creation** (baseline tests for refactor areas)
- Phase 4: **Incremental refactoring** (small commits, continuous testing)
- Phase 5: **Quality Validation** (verify metrics improved)
- **Critical rule**: Never change behavior, only structure

### Performance Workflow
- Phase 2: **Performance Analysis** (baselines, profiling, bottlenecks)
- Phase 3: **Benchmark Test Creation** (establish metrics, thresholds)
- Phase 4: **Performance Implementation** (measure each optimization)
- Phase 5: **Performance Validation** (verify targets met)
- **Commit pattern**: Include performance metrics in messages
- **Critical rule**: Never sacrifice functionality for speed

### Deployment Workflow
- **Different structure**: Deployment-specific phases, not standard 8
- **AWS-focused**: Infrastructure and application deployment
- **Responsibility split**: User handles console, agent verifies via CLI
- **No TDD**: Deployment verification instead
- **Includes**: Rollback procedures, cost monitoring, security

## How to Use This Directory

### Starting a Task

When you start a task (via the `task-start` skill), the system:

1. Reads the task type from the task file
2. References the appropriate workflow file
3. Guides you through the 8-phase discipline

### During Execution

- Keep the workflow file open as reference
- Follow each phase sequentially
- Check exit criteria before requesting permission to proceed
- Reference shared protocols when needed

### Maintaining Workflows

When updating workflows:

- **Type-specific changes**: Edit the individual workflow file
- **Changes affecting all types**: Update the shared protocol instead
- **Breaking changes**: Document in commit message
- **Test impact**: Verify with a sample task execution

## Philosophy

These workflows embody disciplined software development:

- **Test-Driven Development**: Tests before implementation (non-negotiable)
- **Permission Gates**: User approval required between phases
- **Continuous Documentation**: Journaling subagent documents decisions throughout
- **Quality Focus**: Verification and reflection built into process
- **Type-Specific Guidance**: Workflows adapted to task context

## Questions?

- **"Can I skip phases?"** No. Sequential execution prevents costly mistakes.
- **"Can I modify tests?"** Only with explicit user permission after Phase 3.
- **"What if I'm blocked?"** Invoke journaling subagent to document blocker, present options to user.
- **"How do I handle PR feedback?"** Follow the PR Review Protocol.
- **"Can phases be combined?"** Yes, for Task Analyzer (Phases 1-2 combined).

## Related Documentation

- [TASK-LIST.md](../../../../task-system/tasks/TASK-LIST.md) - All tasks and their status
- [Parallel Workflow Guide](./parallel-workflow-guide.md) - Concurrent execution
- [Task Template](../../../templates/execution/task-template.md) - Task file structure
