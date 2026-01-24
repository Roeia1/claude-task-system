---
name: pr-review
description: "Address GitHub PR review comments. Fetches unresolved comments, applies fixes, commits, and resolves threads. Use when the user says 'check review', 'fix PR comments', 'address feedback', or 'I made a review'."
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# PR Review Skill

Address GitHub PR review comments for the current branch.

## Process

### 1. Identify the PR

Find the PR for the current branch:

```bash
gh pr view --json number,title,headRefName
```

If no PR found, report error and stop.

### 2. Fetch Unresolved Comments

Use GraphQL to get both inline review threads AND review body comments:

```bash
gh api graphql -f query='
{
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: PR_NUMBER) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          comments(first: 10) {
            nodes {
              body
              path
              line
            }
          }
        }
      }
      reviews(first: 20) {
        nodes {
          id
          state
          body
          author { login }
        }
      }
    }
  }
}'
```

Replace OWNER, REPO, and PR_NUMBER with actual values from step 1.

Filter for:
- `reviewThreads` with `isResolved: false`
- `reviews` with non-empty `body` (these are review summary comments)

### 3. Display Comments Summary

Show the user what needs to be addressed:

```
## Review Body Comments (if any)

### Review by <author>
**State**: CHANGES_REQUESTED
**Feedback**: <review body>

## Unresolved Inline Comments (X total)

### Comment 1
**File**: path/to/file.ts:42
**Feedback**: <comment body>

### Comment 2
...
```

Review body comments are general feedback not tied to specific lines. Address them based on intent.

### 4. Address Each Comment

For each unresolved comment:

1. Read the file at the specified path
2. Understand the feedback
3. Apply the fix
4. If the comment is unclear, ask for clarification before proceeding

### 5. Commit Changes

After addressing all comments:

```bash
git add <changed files>
git commit -m "fix: address PR review feedback

<summary of changes>

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

### 6. Resolve Comment Threads

Resolve all addressed threads in a single batched GraphQL mutation using aliases:

```bash
gh api graphql -f query='
mutation {
  t1: resolveReviewThread(input: {threadId: "THREAD_ID_1"}) { thread { isResolved } }
  t2: resolveReviewThread(input: {threadId: "THREAD_ID_2"}) { thread { isResolved } }
  ...
}'
```

Each `tN:` is an alias allowing multiple mutations in one request.

### 7. Acknowledge Review Body Comments

If there were review body comments (non-empty `body` in reviews), add a PR comment summarizing what was addressed:

```bash
gh pr comment --body "## Review Feedback Addressed

Addressed feedback from @<reviewer>:

- <summary of what was done>
- <another change>

Please re-review when ready."
```

### 8. Dismiss Changes Requested Reviews

Find reviews with `CHANGES_REQUESTED` state and dismiss them:

```bash
# Get CHANGES_REQUESTED review IDs
gh api repos/OWNER/REPO/pulls/PR_NUMBER/reviews --jq '.[] | select(.state == "CHANGES_REQUESTED") | .id'

# Dismiss each review
gh api -X PUT repos/OWNER/REPO/pulls/PR_NUMBER/reviews/REVIEW_ID/dismissals -f message="Addressed in recent commits"
```

Then request a re-review:

```bash
gh pr edit --add-reviewer <reviewer-username>
```

This clears the "Changes requested" status and creates a pending review request.

### 9. Report Completion

```
## PR Review Complete

Addressed X comments:
- <file1>: <summary>
- <file2>: <summary>

All threads resolved.
```

## Important Notes

- Only resolve comments that have been fully addressed
- If a comment requires clarification, reply to it instead of resolving
- Group related changes into a single commit when possible
- Always push after committing so the PR updates
- Review body comments cannot be "resolved" like threads - add a PR comment to acknowledge them
- After addressing CHANGES_REQUESTED reviews, request a re-review to clear the status
