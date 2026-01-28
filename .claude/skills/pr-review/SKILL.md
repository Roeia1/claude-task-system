---
name: pr-review
description: "Address GitHub PR review comments. Fetches unresolved comments, applies fixes, commits, and resolves threads. Use when the user says 'check review', 'fix PR comments', 'address feedback', or 'I made a review'."
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# PR Review Skill

Address GitHub PR review comments for the current branch.

## Tasks

| Subject | Description | Active Form | Blocked By | Blocks |
|---------|-------------|-------------|------------|--------|
| Identify PR | Run `gh pr view --json number,title,headRefName,url` to get PR details. Extract owner/repo from remote URL. If no PR found, report error and stop. | Identifying PR | - | Fetch comments |
| Fetch comments | Run GraphQL query (see [Fetch Comments Query](#fetch-comments-query)) with owner, repo, and PR number. Filter for unresolved `reviewThreads` and `reviews` with non-empty body. | Fetching comments | Identify PR | Display summary |
| Display summary | Show user what needs addressing (see [Summary Format](#summary-format)). If no unresolved comments, report "No comments to address" and stop. | Displaying summary | Fetch comments | Address comments |
| Address comments | For each unresolved comment: read the file, understand feedback, apply fix. If unclear, ask for clarification. Track thread IDs and reviewer usernames for later steps. | Addressing comments | Display summary | Commit changes |
| Commit changes | Stage changed files, commit with message "fix: address PR review feedback" plus summary and Co-Authored-By, then push. | Committing changes | Address comments | Resolve threads, Dismiss reviews |
| Resolve threads | Batch resolve all addressed threads using GraphQL mutation with aliases (see [Resolve Threads Mutation](#resolve-threads-mutation)). | Resolving threads | Commit changes | Report completion |
| Dismiss reviews | Find CHANGES_REQUESTED reviews via `gh api repos/OWNER/REPO/pulls/NUMBER/reviews --jq '.[] \| select(.state == "CHANGES_REQUESTED") \| .id'`. Dismiss each with `gh api -X PUT repos/OWNER/REPO/pulls/NUMBER/reviews/ID/dismissals -f message="Addressed in recent commits"`. Then request re-review with `gh pr edit --add-reviewer <username>`. | Dismissing reviews | Commit changes | Report completion |
| Report completion | Output summary: number of comments addressed, files changed, threads resolved. | Reporting completion | Resolve threads, Dismiss reviews | - |

## Reference

### Fetch Comments Query

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
            nodes { body path line }
          }
        }
      }
      reviews(first: 20) {
        nodes { id state body author { login } }
      }
    }
  }
}'
```

### Summary Format

```
## Review Body Comments (if any)

### Review by <author>
**State**: CHANGES_REQUESTED
**Feedback**: <review body>

## Unresolved Inline Comments (X total)

### Comment 1
**File**: path/to/file.ts:42
**Feedback**: <comment body>
```

### Resolve Threads Mutation

```bash
gh api graphql -f query='
mutation {
  t1: resolveReviewThread(input: {threadId: "THREAD_ID_1"}) { thread { isResolved } }
  t2: resolveReviewThread(input: {threadId: "THREAD_ID_2"}) { thread { isResolved } }
}'
```

## Important Notes

- Only resolve comments that have been fully addressed
- If a comment requires clarification, reply to it instead of resolving
- Group related changes into a single commit when possible
- Review body comments cannot be "resolved" like threads - address them via commits
