# Journal Entry Format for Workers

This document defines the format workers use when appending entries to `journal.md` during autonomous task execution.

## Purpose

The journal provides an append-only audit trail of work done on a task. Each worker session appends one entry documenting what was accomplished, decisions made, and commits created.

## Entry Structure

```markdown
---

## Entry: [ISO timestamp]

**Objective:** [obj-id] - [objective description]
**Status at exit:** [in_progress | done | blocked]

### What Was Done

- [Bullet points of actions taken]
- [Decisions made and why]
- [Progress achieved]

### Commits

- `[short-hash]` [commit message]

### Notes

[Context for next session, blockers encountered, or observations]

---
```

## Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| **Entry timestamp** | Yes | ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ` |
| **Objective** | Yes | The `obj-id` from task.json and its description |
| **Status at exit** | Yes | One of: `in_progress`, `done`, `blocked` |
| **What Was Done** | Yes | Bullet list of concrete actions and decisions |
| **Commits** | Yes | List of commits made (can be empty with note explaining why) |
| **Notes** | No | Optional context for future sessions |

## Status Values

- **in_progress**: Work started but not complete; next session should continue
- **done**: Objective fully completed; tests pass, code committed
- **blocked**: Cannot proceed without human input; blocker.md created

## Examples

### Example 1: Successful Progress

```markdown
---

## Entry: 2026-01-07T14:32:00Z

**Objective:** obj-1 - JWT utility functions that sign and verify tokens
**Status at exit:** done

### What Was Done

- Created `src/auth/jwt.ts` with sign/verify functions
- Implemented RS256 signing with configurable key path
- Added 15-minute expiry with clock skew tolerance
- Wrote comprehensive test suite covering:
  - Valid token generation and verification
  - Expired token rejection
  - Invalid signature detection
  - Malformed token handling

### Commits

- `a3f2d1c` feat(auth): add JWT sign/verify utilities with RS256
- `b7e9c4a` test(auth): add JWT utility test suite

### Notes

Token refresh logic will be handled in obj-2 (login endpoint).

---
```

### Example 2: Work In Progress

```markdown
---

## Entry: 2026-01-07T15:45:00Z

**Objective:** obj-2 - Login endpoint that validates credentials and returns tokens
**Status at exit:** in_progress

### What Was Done

- Created route handler at `POST /api/auth/login`
- Implemented input validation for email/password
- Added bcrypt password comparison
- Started rate limiting implementation

### Commits

- `c4d8e2f` feat(auth): add login endpoint with input validation

### Notes

Rate limiting middleware partially implemented. Need to finish Redis integration for distributed rate limiting. Tests written but rate limit tests are skipped pending Redis setup.

---
```

### Example 3: Blocked

```markdown
---

## Entry: 2026-01-07T16:20:00Z

**Objective:** obj-4 - Auth middleware that protects routes
**Status at exit:** blocked

### What Was Done

- Analyzed existing middleware chain
- Identified integration point in Express app
- Discovered conflicting middleware that strips Authorization header

### Commits

None - blocked before implementation could begin.

### Notes

The `sanitize-headers` middleware (added in PR #142) removes Authorization headers as a security measure. Need human decision on whether to:
1. Whitelist Authorization header in sanitize-headers
2. Move auth middleware before sanitization
3. Use cookie-only auth and remove header support

Created blocker.md with detailed analysis.

---
```

## Writing Guidelines

1. **Be specific**: Use concrete descriptions, not vague statements like "made progress"
2. **Document decisions**: Explain why choices were made, not just what was done
3. **Link to commits**: Always include commit hashes for traceability
4. **Keep it concise**: Journal entries should be informative but not verbose
5. **Provide context**: Notes should help the next session pick up efficiently

## Initial Entry

When starting a fresh task, the first entry should document task initialization:

```markdown
# Task Journal

---

## Entry: 2026-01-07T10:00:00Z

**Objective:** Task initialization
**Status at exit:** in_progress

### What Was Done

- Task started: [task title]
- Reviewed task.json objectives
- Identified starting point: obj-1

### Commits

None - task initialization.

### Notes

Beginning with obj-1 as it has no dependencies on other objectives.

---
```
