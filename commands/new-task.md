# new-task

Intelligently creates a comprehensive task definition from user description through interactive analysis and clarification.

## What it does

1. **Analyzes task description**: Deeply understands user's request and project context
2. **Generates comprehensive task**: Creates complete objectives, sub-tasks, technical approach, risks, and acceptance criteria
3. **Interactive clarification**: Asks questions to resolve ambiguities and discuss alternative approaches
4. **Iterative refinement**: Collaborates with user until task definition is complete and ready for execution

## Usage

### Initial Input

```
Task Description: [User provides detailed description of what needs to be accomplished]
```

### Interactive Process

The command will:

1. **Analyze & Generate**: Create initial comprehensive task definition
2. **Present Draft**: Show generated objectives, sub-tasks, technical approach, etc.
3. **Identify Questions**: Highlight any ambiguities or areas needing clarification
4. **Discuss Approaches**: Present alternative solutions when multiple paths exist
5. **Refine Iteratively**: Update task based on user feedback and decisions
6. **Finalize**: Create task only when all aspects are clear and agreed upon

## Analysis Process

### 1. Context Understanding

- Review existing codebase patterns and architecture
- Identify relevant existing tasks and dependencies
- Understand project conventions and standards

### 2. Task Type Classification

- Analyze description to determine task type (feature/refactor/bugfix/performance/deployment)
- Select appropriate workflow template for task execution
- Consider task-type specific requirements and constraints

### 3. Task Decomposition

- Break down description into clear, measurable objectives
- Generate specific, actionable sub-tasks based on task type
- Identify technical requirements and constraints

### 4. Approach Evaluation

- Analyze multiple implementation strategies appropriate for task type
- Consider risks, complexity, and tradeoffs
- Evaluate dependency requirements

### 5. Clarification Identification

- Spot ambiguous requirements
- Identify missing technical details
- Flag areas requiring architectural decisions

## Interactive Clarification

### Question Types

- **Scope clarification**: "Should this include X functionality?"
- **Technical approach**: "Would you prefer approach A (pros/cons) or B (pros/cons)?"
- **Priority tradeoffs**: "This could be simple but limited, or complex but flexible. Which direction?"
- **Dependency decisions**: "This requires changes to X. Should that be included or a separate task?"

### Discussion Flow

```
I need clarification on: [specific aspect]
I see two main approaches:
   A) [Approach description with pros/cons]
   B) [Alternative with pros/cons]

Which direction do you prefer, or do you see another approach?

Based on your input, I'll update:
   - Objectives: [specific changes]
   - Technical Approach: [refinements]
   - Sub-tasks: [additions/modifications]
```

## Final Task Creation

### Only when complete:

1. **ID Assignment**: Next sequential task number
2. **Directory Creation**: `task-system/tasks/XXX/task.md`
3. **Full Task File**: Complete task template with all sections populated, including determined task type
4. **Task List Update**: Add to PENDING in TASK-LIST.md with format: `XXX | P[1-3] | [task-type] | [Title] | [Brief Description]`
5. **Validation**: Verify task is ready for `start-task` command with appropriate workflow

## Output Example

```
Created Task 003: Implement Victory Retailer XML Support
Location: task-system/tasks/003/task.md

Generated Content:
   - 4 clear objectives with success criteria
   - 12 actionable sub-tasks
   - Complete technical approach with architectural decisions
   - Risk analysis with mitigation strategies
   - Comprehensive acceptance criteria

Ready: Task fully defined and ready for execution with 'start-task'
```

## Quality Standards

Generated tasks must have:

- **Correct task type classification** (feature/refactor/bugfix/performance)
- **Clear, measurable objectives** with specific success criteria appropriate for task type
- **Actionable sub-tasks** that can be individually completed
- **Detailed technical approach** with architectural considerations suited to task type
- **Realistic risk assessment** with mitigation strategies
- **Comprehensive acceptance criteria** for verification
- **Proper dependency identification** and sequencing

## Task Type Guidelines

### Feature Tasks

- Focus on new functionality and user value
- Emphasize acceptance criteria and user scenarios
- Include integration and end-to-end testing considerations

### Refactor Tasks

- Focus on code quality improvements without behavior changes
- Emphasize safety, incremental changes, and quality metrics
- Include test coverage analysis and behavior preservation

### Bugfix Tasks

- Focus on reproducing and fixing specific issues
- Emphasize minimal scope, root cause analysis, and regression prevention
- Include validation scenarios and edge case testing

### Performance Tasks

- Focus on measurable performance improvements
- Emphasize baseline metrics, optimization targets, and benchmarking
- Include load testing and performance monitoring considerations
