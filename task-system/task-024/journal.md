# Task 024 Journal - Phase 3 Story Execution and Resolution

## Session 1 - 2026-01-17

### Context
Starting implementation of the V2 story execution infrastructure. The task involves creating:
1. `/implement` command to start story execution
2. `execute-story` skill for orchestration
3. `implement.py` script for worker spawning
4. `worker-prompt.md` template
5. `scope_validator.sh` for isolation
6. `/resolve` command and skill for blockers

### Baseline Analysis
- Existing `implement.py` at `plugin/scripts/` handles V1 task-based execution
- `identifier_resolver_v2.py` exists and handles epic/story resolution
- V2 structure uses `.claude-tasks/worktrees/<epic>/<story>/` for isolation
- Current tests: 116 passed (V1), 19 passed (V2 resolver, 2 minor test failures for `id` vs `slug`)

### Approach
Following TDD - will write tests first for each component, then implement.
Starting with obj-1: the /implement command for V2 stories.

The V2 /implement command differs from V1 in:
- Uses `--type story` with `identifier_resolver_v2.py`
- Worktree path is `.claude-tasks/worktrees/<epic>/<story>/`
- Invokes `execute-story` skill instead of running `implement.py` directly

### Implementation Complete

All 7 objectives have been implemented:

1. **obj-1: /implement command** - Updated `plugin/commands/implement.md` to use V2 story resolution
   - Uses `identifier_resolver_v2.py --type story`
   - Invokes `execute-story` skill on success

2. **obj-2: execute-story skill** - Created `plugin/skills/execute-story/SKILL.md`
   - Computes worktree path: `.claude-tasks/worktrees/<epic>/<story>/`
   - Validates worktree and story.md existence
   - Invokes `implement.py` orchestrator

3. **obj-3: implement.py orchestrator** - Created `plugin/skills/execute-story/scripts/implement.py`
   - Takes epic_slug and story_slug as arguments
   - Reads environment variables (CLAUDE_PLUGIN_ROOT, CLAUDE_PROJECT_DIR)
   - Spawns workers with scope enforcement hooks
   - Handles ONGOING/FINISH/BLOCKED/TIMEOUT/MAX_CYCLES
   - 45 tests passing

4. **obj-4: worker-prompt.md** - Created `plugin/skills/execute-story/worker-prompt.md`
   - Context variables prepended by orchestrator
   - Story-based task execution workflow
   - TDD and commit discipline requirements
   - Exit protocol with JSON schema

5. **obj-5: scope_validator.sh** - Created `plugin/skills/execute-story/scripts/scope_validator.sh`
   - Blocks access to `.claude-tasks/archive/`
   - Blocks access to other stories' files
   - Allows code files and current story files
   - 21 tests passing

6. **obj-6: /resolve command** - Updated `plugin/commands/resolve.md`
   - Optional story-slug argument
   - Uses V2 identifier resolution
   - Invokes `resolve-blocker` skill

7. **obj-7: resolve-blocker skill** - Created `plugin/skills/resolve-blocker/SKILL.md`
   - Reads journal.md to find blockers
   - Proposes solutions with pros/cons
   - Requires human approval via AskUserQuestion
   - Documents resolution in journal.md

### Tests

New tests: 66 passing
- `plugin/skills/execute-story/tests/test_implement.py`: 45 tests
- `plugin/skills/execute-story/tests/test_scope_validator.py`: 21 tests

V1 tests still pass independently (31 tests in identifier_resolver, etc.)

### Files Created/Modified

Created:
- `plugin/skills/execute-story/SKILL.md`
- `plugin/skills/execute-story/scripts/implement.py`
- `plugin/skills/execute-story/scripts/scope_validator.sh`
- `plugin/skills/execute-story/worker-prompt.md`
- `plugin/skills/execute-story/tests/test_implement.py`
- `plugin/skills/execute-story/tests/test_scope_validator.py`
- `plugin/skills/resolve-blocker/SKILL.md`

Modified:
- `plugin/commands/implement.md` - Updated for V2 story execution
- `plugin/commands/resolve.md` - Updated for V2 story resolution

