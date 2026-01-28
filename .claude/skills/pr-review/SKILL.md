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
| Fetch comments | Run GraphQL query with owner, repo, and PR number: `gh api graphql -f query='{ repository(owner: "OWNER", name: "REPO") { pullRequest(number: PR_NUMBER) { reviewThreads(first: 50) { nodes { id isResolved comments(first: 10) { nodes { body path line } } } } reviews(first: 20) { nodes { id state body author { login } } } } } }'`. Filter for `reviewThreads` with `isResolved: false` and `reviews` with non-empty body. | Fetching comments | Identify PR | Display summary |
| Display summary | Show user what needs addressing. Format: "## Review Body Comments" section with reviewer, state, feedback for each review with body. "## Unresolved Inline Comments (X total)" section with file path, line number, and feedback for each thread. If no unresolved comments, report "No comments to address" and stop. | Displaying summary | Fetch comments | Address comments |
| Address comments | For each unresolved comment: read the file at the specified path, understand the feedback, apply the fix. If unclear, ask for clarification. Track thread IDs and reviewer usernames for later steps. | Addressing comments | Display summary | Commit changes |
| Commit changes | Stage changed files, commit with message "fix: address PR review feedback\n\n<summary of changes>\n\nCo-Authored-By: Claude <noreply@anthropic.com>", then push. | Committing changes | Address comments | Resolve threads, Dismiss reviews |
| Resolve threads | Batch resolve all addressed threads using GraphQL mutation with aliases: `gh api graphql -f query='mutation { t1: resolveReviewThread(input: {threadId: "ID1"}) { thread { isResolved } } t2: resolveReviewThread(input: {threadId: "ID2"}) { thread { isResolved } } }'`. | Resolving threads | Commit changes | Report completion |
| Dismiss reviews | Find CHANGES_REQUESTED reviews via `gh api repos/OWNER/REPO/pulls/NUMBER/reviews --jq '.[] \| select(.state == "CHANGES_REQUESTED") \| .id'`. Dismiss each with `gh api -X PUT repos/OWNER/REPO/pulls/NUMBER/reviews/ID/dismissals -f message="Addressed in recent commits"`. Then request re-review with `gh pr edit --add-reviewer <username>`. | Dismissing reviews | Commit changes | Report completion |
| Report completion | Output summary: number of comments addressed, files changed, threads resolved. | Reporting completion | Resolve threads, Dismiss reviews | - |

## Important Notes

- Only resolve comments that have been fully addressed
- If a comment requires clarification, reply to it instead of resolving
- Group related changes into a single commit when possible
- Review body comments cannot be "resolved" like threads - address them via commits
