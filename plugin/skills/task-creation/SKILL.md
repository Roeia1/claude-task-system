---
name: task-creation
description: "ONLY activate on DIRECT user request to create a new task. User must explicitly mention keywords: 'new task', 'create task', 'add task'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to create a standalone task."
---

# Task Creation Skill

When activated, create a comprehensive task definition from user description through interactive analysis and clarification.

## File Locations

- **Task Template**: Read from plugin's `templates/execution/task-template.md`
- **Task Type Workflows**: Read from plugin's `skills/task-start/workflows/{type}-workflow.md`
  - `feature-workflow.md` - New functionality
  - `bugfix-workflow.md` - Error corrections
  - `refactor-workflow.md` - Code improvements
  - `performance-workflow.md` - Optimization
  - `deployment-workflow.md` - Infrastructure
- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Output**: `task-system/tasks/NNN/task.md`
- **Full Workflow**: Plugin's `commands/new-task.md`

## Process

### 1. Context Understanding

1. **Review codebase** patterns and architecture
2. **Identify relevant** existing tasks and dependencies
3. **Understand project** conventions and standards

### 2. Task Type Classification

1. **Analyze description** to determine task type
2. **Select appropriate workflow** template
3. **Read task type workflow** from plugin's `skills/task-start/workflows/{type}-workflow.md`
4. **Consider type-specific** requirements and constraints

### 3. Task Decomposition

1. **Break down description** into clear, measurable objectives
2. **Generate specific sub-tasks** based on task type
3. **Identify technical** requirements and constraints
4. **Evaluate approaches** appropriate for task type

### 4. Interactive Clarification

1. **Spot ambiguous** requirements
2. **Identify missing** technical details
3. **Flag areas** requiring architectural decisions
4. **Ask questions** to resolve ambiguities:
   - Scope clarification
   - Technical approach preferences
   - Priority tradeoffs
   - Dependency decisions
5. **Discuss alternatives** when multiple valid approaches exist

### 5. Task Generation

1. **Read template** from plugin's `templates/execution/task-template.md`
2. **Generate comprehensive task** with all sections populated:
   - Feature Context (if applicable)
   - Overview and motivation
   - Task Type classification
   - Priority (P1/P2/P3)
   - Dependencies
   - Objectives (measurable checkboxes)
   - Sub-tasks (actionable items)
   - Technical Approach
   - Risks & Concerns with mitigation
   - Resources & Links
   - Acceptance Criteria (testable)
3. **Iterative refinement** based on user feedback

### 6. Final Task Creation

**Only when task definition is complete**:

1. **Determine next task ID** from `task-system/tasks/TASK-LIST.md`
2. **Create task directory**: `task-system/tasks/NNN/`
3. **Write task.md** with all sections filled
4. **Update TASK-LIST.md**: Add to PENDING section with format:
   ```
   NNN | P[1-3] | [task-type] | [Title] | [Brief Description]
   ```
5. **Validate task** is ready for **task-start** skill

## Quality Standards

Generated tasks must have:

- **Correct task type** classification (feature/refactor/bugfix/performance/deployment)
- **Clear, measurable objectives** with specific success criteria
- **Actionable sub-tasks** individually completable
- **Detailed technical approach** with architectural considerations
- **Realistic risk assessment** with mitigation strategies
- **Comprehensive acceptance criteria** for verification
- **Proper dependency** identification and sequencing

## Task Type Guidelines

### Feature Tasks
- Focus on new functionality and user value
- Emphasize acceptance criteria and user scenarios
- Include integration and end-to-end testing

### Refactor Tasks
- Focus on code quality improvements without behavior changes
- Emphasize safety, incremental changes, quality metrics
- Include test coverage analysis and behavior preservation

### Bugfix Tasks
- Focus on reproducing and fixing specific issues
- Emphasize minimal scope, root cause analysis
- Include validation scenarios and regression prevention

### Performance Tasks
- Focus on measurable performance improvements
- Emphasize baseline metrics, optimization targets
- Include load testing and performance monitoring

## Next Steps

After task creation, suggest using the **task-start** skill to begin execution.

## References

- Complete workflow details: Plugin's `commands/new-task.md`
- Task template: Plugin's `templates/execution/task-template.md`
- Task type workflows: Plugin's `skills/task-start/workflows/`
