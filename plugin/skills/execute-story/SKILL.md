---
name: implement
description: Start autonomous story implementation
argument-hint: "<story-slug>"
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Task
  - AskUserQuestion
---

# Implement Story Skill

!`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/identifier_resolver_v2.py "$0" --type story --project-root "${CLAUDE_PROJECT_DIR}"`

## Process

### 1. Check Resolution Result

The identifier resolver ran above. Handle the result:

- **If resolved=true**: Extract `story.slug` and `story.epic_slug`, continue to step 2
- **If resolved=false with stories array**: Use AskUserQuestion to disambiguate:
  ```
  question: "Which story do you want to implement?"
  header: "Story"
  multiSelect: false
  options: [
    {label: "<slug>", description: "<title> (Epic: <epic_slug>, Status: <status>)"}
    ...for each story in the stories array
  ]
  ```
  After selection, continue with the selected story.
- **If resolved=false with error**: Display the error. Suggest using `/task-list` to see available stories.

### 2. Compute Paths

```
EPIC_SLUG=<epic_slug from resolution>
STORY_SLUG=<story_slug from resolution>
WORKTREE_PATH="$CLAUDE_PROJECT_DIR/.claude-tasks/worktrees/$EPIC_SLUG/$STORY_SLUG"
```

Story files are located at:
- `$WORKTREE_PATH/.claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/story.md` - Story definition
- `$WORKTREE_PATH/.claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/journal.md` - Execution journal

### 3. Validate Before Execution

<!--
VALIDATION ARCHITECTURE NOTE:
Validations are consolidated here in SKILL.md, which is the ONLY validation point.
The implement.py script does NOT duplicate these checks - it trusts that SKILL.md
has already validated before the script is called.

Validation flow:
1. identifier_resolver_v2.py - Resolves story slug to epic/story (Step 1)
2. SKILL.md - Validates worktree and story.md exist (THIS STEP)
3. scope_validator.py - Runtime file access enforcement (during worker execution)

The session-init.sh hook only detects context and sets env vars, not validation.
-->

Check that the worktree and story.md exist:

```bash
# Check worktree exists
test -d "$CLAUDE_PROJECT_DIR/.claude-tasks/worktrees/$EPIC_SLUG/$STORY_SLUG" && echo "WORKTREE_EXISTS" || echo "WORKTREE_MISSING"
```

**If WORKTREE_MISSING:**
```
Worktree not found at .claude-tasks/worktrees/<epic>/<story>/

The story worktree has not been created yet. This can happen if:
1. The story was generated but the worktree wasn't set up
2. The worktree was deleted or moved

To create the worktree, use: /task-resume <story-slug>
```
**STOP** - do not continue

```bash
# Check story.md exists
test -f "$WORKTREE_PATH/.claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/story.md" && echo "STORY_EXISTS" || echo "STORY_MISSING"
```

**If STORY_MISSING:**
```
story.md not found in worktree.

Expected location: .claude-tasks/epics/<epic>/stories/<story>/story.md

The worktree exists but the story definition file is missing.
This may indicate an incomplete story setup.
```
**STOP** - do not continue

### 4. Run Implementation Orchestrator

All validation passed. Run the implementation script using Bash with `run_in_background: true`:

```bash
python3 -u "${CLAUDE_PLUGIN_ROOT}/skills/execute-story/scripts/implement.py" \
    "$EPIC_SLUG" \
    "$STORY_SLUG" \
    --max-cycles 10 \
    --max-time 60 \
    --model opus
```

**Important:** Use these Bash tool parameters:
- `run_in_background: true` - runs the script as a background task
- `timeout: 3660000` - 61 minute timeout (slightly longer than --max-time)

### 6. Report Status

Display the execution status:

```
===============================================================
Starting Autonomous Story Implementation
===============================================================

Epic: $EPIC_SLUG
Story: $STORY_SLUG
Worktree: .claude-tasks/worktrees/$EPIC_SLUG/$STORY_SLUG/
Task ID: <task_id from Bash tool>

The implementation script is now running in the background.
Workers will implement tasks following TDD practices.

Monitor progress:
  - Check journal: Read .claude-tasks/epics/$EPIC_SLUG/stories/$STORY_SLUG/journal.md
  - Check status: Use TaskOutput tool with task_id

The script will exit with one of these statuses:
  FINISH     - All tasks completed successfully
  BLOCKED    - Human input needed (run /resolve)
  TIMEOUT    - Max time exceeded
  MAX_CYCLES - Max worker spawns reached

===============================================================
```

## Notes

- The orchestrator script handles worker spawning and output parsing
- Workers operate within the worktree context with scope enforcement
- If workers get blocked, use `/resolve <story-slug>` to provide guidance
- The orchestrator enforces max 10 cycles and 60 minutes by default
