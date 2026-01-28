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
| Fetch comments | Use GraphQL to get both inline review threads AND review body comments. Run: `gh api graphql -f query='{ repository(owner: "OWNER", name: "REPO") { pullRequest(number: PR_NUMBER) { reviewThreads(first: 50) { nodes { id isResolved comments(first: 10) { nodes { body path line } } } } reviews(first: 20) { nodes { id state body author { login } } } } } }'`. Replace OWNER, REPO, and PR_NUMBER with actual values from previous task. Filter for: (1) `reviewThreads` with `isResolved: false`, (2) `reviews` with non-empty `body` (these are review summary comments). | Fetching comments | Identify PR | Display summary |
| Display summary | Show the user what needs to be addressed in this format: `## Review Body Comments (if any)` section listing each review with non-empty body as `### Review by <author>` with `**State**: CHANGES_REQUESTED` and `**Feedback**: <review body>`. Then `## Unresolved Inline Comments (X total)` section listing each unresolved thread as `### Comment N` with `**File**: path/to/file.ts:42` and `**Feedback**: <comment body>`. Review body comments are general feedback not tied to specific lines - address them based on intent. If no unresolved comments exist, report "No comments to address" and stop. | Displaying summary | Fetch comments | Address comments |
| Address comments | For each unresolved comment: (1) Read the file at the specified path, (2) Understand the feedback, (3) Apply the fix, (4) If the comment is unclear, ask for clarification before proceeding. Track all thread IDs for resolving later. Track reviewer usernames for re-review requests. | Addressing comments | Display summary | Commit changes |
| Commit changes | After addressing all comments, run: `git add <changed files>` then `git commit -m "fix: address PR review feedback` followed by blank line, summary of changes, blank line, and `Co-Authored-By: Claude <noreply@anthropic.com>"` then `git push`. Always push after committing so the PR updates. | Committing changes | Address comments | Resolve threads, Dismiss reviews |
| Resolve threads | Resolve all addressed threads in a single batched GraphQL mutation using aliases. Run: `gh api graphql -f query='mutation { t1: resolveReviewThread(input: {threadId: "THREAD_ID_1"}) { thread { isResolved } } t2: resolveReviewThread(input: {threadId: "THREAD_ID_2"}) { thread { isResolved } } }'`. Each `tN:` is an alias allowing multiple mutations in one request. Add more aliases (t3, t4, etc.) for each thread ID collected during address comments task. | Resolving threads | Commit changes | Report completion |
| Dismiss reviews | Find reviews with CHANGES_REQUESTED state and dismiss them. First get review IDs: `gh api repos/OWNER/REPO/pulls/PR_NUMBER/reviews --jq '.[] \| select(.state == "CHANGES_REQUESTED") \| .id'`. Then dismiss each review: `gh api -X PUT repos/OWNER/REPO/pulls/PR_NUMBER/reviews/REVIEW_ID/dismissals -f message="Addressed in recent commits"`. Finally request re-review: `gh pr edit --add-reviewer <reviewer-username>`. This clears the "Changes requested" status and creates a pending review request. | Dismissing reviews | Commit changes | Report completion |
| Report completion | Output completion summary in this format: `## PR Review Complete` followed by `Addressed X comments:` with bullet list of `- <file>: <summary of change>` for each file changed, then `All threads resolved.` | Reporting completion | Resolve threads, Dismiss reviews | - |

## Important Notes

- Only resolve comments that have been fully addressed
- If a comment requires clarification, reply to it instead of resolving
- Group related changes into a single commit when possible
- Review body comments cannot be "resolved" like threads - address them via commits
