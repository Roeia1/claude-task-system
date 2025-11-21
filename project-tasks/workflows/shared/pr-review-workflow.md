# PR Review Workflow

This document defines the standard PR review process used across all task-type workflows.

## Review Session Tracking System

To prevent re-addressing already completed reviews, this workflow uses:
1. **Journal-based tracking** - Persistent state in task journal
2. **User communication protocol** - Clear signals for new reviews  
3. **GitHub timestamp verification** - Backup validation using API

## User Communication Protocol

**Use these specific signals to indicate new reviews:**
- ✅ "I've added a **new** PR review"
- ✅ "Review #X is ready" 
- ✅ "Address the **latest** review"
- ✅ "I added **additional** comments"

**Avoid ambiguous signals like:**
- ❌ "I made a review" (could be old or new)
- ❌ "Check the PR comments" (unclear scope)

## When User Signals New Review

When user provides clear signal for new review:

1. **Immediately pause current phase work**
2. **Check journal for last review session**
3. **Query GitHub for new reviews/comments only**
4. **Address new comments systematically** 
5. **Update journal with new review session**

## Review Session Detection Process

### Step 1: Check Journal for Last Review Session

Look for most recent review session in journal:

```markdown
## PR Review Status Tracking

### Review Session #2 (2025-05-30 23:03:11Z)  
- **Review ID**: PRR_kwDOOUAVxs6r093F
- **Status**: COMPLETED ✅
- **Timestamp**: 2025-05-30T23:03:11Z
```

### Step 2: Query GitHub for New Reviews

Use GitHub CLI to check for reviews newer than last session:

```bash
gh api repos/owner/repo/pulls/PR_NUMBER/reviews
gh api repos/owner/repo/pulls/PR_NUMBER/comments
```

### Step 3: Filter to New Comments Only

- Compare `submittedAt` timestamps with last journal timestamp
- Only process reviews/comments submitted after last completed session
- Document which specific comments are being addressed

### Step 4: Update Journal Before Starting

Create new review session entry:

```markdown
### Review Session #3 (2025-05-31 10:30:00Z)
- **Review ID**: PRR_kwDOOUAVxs6r105XYZ  
- **Status**: IN PROGRESS 🔄
- **New Comments**: 3 comments to address
- **Previous Session**: #2 completed on 2025-05-30T23:03:11Z
```

## Comment Response Protocol

For each NEW comment only:

1. **Read comment completely**
2. **Assess clarity**:
   - **Clear instruction/feedback** → Apply changes, commit with reference to comment
   - **Ambiguous or needs discussion** → Reply to comment with questions/discussion
3. **Document in journal**: What was changed and why
4. **Use commit format**: `fix(task-XXX): address PR feedback - [description] (resolves comment #N)`

## Review Session Completion

After addressing all new comments:

1. **Update journal session status** to COMPLETED ✅
2. **Add session summary** with changes made
3. **Commit journal updates** 
4. **Reply to PR** with session completion summary

```markdown
### Review Session #3 (2025-05-31 10:30:00Z) - COMPLETED ✅
- **Review ID**: PRR_kwDOOUAVxs6r105XYZ
- **Status**: COMPLETED ✅  
- **Comments**: 3 addressed
- **Commit**: abc1234 - "fix(task-XXX): address third PR review feedback"
- **Changes**: [summary of what was changed]
```

## Journal Structure for Review Tracking

Add this section to all task journals:

```markdown
## PR Review Status Tracking

### Review Session #1 (YYYY-MM-DD HH:MM:SSZ)
- **Review ID**: [GitHub review ID]
- **Status**: [IN PROGRESS 🔄 | COMPLETED ✅]
- **Comments**: [number] addressed
- **Commit**: [hash] - "[commit message]"
- **Timestamp**: [ISO timestamp]
- **Changes**: [brief summary]
```

## Comment Resolution Rules

- **Resolve when**: Taking concrete action (code change, test update, documentation fix)
- **Don't resolve when**: Asking for clarification or starting discussion  
- **All NEW comments require action**: Either change implementation or engage in discussion
- **Never re-address COMPLETED session comments**

## Important Notes

- **Only address comments from new review sessions**
- **Check journal before processing any review**
- **Use timestamp comparison as backup verification**
- **Document all changes in journal for complete audit trail**
- **Never assume scope - always verify what's new vs already completed**