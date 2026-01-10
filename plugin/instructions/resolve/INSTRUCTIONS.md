# Resolve Command

Analyzes a blocker from journal.md, proposes solutions, and appends the approved resolution. Must be run from within a task worktree.

## Prerequisites

- Must be run from within a task worktree (not the main repository)
- An unresolved blocker must exist in journal.md
- The blocker must not already have a resolution entry

## Step 1: Validate Worktree Context

Run the context detection script to verify we're in a task worktree:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/instructions/task-start/scripts/detect-context.sh
```

**Parse JSON output** and check `status`:

- If `status: "error"` with `error_type: "not_in_worktree"`:
  ```
  ===============================================================
  Cannot Run /resolve From Main Repository
  ===============================================================

  The /resolve command must be run from within a task worktree.

  To resolve a blocked task:
  1. Navigate to the task worktree: cd task-system/tasks/NNN
  2. Start a new Claude session
  3. Run: /resolve

  Use "list tasks" to see blocked tasks and their locations.
  ===============================================================
  ```
  **STOP** - do not continue

- If `status: "error"` with other error types:
  - Display the error message
  - **STOP** - do not continue

- If `status: "ok"`:
  - Store `task_id` as `$TASK_ID`
  - Store `worktree_path` as `$WORKTREE_PATH`
  - Continue to Step 2

## Step 2: Read Task Context

Read the task files to understand the context:

1. **Read task.json** from `task-system/task-$TASK_ID/task.json`:
   - Extract task title, type, and overview
   - Extract objectives and their statuses
   - Identify which objective was being worked on

2. **Read journal.md** from `task-system/task-$TASK_ID/journal.md`:
   - Look for the most recent blocker entry (section starting with `## Blocker:`)
   - Check if it already has a corresponding resolution entry

## Step 3: Find Unresolved Blocker

Parse journal.md to find blocker entries. A blocker entry has this format:

```markdown
## Blocker: [Brief title]

**Objective**: [Which objective is blocked]
**What I'm trying to do**: [Description]
**What I tried**: [Approaches attempted and why they didn't work]
**What I need**: [Specific decision or information required]
**Suggested options**: [If ideas exist, list them with pros/cons]
```

A resolution entry has this format:

```markdown
## Resolution: [Reference to blocker title]

**Decision**: [Clear statement of the chosen approach]
**Implementation guidance**: [Specific steps or guidance for the worker]
**Rationale**: [Why this approach was chosen over alternatives]
**Approved**: [ISO timestamp]
```

**Check for unresolved blocker:**

1. Find all `## Blocker:` sections in journal.md
2. For each blocker, check if a matching `## Resolution:` section exists
3. A blocker is "unresolved" if no resolution references its title

**If no unresolved blocker found:**
```
===============================================================
No Unresolved Blocker Found
===============================================================

Task $TASK_ID is not blocked. journal.md does not contain any
unresolved blocker entries.

If you expected a blocker:
- Check journal.md for the blocker entry format
- Ensure the implementation script exited with BLOCKED status

To resume implementation: /implement $TASK_ID
===============================================================
```
**STOP** - do not continue

**If blocker already resolved:**
```
===============================================================
Blocker Already Resolved
===============================================================

The blocker "$BLOCKER_TITLE" already has a resolution in journal.md.

To resume implementation with the resolution applied:
  /implement $TASK_ID

If you need to modify the resolution, edit journal.md directly.
===============================================================
```
**STOP** - do not continue

**Store the unresolved blocker details:**
- `$BLOCKER_TITLE` - The blocker title
- `$BLOCKER_OBJECTIVE` - Which objective is blocked
- `$BLOCKER_TRYING` - What the worker was trying to do
- `$BLOCKER_TRIED` - What approaches were attempted
- `$BLOCKER_NEED` - What decision or information is required
- `$BLOCKER_OPTIONS` - Suggested options if any

## Step 4: Present Blocker Summary

Display the blocker context to the human:

```
===============================================================
Blocker Analysis: $BLOCKER_TITLE
===============================================================

Task: $TASK_ID - [task title from task.json]
Blocked Objective: $BLOCKER_OBJECTIVE

---------------------------------------------------------------
Problem Description
---------------------------------------------------------------
$BLOCKER_TRYING

---------------------------------------------------------------
What Was Tried
---------------------------------------------------------------
$BLOCKER_TRIED

---------------------------------------------------------------
What Is Needed
---------------------------------------------------------------
$BLOCKER_NEED

---------------------------------------------------------------
Worker's Suggested Options
---------------------------------------------------------------
$BLOCKER_OPTIONS (or "None provided")

===============================================================
Analyzing codebase to propose solutions...
===============================================================
```

## Step 5: Analyze and Propose Solutions

**This is the critical analysis phase.** Use your full codebase access to:

1. **Explore relevant code** based on the blocker context:
   - Read files mentioned in the blocker
   - Search for related patterns or implementations
   - Understand the architectural context

2. **Analyze the root cause**:
   - Why did the worker get stuck?
   - Is this a missing information problem or a design decision?
   - Are there existing patterns that could apply?

3. **Formulate solution options**:
   - Consider the worker's suggested options if provided
   - Add alternative approaches based on codebase analysis
   - Evaluate trade-offs for each option

4. **Present proposals to the human**:

```
===============================================================
Proposed Solutions
===============================================================

Based on my analysis of the blocker and codebase:

## Option 1: [Name] (Recommended)

**Approach**: [Clear description of the approach]

**Pros**:
- [Benefit 1]
- [Benefit 2]

**Cons**:
- [Drawback 1]
- [Drawback 2]

**Implementation guidance**:
- [Specific step 1]
- [Specific step 2]

---------------------------------------------------------------

## Option 2: [Name]

**Approach**: [Clear description]

**Pros**:
- [Benefit 1]

**Cons**:
- [Drawback 1]

**Implementation guidance**:
- [Specific step 1]

===============================================================
```

## Step 6: Get Human Approval

**CRITICAL**: Do NOT proceed without explicit human approval.

Ask the human to choose:

```
Which solution should I document as the resolution?

1. Option 1: [Name]
2. Option 2: [Name]
3. Other (please describe)

Please select an option or provide alternative guidance.
```

**Wait for explicit response.**

- If human selects an option: Use that option's details
- If human provides custom guidance: Use their guidance
- If human wants more analysis: Return to Step 5 with refined focus

**Store the approved decision:**
- `$DECISION` - Clear statement of the chosen approach
- `$GUIDANCE` - Specific implementation guidance
- `$RATIONALE` - Why this approach was chosen

## Step 7: Write Resolution to Journal

Append the resolution entry to journal.md:

```markdown
---

## Resolution: $BLOCKER_TITLE

**Decision**: $DECISION

**Implementation guidance**:
$GUIDANCE

**Rationale**: $RATIONALE

**Approved**: [Current ISO timestamp]

---
```

Use the Edit tool to append this to the end of journal.md.

## Step 8: Confirm Completion

```
===============================================================
Resolution Documented
===============================================================

The resolution has been appended to journal.md.

Blocker: $BLOCKER_TITLE
Decision: $DECISION

To resume implementation with this resolution:
  /implement $TASK_ID

The next worker will read the resolution from journal.md and
apply the guidance to complete the blocked objective.
===============================================================
```

---

## Error Handling

| Error | Message |
|-------|---------|
| Not in worktree | "Must run /resolve from within a task worktree" |
| No journal.md | "journal.md not found in task $TASK_ID" |
| No blocker found | "No unresolved blocker found in journal.md" |
| Already resolved | "Blocker already has a resolution. Run /implement to resume." |
| task.json missing | "task.json not found in task $TASK_ID" |
| Malformed blocker | "Could not parse blocker entry. Expected format: ## Blocker: [title]" |

---

## Important Notes

- **Human approval is mandatory**: Never write a resolution without explicit approval
- **Full codebase access**: Use all available tools to analyze the problem
- **Preserve worker context**: The resolution should give clear, actionable guidance
- **Single blocker at a time**: This command handles one blocker per invocation
- **No code changes**: The /resolve command documents decisions, workers implement them
