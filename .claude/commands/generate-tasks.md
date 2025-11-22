# generate-tasks

**Description**: Generate executable tasks from feature plan

## Purpose

This command analyzes a feature's definition and technical plan to generate a breakdown of executable tasks. It creates both a reference task list (tasks.md) in the feature directory and actual task files in the project-tasks system for execution.

## Usage

```bash
# Run from within a feature directory
cd planning/features/001-user-authentication
/project:generate-tasks

# Or from repo root (will detect/prompt for feature)
/project:generate-tasks
```

## What It Does

1. **Detects feature directory** and validates prerequisites
2. **Reads feature.md and plan.md** to understand requirements and technical approach
3. **AI generates task breakdown** following implementation phases
4. **Shows proposed tasks** for review and modification
5. **After approval**:
   - Creates `tasks.md` in feature directory (reference)
   - Creates individual task files in `execution/tasks/NNN/`
   - Updates `execution/TASK-LIST.md` with new PENDING tasks
6. **Links tasks back to feature** for traceability

## Command Logic

### Prerequisites

1. **Feature directory exists** with both feature.md and plan.md
2. **Tasks not already generated** (or user confirms regeneration)

### Process

1. **Detect and validate feature**
   - Check current directory or prompt for feature selection
   - Verify feature.md exists
   - Verify plan.md exists
   - Check if tasks.md already exists (warn if so)

2. **Read planning artifacts**
   - Parse feature.md for:
     * User stories and acceptance criteria
     * Functional requirements
     * Success metrics
   - Parse plan.md for:
     * Implementation phases
     * Technology choices
     * Data models and APIs
     * Testing strategy
     * Risk assessment

3. **Load task breakdown template**
   - Read `planning/templates/task-breakdown-template.md`
   - Use as structure guide

4. **AI-generated task breakdown**

   **Analysis Phase**:
   - Identify distinct work units from plan
   - Determine dependencies between units
   - Assess which tasks can be parallel
   - Map tasks to file changes

   **Task Generation Principles**:
   - One task per logical unit of work
   - Tasks should be completable in 1-2 days max
   - Each task tests one thing thoroughly
   - Clear, specific task descriptions
   - Explicit file paths for each task

   **Phase Organization**:

   **Phase 1: Setup & Foundation**
   - Project initialization
   - Database setup and migrations
   - Configuration and environment
   - Development tooling

   **Phase 2: Core Implementation**
   - Data models and entities
   - Business logic and services
   - Repository/data access layer
   - Core functionality

   **Phase 3: Integration**
   - API endpoints
   - External service integrations
   - Frontend integration (if applicable)
   - End-to-end workflows

   **Phase 4: Polish & Documentation**
   - Error handling improvements
   - Performance optimization
   - Documentation
   - Final testing and QA

5. **Parallelization analysis**

   Mark tasks as `[P]` if:
   - They modify different files
   - They have no data dependencies
   - They can be tested independently
   - They don't require sequential setup

   Example:
   ```markdown
   ### T003: Implement User Model [P]
   **Files**: src/models/user.ts
   **Parallelizable**: Yes (different files than T004)

   ### T004: Implement Session Model [P]
   **Files**: src/models/session.ts
   **Parallelizable**: Yes (different files than T003)
   ```

6. **Generate task breakdown document**

   Create tasks.md with:
   - Task summary (total count, effort estimate)
   - All tasks with details:
     * Task ID (T001, T002, etc.)
     * Title
     * Type (feature/refactor/bugfix)
     * Priority (P1/P2/P3)
     * Dependencies
     * Files affected
     * Description
     * Parallelizable marker
   - Execution order recommendations
   - Notes for implementation

7. **Show proposal to user**

   ```markdown
   ## Proposed Task Breakdown

   Total: 12 tasks
   Estimated effort: 2-3 weeks
   Parallelizable: 6 tasks

   Phase 1: Setup (2 tasks)
   - T001: Setup project structure and dependencies
   - T002: Create database schema and migrations

   Phase 2: Core (5 tasks, 3 parallelizable)
   - T003: Implement User model and repository [P]
   - T004: Implement Session model and repository [P]
   - T005: Implement AuthService (depends on T003, T004)
   - T006: Implement password hashing utilities [P]
   - T007: Implement JWT token generation

   Phase 3: Integration (3 tasks)
   - T008: Create login API endpoint
   - T009: Create logout API endpoint
   - T010: Create password reset flow

   Phase 4: Polish (2 tasks, parallelizable)
   - T011: Add comprehensive error handling [P]
   - T012: Write integration tests [P]

   Review this breakdown:
   [y] Looks good, create tasks
   [e] Edit tasks (merge/split/reorder)
   [n] Regenerate with different approach

   Your choice: [y/e/n]
   ```

8. **Interactive editing** (if user chooses 'e')

   ```
   Which tasks do you want to modify?

   [m] Merge tasks
   [s] Split a task
   [r] Reorder tasks
   [p] Change priority
   [d] Done editing

   Your choice: [m/s/r/p/d]
   ```

   Allow iterative refinement until user is satisfied

9. **Create tasks in execution system**

   For each task in the breakdown:

   a. **Determine next task ID**:
      - Read `execution/TASK-LIST.md`
      - Find highest task ID
      - Increment by 1

   b. **Create task directory**:
      ```bash
      mkdir -p execution/tasks/NNN/
      ```

   c. **Generate task.md** from template:
      - Use `execution/templates/TASK-TEMPLATE.md`
      - Fill in sections:
        * Feature Context (link to feature.md, plan.md, ADRs)
        * Overview (from task description)
        * Task Type
        * Priority
        * Dependencies (map TXXX to actual task IDs)
        * Objectives (from acceptance criteria)
        * Sub-tasks (break down further if needed)
        * Technical Approach (from plan.md)
        * Risks & Concerns (from plan.md risk assessment)
        * Resources & Links (link to plan.md, ADRs, docs)
        * Acceptance Criteria (specific to task)

   d. **Add to TASK-LIST.md**:
      ```markdown
      ## PENDING
      015 | P1 | feature | Implement User model | Create user entity with validation [feature:001-user-auth]
      016 | P1 | feature | Implement Session model | Session management and expiry [feature:001-user-auth]
      ```

10. **Create feature tasks.md**

    - Save the task breakdown in `planning/features/NNN-slug/tasks.md`
    - This serves as a reference/overview
    - The actual executable tasks are in `execution/tasks/NNN/`

11. **Report completion**

    ```
    ✅ Tasks generated successfully!

    Summary:
    - Tasks created: 015-026 (12 tasks)
    - Task breakdown: planning/features/001-user-authentication/tasks.md
    - Added to: execution/TASK-LIST.md (PENDING section)

    Task files created in:
    - execution/tasks/015/ through execution/tasks/026/

    Next steps:
    1. Review task files: execution/tasks/015/task.md
    2. Start first task: /project:start-task 015
    3. Or review all tasks: cat execution/TASK-LIST.md

    Recommended execution order:
    1. Tasks 015-016 (Setup, sequential)
    2. Tasks 017-019 + 021 (Core, can be parallel)
    3. Task 020 (depends on 017-019)
    4. Tasks 022-024 (Integration, sequential)
    5. Tasks 025-026 (Polish, can be parallel)
    ```

## Task Breakdown Principles

### Task Granularity

**Good task size**:
- Can be completed in 1-2 days
- Has clear start and end
- Produces testable output
- Single responsibility

**Too large** (split it):
- "Implement entire authentication system"
- "Build complete user management"

**Too small** (merge them):
- "Add one field to user model"
- "Import one library"

### Task Dependencies

**Clear dependencies**:
```markdown
### T005: Implement AuthService
**Dependencies**: T003 (User model), T004 (Session model)
**Reason**: AuthService uses both User and Session entities
```

**Avoid circular dependencies**:
- If Task A depends on Task B, Task B cannot depend on Task A
- Use proper layering (models → services → controllers)

### Parallelization

**Can be parallel** (mark with [P]):
- Different files: user.ts vs session.ts
- Different layers: frontend + backend
- Independent features: User CRUD + Session CRUD

**Must be sequential**:
- Same files: Can't both edit auth-service.ts
- Dependencies: Service needs model first
- Setup required: Need DB schema before using it

## Feature Context in Tasks

Each generated task.md includes:

```markdown
# Task 015: Implement User Model

## Feature Context

**Feature**: [001-user-authentication](../../../planning/features/001-user-authentication/feature.md)
**Technical Plan**: [plan.md](../../../planning/features/001-user-authentication/plan.md)
**Feature Tasks**: [tasks.md](../../../planning/features/001-user-authentication/tasks.md)
**ADRs**:
- [001-use-postgresql.md](../../../planning/features/001-user-authentication/adr/001-use-postgresql.md)
- [002-password-hashing.md](../../../planning/features/001-user-authentication/adr/002-password-hashing.md)

## Overview
[Task-specific content...]
```

This provides full traceability from task → feature → requirements.

## Error Handling

### Missing Prerequisites

```
Error: plan.md not found in planning/features/001-example/

Please run /project:plan-feature first to create the technical plan.
```

### Tasks Already Generated

```
Warning: tasks.md already exists in this feature.

Existing tasks found in TASK-LIST.md:
- 015-020: Tasks for planning/features/001-user-authentication

Do you want to:
1. Regenerate tasks (will create new task IDs)
2. Update existing tasks (preserve IDs)
3. Cancel

Your choice: [1/2/3]
```

### Conflicting Task IDs

```
Note: Project has tasks up to ID 050.
New tasks will start at ID 051.

This feature had tasks 015-020 in tasks.md, but new IDs will be 051-056.
The tasks.md reference will be updated with new IDs.

Continue? [y/n]
```

## Best Practices

### Task Descriptions

**Good**:
- "Implement User model with email validation and password hashing"
- "Create POST /api/auth/login endpoint with JWT token generation"
- "Add integration tests for complete login flow"

**Bad**:
- "Do user stuff"
- "Fix auth"
- "Update things"

### File Specifications

**Good**:
```markdown
**Files Affected**:
- src/models/user.ts (new file)
- src/models/index.ts (export User)
- src/models/user.test.ts (tests)
```

**Bad**:
```markdown
**Files Affected**:
- Some user files
```

### Acceptance Criteria

**Good**:
```markdown
**Acceptance Criteria**:
- [ ] User model has id, email, passwordHash, name, createdAt fields
- [ ] Email validation rejects invalid formats
- [ ] Password hashing uses bcrypt with cost factor 12
- [ ] Unit tests cover all validations
- [ ] Model exports proper TypeScript types
```

**Bad**:
```markdown
**Acceptance Criteria**:
- [ ] User model works
```

## Notes

- Review generated tasks before starting execution
- Tasks can be reordered or modified in TASK-LIST.md if needed
- The feature's tasks.md in planning/ is a reference - execution/TASK-LIST.md is the source of truth
- Tasks link back to features for context and traceability
- Large features may generate 15-20+ tasks - that's fine

---

**Next Command**: After generating tasks, use `/project:start-task NNN` to begin execution.