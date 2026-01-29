---
name: list-sessions
description: List all running SAGA sessions
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - Bash
---

# List Sessions

!`npx @saga-ai/cli sessions list`

## Process

### 1. Parse the Result

The command above outputs a JSON array of session objects:
```json
[
  {
    "name": "saga-epic-slug-story-slug-1704067200000",
    "status": "running",
    "outputFile": "/tmp/saga-sessions/saga-epic-slug-story-slug-1704067200000.out"
  }
]
```

### 2. Format and Display

**If the array is empty**, report:
```
No SAGA sessions are currently running.
```

**If sessions exist**, parse each session name to extract:
- **Epic**: The segment after `saga-` (e.g., `epic-slug`)
- **Story**: The segments between epic and timestamp (e.g., `story-slug`)
- **Started**: Calculate elapsed time from the Unix timestamp suffix (milliseconds)

Present in a table format:

```
## Running Sessions

| Epic | Story | Started | Session Name |
|------|-------|---------|--------------|
| auth | login-flow | 2h 30m ago | saga-auth-login-flow-1704067200000 |

To stream logs: `saga sessions logs <session-name>`
To kill session: `saga sessions kill <session-name>`
```

### 3. Session Name Parsing

The session name format is: `saga-<epic-slug>-<story-slug>-<timestamp>`

To extract components:
1. Remove the `saga-` prefix
2. The last segment (after final `-`) is the timestamp (13-digit Unix ms)
3. The remaining string contains `<epic-slug>-<story-slug>`
4. Epic and story slugs can contain hyphens, so use the known epic/story from context or display the full middle portion

**Note**: If exact epic/story separation is ambiguous, display the combined slug.
