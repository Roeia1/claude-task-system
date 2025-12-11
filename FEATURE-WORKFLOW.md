# Feature Development Workflow

This guide explains the complete feature development lifecycle in the Claude Task System, from initial idea through planning, task breakdown, execution, and completion.

## Overview

The workflow consists of three main phases:

1. **Feature Definition** → Define WHAT to build
2. **Technical Planning** → Design HOW to build it
3. **Task Execution** → Actually build it with phased discipline

Each phase requires human review and approval before proceeding.

---

## Phase 1: Feature Definition

**Goal**: Clearly define what needs to be built and why, without implementation details.

### Activation: Say "define feature [description]"

```bash
# Say: "define feature user authentication with email/password and OAuth"
```

### What Happens

1. **AI assists with structure**:
   - Generates user stories with acceptance criteria
   - Identifies functional and non-functional requirements
   - Suggests success metrics
   - Defines what's out of scope

2. **Interactive clarification**:
   - AI marks ambiguities as `[NEEDS CLARIFICATION: question]`
   - You answer clarifying questions
   - AI updates the document

3. **Human review**:
   - Review generated `feature.md`
   - Refine until accurate
   - Approve to create

### Output

```
planning/features/001-user-authentication/
├── feature.md     # Created
└── adr/           # Created (empty for now)
```

### Example feature.md Sections

```markdown
# Feature: User Authentication

## User Stories

### Story 1: Email/Password Login
**As a** returning user
**I want** to log in with email and password
**So that** I can access my account securely

**Acceptance Criteria:**
- [ ] User enters valid email and password
- [ ] System validates credentials
- [ ] User receives JWT token upon success
- [ ] Invalid credentials show clear error message
```

### Tips

- **Focus on user value**, not implementation
- **Be specific** about acceptance criteria
- **Identify edge cases** early
- **Define scope clearly** (what's in, what's out)

---

## Phase 2: Technical Planning

**Goal**: Design the technical approach, architecture, and make key technology decisions.

### Command: `/project:plan-feature`

```bash
cd features/001-user-authentication
/project:plan-feature
```

### What Happens

1. **AI reads feature.md** to understand requirements

2. **Interactive planning**:
   - Proposes system architecture
   - Suggests technology choices
   - Designs data models
   - Creates API contracts
   - Identifies risks

3. **ADR creation**:
   - For significant decisions, AI suggests creating ADRs
   - You review options and make choices
   - ADRs document the reasoning

4. **Human review at checkpoints**:
   - After each major section
   - Opportunity to refine or regenerate

### Output

```
planning/features/001-user-authentication/
├── feature.md
├── plan.md        # Created
└── adr/           # ADRs created during planning
    ├── 001-jwt-authentication.md
    └── 002-password-hashing.md
```

### Example plan.md Sections

```markdown
# Technical Plan: User Authentication

## System Architecture

### Components

1. **AuthService**
   - Purpose: Handle authentication logic
   - Responsibilities: Login, token generation, validation
   - Interfaces: REST API

2. **UserRepository**
   - Purpose: Data access for user entities
   - Responsibilities: CRUD operations, user queries
   - Interfaces: TypeScript interface, PostgreSQL

## Technology Choices

**Framework**: Express 4.x
**Rationale**: Lightweight, team familiarity, sufficient for API needs

**Database**: PostgreSQL 15+
**Rationale**: ACID guarantees needed for user data, JSONB for flexibility
**ADR**: [001-use-postgresql.md](./adr/001-use-postgresql.md)

## Data Models

```typescript
interface User {
  id: string;              // UUID
  email: string;           // Unique, validated
  passwordHash: string;    // bcrypt hash
  name: string;
  isVerified: boolean;
  createdAt: Date;
}
```
```

### Tips

- **Create ADRs for major decisions** (database, framework, auth method)
- **Be specific about technology versions**
- **Document trade-offs honestly**
- **Link to feature requirements**

---

## Interlude: Architecture Decision Records

**When**: Create ADRs during planning or execution when facing architectural decisions

### Command: `/project:adr`

```bash
# Context-aware: creates in feature or global location
/project:adr "choice of JWT vs session-based authentication"
```

### What Happens

1. **AI analyzes the decision**:
   - Clarifies the problem
   - Researches options
   - Lists pros/cons honestly

2. **Recommends an option** with reasoning

3. **You review and approve**

4. **ADR file created** with:
   - Problem statement
   - Options considered
   - Decision and rationale
   - Consequences (positive, negative, neutral)

### Output

**Feature-specific**:
```
planning/features/001-user-authentication/adr/001-jwt-vs-sessions.md
```

**Project-wide**:
```
docs/adr/001-use-postgresql.md
```

### Tips

- **Create ADRs before implementing** the decision
- **Be honest about trade-offs** (don't hide negatives)
- **Link ADRs from plan.md and task.md**
- **Update status** from "Proposed" to "Accepted" after team review

---

## Phase 3: Task Generation

**Goal**: Break down the technical plan into executable, dependency-ordered tasks.

### Invocation: "generate tasks"

```bash
cd features/001-user-authentication
# Say: "generate tasks" or "break down feature"
```

### What Happens

1. **AI analyzes feature.md and plan.md**

2. **Generates task breakdown**:
   - Organizes by phase (Setup → Core → Integration → Polish)
   - Identifies dependencies
   - Marks parallel-capable tasks with `[P]`
   - Specifies files for each task

3. **Shows proposal for review**:
   ```
   Total: 12 tasks
   Phase 1: Setup (2 tasks)
   Phase 2: Core (5 tasks, 3 parallelizable)
   Phase 3: Integration (3 tasks)
   Phase 4: Polish (2 tasks, parallelizable)
   ```

4. **You review and can**:
   - Approve as-is
   - Edit (merge/split/reorder tasks)
   - Regenerate with different approach

5. **After approval**:
   - Creates `tasks.md` in feature directory (reference)
   - Creates worktree + branch + PR for each task
   - Tasks appear in `task-system/tasks/NNN/` as worktrees

### Output

```
task-system/features/001-user-authentication/
├── feature.md
├── plan.md
├── tasks.md                    # Created (reference with PR links)
└── adr/

task-system/tasks/                # Each is a git worktree
├── 015/                         # User model (branch: task-015-feature)
├── 016/                         # Session model (branch: task-016-feature)
├── 017/                         # AuthService (branch: task-017-feature)
└── ...
```

### Example tasks.md

```markdown
# Task Breakdown: User Authentication

## Phase 1: Setup

### T001: Setup project structure
**Task ID**: 015
**Type**: feature
**Priority**: P1
**Dependencies**: None
**Files**: package.json, tsconfig.json, .env.example

### T002: Database schema and migrations
**Task ID**: 016
**Type**: feature
**Priority**: P1
**Dependencies**: 015
**Files**: migrations/001_create_users.sql

## Phase 2: Core

### T003: Implement User model [P]
**Task ID**: 017
**Type**: feature
**Priority**: P1
**Dependencies**: 016
**Files**: src/models/user.ts
**Parallelizable**: Yes (different files than T004)
```

### Tips

- **Review task granularity** (1-2 days per task)
- **Verify dependencies** are correct
- **Check parallel tasks** affect different files
- **Link tasks to feature** for context

---

## Phase 4: Task Execution

**Goal**: Execute tasks using the phased workflow with TDD discipline.

### Command: `/project:start-task`

```bash
/project:start-task 015
# Or interactive: /project:start-task
```

### The Workflow Phases

#### Phase 1: Task Analysis
- Read task.md and linked feature documentation
- Verify dependencies are COMPLETED
- Document understanding in journal
- **Commit**: "docs(task-015): initial task analysis"

#### Phase 2: Solution Design
- Review feature plan and ADRs
- Document technical approach
- **Create ADRs** for new architectural decisions
- **Commit**: "docs(task-015): complete solution design"

#### Phase 3: Test Creation (TDD)
- Write tests for expected behavior
- NO implementation code yet
- Verify all tests fail
- **Commit**: "test(task-015): add comprehensive test suite"

#### Phase 4: Implementation
- Implement to pass tests
- NEVER modify tests without permission
- **Commit frequently**: "feat(task-015): implement [component]"

#### Phase 5: Refactor
- Improve code quality
- Ensure tests still pass
- **Commit**: "refactor(task-015): improve [aspect]"

#### Phase 6: Verification & Polish
- Verify acceptance criteria from feature
- Run quality checks
- Mark PR ready for review
- **Commit**: "docs(task-015): final verification"

#### Phase 7: Reflection
- Update task file with learnings
- Document key decisions
- Summarize accomplishments

#### Completion (automatic)
- Grant permission after Phase 7 for automatic completion
- Task-completer subagent handles PR merge

### Task File Structure

Each task links back to its feature:

```markdown
# Task 015: Implement User Model

## Feature Context
**Feature**: [001-user-authentication](../../planning/features/001-user-authentication/feature.md)
**Technical Plan**: [plan.md](../../planning/features/001-user-authentication/plan.md)
**ADRs**:
- [001-jwt-authentication.md](../../planning/features/001-user-authentication/adr/001-jwt-authentication.md)

## Overview
Create the User entity model with validation...
```

### Journal Example

```markdown
# Task 015: Implement User Model

## Current Phase: Phase 2 - Solution Design

## Git References
- **Branch**: feature/task-015-implement-user-model
- **PR**: #25 - Implement User Model
- **Base Branch**: master

## Task Understanding
Creating User model with email validation, password hashing, and timestamp fields.
Follows the data model spec in plan.md.

## Solution Design
Using Zod for validation schema.
Password hashing with bcrypt (cost factor 12 per ADR-002).
TypeScript interface exported for type safety.

### [2025-11-22 10:30] - Solution Design
Designed validation schema with:
- Email: regex validation + uniqueness check
- Password: min 8 chars, hashing before storage
- Timestamps: automatic via database

Reviewed ADR-002 for password hashing guidelines.

**Next**: Request permission to proceed to Phase 3 (Test Creation)
```

### Tips

- **Request permission** between phases
- **Update journal** frequently with decisions
- **Create ADRs** for significant design choices
- **Link to feature context** when making decisions
- **Follow TDD strictly** (tests before code)

---

## Parallel Task Execution

For working on multiple tasks simultaneously, use git worktrees:

```bash
# Start parallel task
/project:parallel-start-task 017

# Work in separate worktree
cd worktrees/task-017-feature/

# Complete when done
/project:parallel-finalize-task 017
# Then from main repo:
/project:parallel-cleanup-worktree 017
```

See `execution/PARALLEL-WORKFLOW-GUIDE.md` for details.

---

## Complete Workflow Example

### Start to Finish

```bash
# 1. Define feature
# Say: "define feature user authentication with email/password"
# Output: planning/features/001-user-authentication/feature.md

# 2. Review and refine feature.md (manual)

# 3. Create technical plan
cd features/001-user-authentication
/project:plan-feature
# Output: plan.md + adr/001-jwt.md, adr/002-bcrypt.md

# 4. Review plan.md and ADRs (manual)

# 5. Generate tasks
# Say: "generate tasks"
# Output: tasks.md + execution/tasks/015-026/

# 6. Execute tasks
cd /home/roei/projects/claude-task-system
/project:start-task 015
# ... 8-phase workflow
# Say "complete task" when ready to finalize

# 7. Repeat for each task
/project:start-task 016
# ... continue until all tasks done
```

### Artifacts Created

```
planning/features/001-user-authentication/
├── feature.md           # What to build
├── plan.md              # How to build it
├── tasks.md             # Task breakdown (reference)
└── adr/
    ├── 001-jwt.md       # Decision: JWT authentication
    └── 002-bcrypt.md    # Decision: password hashing

task-system/tasks/           # Each is a git worktree
├── 015/                     # Branch: task-015-feature, PR: #XX
│   ├── task.md              # Task details
│   └── journal.md           # Execution log (created on start)
├── 016/                     # Branch: task-016-feature, PR: #YY
│   ├── task.md
│   └── journal.md
└── ...

docs/adr/                # Project-wide ADRs (if any)
```

---

## Key Principles

1. **Separation of Concerns**:
   - feature.md = WHAT (requirements)
   - plan.md = HOW (architecture)
   - task.md = DO (implementation)

2. **Human-Guided**:
   - AI assists, you decide
   - Review and approval at each phase
   - You have final say

3. **Traceability**:
   - Tasks link to features
   - Features link to ADRs
   - Complete audit trail

4. **Documented Decisions**:
   - ADRs capture "why"
   - Journals capture execution context
   - Future you will thank you

5. **TDD Discipline**:
   - Tests before implementation
   - No test modification without approval
   - Prevents costly mistakes

---

## Common Scenarios

### Scenario 1: Simple Feature

**Feature**: Export data to CSV

**Workflow**:
1. Say "define feature export data to CSV"
2. `/project:plan-feature` (simple plan, maybe no ADRs)
3. Say "generate tasks" (maybe 3-4 tasks)
4. Execute tasks with 8-phase workflow

**Time**: 3-5 days total

### Scenario 2: Complex Feature

**Feature**: Multi-tenant user management

**Workflow**:
1. Say "define feature multi-tenant user management" (with extensive clarification)
2. `/project:plan-feature` with multiple ADRs
3. Say "generate tasks" (15-20 tasks)
4. Execute tasks, some in parallel
5. Create additional ADRs during execution

**Time**: 2-4 weeks

### Scenario 3: Ad-hoc Task

**Need**: Quick refactor not part of a feature

**Workflow**:
1. Skip feature definition
2. Create task directly (manually or with `/project:new-task` if available)
3. Execute with 8-phase workflow
4. No feature context in task.md

---

## Troubleshooting

### "I need to update a feature after planning"

- Edit `feature.md` or `plan.md` directly
- If major changes: say "generate tasks" to regenerate
- Update ADRs by superseding them

### "Tasks were generated wrong"

- Edit individual task files in `execution/tasks/NNN/`
- Or say "generate tasks" to regenerate (creates new IDs)

### "I want to skip a phase during execution"

- You can't - phases are non-negotiable
- The discipline prevents costly mistakes
- Trust the process

### "Task is blocked"

- Check dependencies in task.md
- Ensure prerequisite task PRs are merged (use "list tasks")
- Dependencies are advisory - git handles conflicts naturally

---

## Best Practices

1. **Start small**: First feature should be simple to learn the workflow
2. **Review before approving**: Don't rush through AI generations
3. **Create ADRs liberally**: Document decisions while fresh
4. **Update journals frequently**: Capture context in the moment
5. **Link everything**: Tasks → features, features → ADRs
6. **Commit often**: End of each phase + logical milestones
7. **Test the workflow**: Do a trial run with a simple feature

---

## Next Steps

Ready to start? Here's your first workflow:

```bash
# 1. Try with a simple feature first
# Say: "define feature add export to CSV functionality"

# 2. Follow the prompts
# 3. Review each output
# 4. Learn the workflow
# 5. Then tackle bigger features
```

For reference:
- **Commands**: See `.claude/commands/`
- **Templates**: See `planning/templates/`
- **Task execution**: See `plugin/skills/task-start/workflows/` (task-type specific workflows)
- **Shared protocols**: See `execution/shared/` (PR reviews, test modifications, etc.)
- **Parallel work**: See `execution/PARALLEL-WORKFLOW-GUIDE.md`
- **ADR process**: See `docs/adr/000-adr-process.md`