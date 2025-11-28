# Performance Task Execution Workflow

> **Journal Guidelines**: The task-start skill initializes the journal structure. See [Journal Entry Guidelines](../journaling-guidelines.md) for when to journal, what to include, and how to invoke the journaling subagent. For performance tasks, include specific metrics (X% faster, Y MB saved) in entries.

## Phase 1: Task Analysis

**Prerequisites**: Git setup and journal initialization completed by task-start skill

### Task Analysis

1. Read entire task file thoroughly
2. Review all dependencies are COMPLETED
3. Analyze performance requirements and target metrics
4. Review existing sub-tasks in task file
5. Identify ambiguities or concerns about performance goals
6. **Journal**: Phase 1 completion (see [guidelines](../journaling-guidelines.md))
7. **Commit and push initial work**: `git add . && git commit -m "docs(task-XXX): initial task analysis and journal setup" && git push`

### Exit Criteria

- Clear understanding of performance goals documented
- Target metrics identified
- Initial commit made

> **Phase Transition**: See [Phase Transition Rules](./phase-transition-rules.md)

**Request permission to proceed to Phase 2**

## Phase 2: Performance Analysis

1. Establish baseline performance measurements
2. Identify specific bottlenecks and performance issues
3. Analyze current resource usage (CPU, memory, I/O)
4. Profile code to understand hotspots
5. Set specific, measurable performance targets
6. Evaluate optimization opportunities and their potential impact
7. Consider risks and tradeoffs of different optimization approaches
8. **Journal**: Phase 2 completion (see [guidelines](../journaling-guidelines.md) - include specific metrics)
9. **Commit and push analysis work**: `git add . && git commit -m "docs(task-XXX): complete performance analysis and optimization planning" && git push`
10. **Consider review request**: For major performance optimizations, ask user if they want to review the analysis

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
6. **Journal**: Phase 3 completion (see [guidelines](../journaling-guidelines.md) - include baseline metrics)
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
3. **Commit optimizations individually with metrics**:
   - `perf(task-XXX): optimize [specific operation] - [X% improvement]` && git push
   - `perf(task-XXX): reduce memory usage in [component] - [Y MB saved]` && git push
4. If performance degrades or targets aren't met:
   - Document the results
   - Roll back that specific optimization
   - Try alternative approaches
5. Monitor for functional regressions with each change
6. Work through sub-tasks from task file methodically
7. **Journal** (for significant optimizations - see [guidelines](../journaling-guidelines.md), include metrics)
8. Check off completed sub-tasks in task file
9. Continue until performance targets are met
10. **Journal**: Phase 4 completion (see [guidelines](../journaling-guidelines.md) - include specific metrics vs baseline)
11. **Consider mid-phase review**: For complex optimizations, ask user if they want to review progress

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
7. **Journal**: Phase 5 completion (see [guidelines](../journaling-guidelines.md) - include final metrics vs baseline vs targets)
8. **Commit validation work**: `git add . && git commit -m "test(task-XXX): validate performance improvements and stability" && git push`

### Exit Criteria

- Performance targets met and validated
- No regressions in other areas
- System stability confirmed
- Validation results documented

**Request permission to proceed to Phase 6**

## Phase 6-7: Verification & Reflection

> **Complete Checklist**: See [Verification Checklist](./verification-checklist.md)

### Phase 6: Performance-Specific Checks

1. Verify all performance objectives from task file achieved
2. **Confirm no functionality was compromised** for performance
3. Update documentation with performance characteristics
4. Run final code quality checks
5. Mark PR ready for review

**Request permission to proceed to Phase 7**

### Phase 7: Performance Reflection

1. Review entire optimization journey
2. **Journal**: Phase 7 completion (see [guidelines](../journaling-guidelines.md))

**Request permission to complete task**

## Phase 8: Task Completion

> **Completion Process**: See [Completion Protocol](./completion-protocol.md)

After completing Phase 7, run:
```bash
/task-system:complete-task
```

Before running, review if any additional performance tasks should be created.

## Important Rules

- **NEVER sacrifice functionality** for performance
- **Measure everything**: Performance impact of every change must be measured
- **Incremental optimization**: Make small, measurable commits
- **Benchmark modification**: See [Test Modification Protocol](./test-modification-protocol.md) - apply to benchmarks
- **Phase Progression**: See [Phase Transition Rules](./phase-transition-rules.md)
- **Documentation**: Document baseline and target metrics clearly
- **Stability validation**: Validate stability after optimizations
- **PR Reviews**: See [PR Review Protocol](./pr-review-protocol.md)

## Error Handling

When encountering issues:

### 1. Performance Targets Not Met
- Document which optimizations were attempted
- Analyze why targets weren't achievable
- Discuss revised targets or alternative approaches with user

### 2. Optimization Causes Regressions
- Roll back the problematic optimization immediately
- Document what went wrong
- Try alternative optimization strategies

### 3. Unclear Performance Requirements
- Document what is unclear about targets
- Request specific metrics and acceptable ranges
- Don't optimize without clear success criteria

### 4. Complex Bottlenecks
- Document the complexity discovered
- Present multiple optimization strategies to user
- Discuss tradeoffs and resource requirements

## Benchmark Modification Protocol

> **Base Protocol**: See [Test Modification Protocol](./test-modification-protocol.md)

Apply the test modification protocol to benchmark changes. After Phase 3, if benchmarks need modification:

1. **Journal**: Benchmark modification request (see [guidelines](../journaling-guidelines.md) - include performance reasoning)
2. Explain to user with performance reasoning
3. Wait for explicit permission
4. Update baselines appropriately when approved

## PR Review Workflow

> **Full Protocol**: See [PR Review Protocol](./pr-review-protocol.md)

**Proactive review requests** when:
- Setting performance targets and optimization strategy
- Completing phases 2, 3, 5, 6
- Discovering significant architectural performance issues
- Finding tradeoffs between performance and maintainability
- Hitting diminishing returns on optimization efforts
