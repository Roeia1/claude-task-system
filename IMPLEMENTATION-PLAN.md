# Complete Implementation Plan: Spec-Kit + Task System Integration

## Overview
Merge spec-kit and custom task system using single source of truth in `project-tasks/TASK-LIST.md` with auto-generated feature views in `specs/###-feature/tasks.md`.

---

## Phase 1: Enhance Core Infrastructure

### 1.1 Enhance common.sh with Task Helpers
**File:** `.specify/scripts/bash/common.sh`

**Add functions:**
```bash
# Get task-related paths
get_task_list_path() {
    local repo_root=$(get_repo_root)
    echo "$repo_root/project-tasks/TASK-LIST.md"
}

get_task_dir() {
    local repo_root=$(get_repo_root)
    local task_id="$1"
    echo "$repo_root/project-tasks/tasks/$task_id"
}

get_task_file() {
    local repo_root=$(get_repo_root)
    local task_id="$1"
    echo "$repo_root/project-tasks/tasks/$task_id/task.md"
}

get_task_journal() {
    local repo_root=$(get_repo_root)
    local task_id="$1"
    echo "$repo_root/project-tasks/tasks/$task_id/journal.md"
}

# Extract next available task ID from TASK-LIST.md
get_next_task_id() {
    local task_list=$(get_task_list_path)
    if [[ ! -f "$task_list" ]]; then
        echo "001"
        return
    fi

    # Find highest task ID in all sections
    local highest=$(grep -E '^[0-9]{3} \|' "$task_list" | \
                   cut -d'|' -f1 | \
                   tr -d ' ' | \
                   sort -n | \
                   tail -1)

    if [[ -z "$highest" ]]; then
        echo "001"
    else
        printf "%03d" $((10#$highest + 1))
    fi
}

# Extract feature ID from branch name (005 from 005-user-auth)
get_feature_id() {
    local branch="$1"
    echo "$branch" | grep -oE '^[0-9]{3}' || echo ""
}

# Get feature tag from branch
get_feature_tag() {
    local branch="$1"
    echo "[feature:$branch]"
}
```

---

### 1.2 Create New Script: generate-tasks.sh
**File:** `.specify/scripts/bash/generate-tasks.sh`

**Purpose:** Bridge spec-kit task generation to your task system

**Functionality:**
- Read `specs/###-feature/tasks.md` (spec-kit format)
- Parse each task (T001, T002, etc.)
- Generate task IDs sequentially from `TASK-LIST.md`
- Create individual task files in `project-tasks/tasks/###/`
- Add entries to `project-tasks/TASK-LIST.md` with feature tags
- Return JSON with created task IDs

**Key logic:**
- Extract task description and file paths from spec-kit tasks.md
- Infer task type from phase (Setup→feature, Tests→feature, etc.)
- Determine priority from dependency order
- Add `[feature:###-name]` tag to each entry
- Generate comprehensive task.md from TASK-TEMPLATE.md
- Link task back to parent feature

---

### 1.3 Create New Script: sync-feature-tasks.sh
**File:** `.specify/scripts/bash/sync-feature-tasks.sh`

**Purpose:** Generate `specs/###-feature/tasks.md` by filtering TASK-LIST.md

**Functionality:**
- Read `project-tasks/TASK-LIST.md`
- Filter tasks by `[feature:###-name]` tag
- Generate `specs/###-feature/tasks.md` in spec-kit format
- Include status summary (Pending/In Progress/Completed counts)
- Group by phase if `[phase:###]` tags present

---

## Phase 2: Modify Task Template

### 2.1 Update TASK-TEMPLATE.md
**File:** `project-tasks/TASK-TEMPLATE.md`

**Add section at top:**
```markdown
# Task [ID]: [Title]

## Feature Context
**Feature**: [###-feature-name](../../specs/###-feature-name/)
**Specification**: [spec.md](../../specs/###-feature-name/spec.md)
**Technical Plan**: [plan.md](../../specs/###-feature-name/plan.md)
**Feature Tasks**: [tasks.md](../../specs/###-feature-name/tasks.md)

## Overview
[rest of template...]
```

**Update fields:**
- Add optional **Feature** field for feature-linked tasks
- Keep existing structure for ad-hoc tasks (no feature)

---

## Phase 3: Modify Slash Commands

### 3.1 Modify /tasks Command
**File:** `.claude/commands/tasks.md`

**Current flow:**
1. `check-prerequisites.sh` → validate plan.md
2. Generate `specs/###-feature/tasks.md` (spec-kit format)
3. Done

**New flow:**
1. `check-prerequisites.sh` → validate plan.md
2. Generate `specs/###-feature/tasks.md` (spec-kit format) - **keep this**
3. **NEW:** Run `generate-tasks.sh --feature "$FEATURE_DIR"`
   - Creates entries in `project-tasks/TASK-LIST.md`
   - Creates individual `project-tasks/tasks/###/task.md` files
4. **NEW:** Run `sync-feature-tasks.sh --feature "$CURRENT_BRANCH"`
   - Regenerates `specs/###-feature/tasks.md` from TASK-LIST.md
   - Now it's a view of the source of truth
5. Report completion with task IDs created

**Key changes:**
```markdown
# After generating initial tasks.md:

7. Run `.specify/scripts/bash/generate-tasks.sh --json --feature "$FEATURE_DIR"`
   and parse output for CREATED_TASK_IDS array

8. Run `.specify/scripts/bash/sync-feature-tasks.sh --feature "$CURRENT_BRANCH"`
   to regenerate specs/###-feature/tasks.md as filtered view

9. Report:
   - Tasks created: 001, 002, 003, ... (list all IDs)
   - Added to: project-tasks/TASK-LIST.md (PENDING section)
   - Feature view: specs/###-feature/tasks.md
   - Individual files: project-tasks/tasks/###/task.md
   - Ready for execution: /project:start-task 001
```

---

### 3.2 Remove /implement Command
**File:** `.claude/commands/implement.md`

**Action:** Delete this file

**Reason:** Execution is now handled by `/project:start-task` with 8-phase workflow

---

### 3.3 Remove /project:new-task Command
**File:** `.claude/commands/new-task.md`

**Action:** Delete this file

**Reason:** Task creation now via `/specify` → `/plan` → `/tasks` flow

**Alternative:** Keep it for ad-hoc tasks not part of features
- If kept, update to add `[feature:none]` tag
- Allow manual task creation outside feature context

**Recommendation:** Keep it but document when to use:
- Use `/specify` → `/tasks` for feature work
- Use `/project:new-task` for quick refactors, bug fixes outside features

---

### 3.4 Keep All Execution Commands Unchanged
**Files:** No changes needed
- `.claude/commands/start-task.md`
- `.claude/commands/complete-task.md`
- `.claude/commands/parallel-start-task.md`
- `.claude/commands/parallel-finalize-task.md`
- `.claude/commands/parallel-cleanup-worktree.md`
- `.claude/commands/worktree-maintenance.md`

**Reason:** They already work with `project-tasks/TASK-LIST.md` structure

---

## Phase 4: Update TASK-LIST.md Format

### 4.1 Add Feature Tags to Entries

**Current format:**
```markdown
## PENDING
001 | P1 | feature | Create user model | Implementation in src/models/user.py
```

**New format:**
```markdown
## PENDING
001 | P1 | feature | Create user model | Implementation in src/models/user.py [feature:005-user-auth]
002 | P1 | feature | Create auth service | JWT authentication [feature:005-user-auth]
003 | P2 | feature | Analytics endpoint | Event tracking [feature:007-analytics]
099 | P3 | refactor | Update lint config | Standalone refactor [feature:none]
```

**Tags:**
- `[feature:###-name]` - Links task to parent feature
- `[feature:none]` - Ad-hoc task not part of feature
- Optional: `[phase:setup|tests|core|integration|polish]` - For feature view grouping

---

## Phase 5: Create Documentation

### 5.1 Create Unified Workflow Guide
**File:** `docs/WORKFLOW-GUIDE.md` (new file)

**Contents:**
```markdown
# Development Workflow Guide

## Overview
This project uses a unified workflow combining spec-kit's planning with structured task execution.

## Feature Development Lifecycle

### Phase 1: Feature Planning (Spec-Kit)
1. `/constitution` - Define project principles (once)
2. `/specify "feature description"` - Create feature specification
3. `/plan` - Generate technical design and research
4. `/tasks` - Generate executable tasks

### Phase 2: Task Execution (Human-Guided)
5. `/project:start-task ###` - Execute with 8-phase discipline
6. `/project:complete-task ###` - Merge PR and complete

## Task Organization

### Single Source of Truth
- **Master list**: `project-tasks/TASK-LIST.md`
- **Feature views**: `specs/###-feature/tasks.md` (auto-generated)
- **Task details**: `project-tasks/tasks/###/task.md`

### Feature Views
Each feature has an auto-generated task view:

```
specs/005-user-auth/tasks.md  # Shows only tasks for this feature
```

To regenerate: `.specify/scripts/bash/sync-feature-tasks.sh --feature 005-user-auth`

## When to Use What

### Feature-Based Work
Use spec-kit flow for planned features:

```bash
/specify "user authentication system"
/plan
/tasks  # Creates tasks 001-010
/project:start-task 001
```

### Ad-Hoc Tasks
Use manual task creation for quick work:

```bash
/project:new-task "fix typo in README"  # Creates task 099
/project:start-task 099
```

### Parallel Execution
Work on multiple tasks simultaneously:

```bash
/project:parallel-start-task 002
/project:parallel-start-task 005
# Work in separate terminals
/project:parallel-finalize-task 002
/project:parallel-cleanup-worktree 002
```
```

---

### 5.2 Update Main README
**File:** `README.md` or project root

**Add section:**
```markdown
## Development Workflow

This project uses a structured development workflow:

- **Planning**: Spec-kit methodology (constitution → specify → plan → tasks)
- **Execution**: Human-guided 8-phase workflow with TDD discipline
- **Tracking**: Central task list with feature-organized views

See [WORKFLOW-GUIDE.md](docs/WORKFLOW-GUIDE.md) for complete documentation.
```

---

### 5.3 Document Script Updates
**File:** `.specify/scripts/bash/README.md` (new file)

**Contents:**
```markdown
# Spec-Kit Scripts

## Core Scripts
- `common.sh` - Utility functions for path resolution
- `check-prerequisites.sh` - Validates planning artifacts
- `create-new-feature.sh` - Initializes feature structure
- `setup-plan.sh` - Copies plan template

## Bridge Scripts (Custom)
- `generate-tasks.sh` - Converts spec-kit tasks to project-tasks format
- `sync-feature-tasks.sh` - Generates feature task views from TASK-LIST.md

## Agent Context
- `update-agent-context.sh` - Updates root-level agent instruction files
  - Updates CLAUDE.md, GEMINI.md, etc.
  - Does NOT modify worktree CLAUDE.md files
  - Run after `/plan` to update tech stack context
```

---

## Phase 6: Migration Strategy for Existing Tasks

### 6.1 Backfill Feature Tags
For existing tasks in TASK-LIST.md:
1. Review each task
2. Determine if it belongs to a feature
3. Add `[feature:###-name]` or `[feature:none]` tag

---

### 6.2 Generate Feature Views
After backfilling tags:

```bash
# For each feature:
.specify/scripts/bash/sync-feature-tasks.sh --feature 005-user-auth
.specify/scripts/bash/sync-feature-tasks.sh --feature 007-analytics
# etc.
```

---

## Phase 7: Testing Strategy

### 7.1 Test Feature Creation Flow
```bash
/specify "test feature for merge validation"
/plan
/tasks
```

**Verify:**
- `specs/###-test/tasks.md` created
- `project-tasks/TASK-LIST.md` updated
- `project-tasks/tasks/###/task.md` files created
- Feature tags present

---

### 7.2 Test Task Execution
```bash
/project:start-task ###
```

**Verify:**
- Works with feature-linked tasks
- Journal references feature
- Workflow unchanged

---

### 7.3 Test Feature View Regeneration
```bash
# Modify TASK-LIST.md entry
.specify/scripts/bash/sync-feature-tasks.sh --feature ###-test
```

**Verify:** `specs/###-test/tasks.md` updates

---

## Phase 8: Spec-Kit Update Strategy

### 8.1 Track Upstream
```bash
git remote add spec-kit-upstream https://github.com/github/spec-kit.git
git fetch spec-kit-upstream
```

---

### 8.2 Update Process
When spec-kit releases updates:

```bash
# Update planning components
git checkout spec-kit-upstream/main -- .specify/templates/
git checkout spec-kit-upstream/main -- .specify/scripts/bash/common.sh
git checkout spec-kit-upstream/main -- .specify/scripts/bash/check-prerequisites.sh
git checkout spec-kit-upstream/main -- .specify/scripts/bash/create-new-feature.sh
git checkout spec-kit-upstream/main -- .specify/scripts/bash/setup-plan.sh

# Keep custom scripts
git checkout HEAD -- .specify/scripts/bash/generate-tasks.sh
git checkout HEAD -- .specify/scripts/bash/sync-feature-tasks.sh

# Update planning commands
git checkout spec-kit-upstream/main -- .claude/commands/constitution.md
git checkout spec-kit-upstream/main -- .claude/commands/specify.md
git checkout spec-kit-upstream/main -- .claude/commands/plan.md
git checkout spec-kit-upstream/main -- .claude/commands/clarify.md
git checkout spec-kit-upstream/main -- .claude/commands/analyze.md

# Keep modified tasks command
git checkout HEAD -- .claude/commands/tasks.md

# Review and commit
git add .specify .claude/commands
git commit -m "chore: update spec-kit planning components"
```

---

## Summary of Changes

### Files to Create (5)
1. `.specify/scripts/bash/generate-tasks.sh` - Bridge to project-tasks
2. `.specify/scripts/bash/sync-feature-tasks.sh` - Generate feature views
3. `.specify/scripts/bash/README.md` - Document scripts
4. `docs/WORKFLOW-GUIDE.md` - Unified workflow guide
5. Migration guide for existing tasks

### Files to Modify (3)
1. `.specify/scripts/bash/common.sh` - Add task path helpers
2. `.claude/commands/tasks.md` - Call bridge scripts
3. `project-tasks/TASK-TEMPLATE.md` - Add feature context section

### Files to Remove (2)
1. `.claude/commands/implement.md` - Replaced by execution commands
2. `.claude/commands/new-task.md` - Optional: keep for ad-hoc tasks

### Files to Keep Unchanged (10+)
- All spec-kit planning scripts and commands
- All execution commands (start/complete/parallel)
- All workflow guides
- TASK-WORKFLOW.md

---

## Benefits Summary

✅ **Single source of truth**: `project-tasks/TASK-LIST.md`
✅ **Feature organization**: Auto-generated views in `specs/###-feature/tasks.md`
✅ **No sync issues**: Views are generated, not manually edited
✅ **Backward compatible**: Existing execution commands unchanged
✅ **Spec-kit aligned**: Preserves planning methodology
✅ **Your discipline**: Maintains 8-phase execution rigor
✅ **Parallel workflows**: Git worktrees continue to work
✅ **Update-friendly**: Clear separation between upstream and custom code
