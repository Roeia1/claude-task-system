---
name: resolve-blocker
description: Resolve a blocker for a blocked story
argument-hint: "[story-slug]"
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - Bash
  - Read
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
  - Task
---

# Resolve Blocker Skill

!`node $SAGA_PLUGIN_ROOT/scripts/find.js "$0" --type story`

## Process

### 1. Check Resolution Result

The `saga find` command ran above. Handle the result:

- **If found=true**: Extract `data.slug` and `data.epicSlug`, continue to step 2
- **If found=false with matches array**: Use AskUserQuestion to disambiguate:
  ```
  question: "Which story's blocker do you want to resolve?"
  header: "Story"
  multiSelect: false
  options: [
    {label: "<slug>", description: "<title> (Epic: <epicSlug>, Status: <status>)"}
    ...for each story in the matches array
  ]
  ```
  After selection, continue with the selected story.
- **If found=false with error**: Display the error. Suggest using `/task-list` to see available stories.

### 2. Locate Story Files

Compute paths to story files:
```
EPIC_SLUG=<epic_slug from resolution>
STORY_SLUG=<story_slug from resolution>
WORKTREE="$SAGA_PROJECT_DIR/.saga/worktrees/$EPIC_SLUG/$STORY_SLUG"
STORY_DIR=".saga/epics/$EPIC_SLUG/stories/$STORY_SLUG"
```

Story files within the worktree:
- `$WORKTREE/$STORY_DIR/story.md` - Story definition
- `$WORKTREE/$STORY_DIR/journal.md` - Execution journal

### 3. Read Story Context

Read the story definition to understand what's being built:

```bash
cat $WORKTREE/$STORY_DIR/story.md
```

Extract:
- Story title and context
- Tasks and their guidance
- References and patterns

### 4. Read Journal and Find Blocker

Read the journal to find the blocker:

```bash
cat $WORKTREE/$STORY_DIR/journal.md
```

A blocker entry has this format:

```markdown
## Blocker: [Brief title]

**Task**: [Which task is blocked]
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

### Check for Unresolved Blocker

1. Find all `## Blocker:` sections in journal.md
2. For each blocker, check if a matching `## Resolution:` section exists
3. A blocker is "unresolved" if no resolution references its title

**If no unresolved blocker found:**
```
===============================================================
No Unresolved Blocker Found
===============================================================

Story $STORY_SLUG is not blocked. journal.md does not contain any
unresolved blocker entries.

If you expected a blocker:
- Check journal.md for the blocker entry format
- Ensure the implementation exited with BLOCKED status

To resume implementation: /implement $STORY_SLUG
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
  /implement $STORY_SLUG
===============================================================
```
**STOP** - do not continue

### 5. Present Blocker Summary

Display the blocker context to the human:

```
===============================================================
Blocker Analysis: $BLOCKER_TITLE
===============================================================

Story: $STORY_SLUG ($STORY_TITLE)
Blocked Task: $BLOCKER_TASK

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

### 6. Analyze and Propose Solutions

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

### 7. Get Human Approval

**CRITICAL**: Do NOT proceed without explicit human approval.

Use AskUserQuestion to get the human's decision:

```
Which solution should I document as the resolution?
```

Options:
- Option 1: [Name]
- Option 2: [Name]
- Other (custom guidance)

**Wait for explicit response.**

- If human selects an option: Use that option's details
- If human provides custom guidance: Use their guidance
- If human wants more analysis: Return to Step 6 with refined focus

### 8. Write Resolution to Journal

Append the resolution entry to journal.md using the Edit tool:

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

### 9. Confirm Completion

```
===============================================================
Resolution Documented
===============================================================

The resolution has been appended to journal.md.

Blocker: $BLOCKER_TITLE
Decision: $DECISION

To resume implementation with this resolution:
  /implement $STORY_SLUG

The next worker will read the resolution from journal.md and
apply the guidance to complete the blocked task.
===============================================================
```

## Notes

- **Human approval is mandatory**: Never write a resolution without explicit approval
- **Full codebase access**: Use all available tools to analyze the problem
- **Preserve worker context**: The resolution should give clear, actionable guidance
- **Single blocker at a time**: This skill handles one blocker per invocation
- **No code changes**: The /resolve command documents decisions, workers implement them
