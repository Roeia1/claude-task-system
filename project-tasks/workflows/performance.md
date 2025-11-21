# Performance Task Execution Workflow

## Journal Structure

Initialize journal with:

```markdown
# Task #[NUMBER]: [TITLE]

## Current Phase: Phase 1 - Task Analysis

## Git References

- **Branch**: performance/task-XXX-description
- **PR**: #XXX - [PR Title]
- **Base Branch**: main

## Task Understanding

[Filled after analysis]

## Performance Analysis

[Filled in Phase 2]

## Benchmark Strategy

[Filled in Phase 3]

## Optimization Implementation

[Filled in Phase 4]

## Performance Validation

[Filled in Phase 5]

## Progress Log

[Updated throughout with timestamped entries]

## Key Learnings

[Updated throughout]
```

## Phase 1: Task Analysis

**Prerequisites**: Git setup and journal initialization completed by start-task command

### Task Analysis

1. Read entire task file thoroughly
2. Review all dependencies are COMPLETED
3. Analyze performance requirements and target metrics
4. Review existing sub-tasks in task file
5. Document understanding in journal
6. Identify ambiguities or concerns about performance goals
7. **Commit and push initial work**: `git add . && git commit -m "docs(task-XXX): initial task analysis and journal setup" && git push`

### Exit Criteria

- Clear understanding of performance goals documented
- Target metrics identified
- Initial commit made

**Request permission to proceed to Phase 2**

## Phase 2: Performance Analysis

1. Establish baseline performance measurements
2. Identify specific bottlenecks and performance issues
3. Analyze current resource usage (CPU, memory, I/O)
4. Profile code to understand hotspots
5. Set specific, measurable performance targets
6. Evaluate optimization opportunities and their potential impact
7. Consider risks and tradeoffs of different optimization approaches
8. **Commit and push analysis work**: `git add . && git commit -m "docs(task-XXX): complete performance analysis and optimization planning" && git push`
9. **Consider review request**: For major performance optimizations, ask user if they want to review the analysis

### Exit Criteria

- Baseline performance documented
- Bottlenecks identified
- Optimization targets set
- Analysis committed

**Request permission to proceed to Phase 3**

## Phase 3: Benchmark Test Creation

1. Create comprehensive performance test suite
2. Establish benchmark tests for current baseline metrics
3. Define success criteria thresholds for optimizations
4. Include tests for:
   - Throughput measurements
   - Latency benchmarks
   - Resource usage monitoring
   - Load testing scenarios
5. Verify benchmarks accurately reflect real-world usage
6. Document baseline performance metrics in tests
7. **Commit and push benchmark suite**: `git add . && git commit -m "test(task-XXX): add performance benchmark suite with baseline metrics" && git push`
8. **Consider review request**: For complex performance testing strategies

### Exit Criteria

- Comprehensive benchmark suite created
- Baseline metrics documented
- Success criteria defined
- Benchmarks committed

**Request permission to proceed to Phase 4**

## Phase 4: Performance Implementation

1. Apply performance optimizations incrementally
2. **Measure impact after each optimization**: Run benchmarks to verify improvements
3. **Commit optimizations individually**: 
   - `perf(task-XXX): optimize [specific operation] - [X% improvement]` && git push
   - `perf(task-XXX): reduce memory usage in [component] - [Y MB saved]` && git push
4. If performance degrades or targets aren't met:
   - Document the results
   - Roll back that specific optimization
   - Try alternative approaches
5. Monitor for functional regressions with each change
6. Work through sub-tasks from task file methodically
7. Update journal with:
   - Optimization decisions and rationale
   - Performance measurements achieved
   - Challenges encountered
8. Check off completed sub-tasks in task file
9. Continue until performance targets are met
10. **Consider mid-phase review**: For complex optimizations, ask user if they want to review progress

### Exit Criteria

- Performance targets achieved
- All optimizations implemented and measured
- No functional regressions introduced
- Implementation completed

**Request permission to proceed to Phase 5**

## Phase 5: Performance Validation

1. Run complete performance test suite
2. Compare final metrics against baseline and targets
3. Verify performance improvements across different scenarios:
   - Various load levels
   - Different data sizes
   - Edge case conditions
4. Test for performance regressions in non-optimized areas
5. Validate memory usage and resource consumption
6. Run stress tests to ensure stability under load
7. Document comprehensive performance validation results
8. **Commit validation work**: `git add . && git commit -m "test(task-XXX): validate performance improvements and stability" && git push`

### Exit Criteria

- Performance targets met and validated
- No regressions in other areas
- System stability confirmed
- Validation results documented

**Request permission to proceed to Phase 6**

## Phase 6: Verification & Polish

1. Verify all performance objectives from task file achieved
2. Ensure all sub-tasks are checked off
3. Review entire optimization against performance requirements
4. Confirm no functionality was compromised
5. Update documentation with performance characteristics
6. Ensure code follows project conventions
7. Run final code quality checks: `pnpm check` (or equivalent)
8. Document verification results in journal
9. **Commit and push final polish**: `git add . && git commit -m "docs(task-XXX): final verification and polish" && git push`
10. **Mark PR ready for review**: Convert from draft to ready for review
11. **Proactive review request**: Ask user to review for final approval

### Exit Criteria

- All objectives verified
- Performance improvements polished
- PR ready for review

**Request permission to proceed to Phase 7**

## Phase 7: Reflection & Documentation

1. Review entire performance optimization journey
2. Update task file with:
   - Performance insights discovered
   - Additional optimization opportunities found
   - Lessons learned about system bottlenecks
3. Final journal entry summarizing:
   - Performance improvements accomplished
   - Optimization techniques used
   - Challenges overcome
   - Future performance considerations
4. **Exit Criteria**: Complete documentation updated
5. **Request permission to complete task**

## Phase 8: Task Completion

After completing Phase 7 reflection and documentation, run the appropriate completion command:

**For regular workflow (main repository)**:
```
/project:complete-task
```

**For parallel workflow (in worktree)**:
```
/project:parallel-finalize-task
# Then from main repo: /project:parallel-cleanup-worktree
```

### What the command does:

1. **Commits any final changes** in your working directory
2. **Verifies PR is ready** (all checks passing, no conflicts)
3. **Merges the PR** automatically
4. **Updates task status** to COMPLETED in TASK-LIST.md
5. **Finalizes journal** with completion entry
6. **Cleans up** (removes worktree for parallel tasks)

### Before running:

- Ensure all sub-tasks in task file are marked complete
- Review if any additional performance tasks should be created
- Make sure you're ready for the PR to be merged

**Phase 8 is now a single command - no manual steps required!**

## Journal Entry Guidelines

### When to Update:

- Phase transitions
- Each optimization attempt
- Performance measurement results
- Bottleneck discoveries
- Optimization decisions
- Validation findings

### Entry Format:

```markdown
### [Timestamp] - [Phase/Activity]

[Content describing optimization approach, measurements, decisions]
**Performance Impact:** [Specific metrics: X% faster, Y MB less memory, etc.]
**Next:** [What you plan to optimize next]
```

## Important Rules

- NEVER sacrifice functionality for performance
- NEVER proceed to next phase without user permission
- Measure performance impact of every change
- Make incremental optimizations with individual commits
- Document baseline and target metrics clearly
- Validate stability after optimizations
- Address PR reviews immediately when user signals

## Error Handling

When encountering issues:

1. **Performance Targets Not Met**:

   - Document which optimizations were attempted
   - Analyze why targets weren't achievable
   - Discuss revised targets or alternative approaches with user

2. **Optimization Causes Regressions**:

   - Roll back the problematic optimization immediately
   - Document what went wrong
   - Try alternative optimization strategies

3. **Unclear Performance Requirements**:

   - Document what is unclear about targets
   - Request specific metrics and acceptable ranges
   - Don't optimize without clear success criteria

4. **Complex Bottlenecks**:
   - Document the complexity discovered
   - Present multiple optimization strategies to user
   - Discuss tradeoffs and resource requirements

## PR Review Workflow

**IMMEDIATELY READ**: `/home/roei/projects/Titinski/project-tasks/workflows/shared/pr-review-workflow.md`

**Follow the standard PR Review Workflow from that file exactly.**

### Proactive Review Requests

Ask user "Should I request a review to [specific purpose]?" when:

- Setting performance targets and optimization strategy
- Completing phases 2, 3, 5, 6 (analysis, benchmarks, validation, verification)
- Discovering significant architectural performance issues
- Finding tradeoffs between performance and maintainability
- Hitting diminishing returns on optimization efforts

### Review Documentation

After each review session, add to journal:

```markdown
### [Timestamp] - PR Review Response

**Comments addressed**: [number]
**Changes made**: [summary of optimization adjustments]
**Performance impact**: [how changes affected metrics]
**Discussions started**: [topics requiring clarification]
**Next**: [what to optimize next]
```

## Benchmark Modification Protocol

**READ FIRST**: `/home/roei/projects/Titinski/project-tasks/workflows/shared/test-modification-protocol.md`

**Apply the protocol from that file to benchmark changes.**

After Phase 3, if benchmarks need modification:

1. Document in journal:
   - Which benchmark needs changing
   - Why current benchmark is inadequate
   - How the change affects baseline measurements
2. Explain to user with performance reasoning
3. Wait for explicit permission
4. Update baselines appropriately when approved