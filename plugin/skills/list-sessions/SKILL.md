---
name: list-sessions
description: List all running SAGA sessions
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - Bash
---

# List Sessions

!`npx @saga-ai/dashboard sessions list`

## Process

### 1. Parse the Result

The command above outputs a JSON array of session objects:
```json
[
  {
    "name": "saga-story-my-story-id-1704067200000",
    "status": "running",
    "outputFile": "/tmp/saga-sessions/saga-story-my-story-id-1704067200000.out"
  }
]
```

### 2. Format and Display

**If the array is empty**, report:
```
No SAGA sessions are currently running.
```

**If sessions exist**, parse each session name to extract:
- **Story**: The story ID extracted from the session name
- **Started**: Calculate elapsed time from the Unix timestamp suffix (milliseconds)

Present in a table format:

```
## Running Sessions

| Story | Started | Session Name |
|-------|---------|--------------|
| login-flow | 2h 30m ago | saga-story-login-flow-1704067200000 |

To stream logs: `saga sessions logs <session-name>`
To kill session: `saga sessions kill <session-name>`
```

### 3. Session Name Parsing

The session name format is: `saga-story-<storyId>-<timestamp>`

To extract components:
1. Remove the `saga-story-` prefix
2. The last 13 digits (after the final `-`) are the timestamp (Unix milliseconds)
3. Everything between the prefix and the timestamp is the `storyId`

**Example**: `saga-story-auth-login-flow-1704067200000`
- Remove prefix `saga-story-` → `auth-login-flow-1704067200000`
- Last 13 digits after final `-` → timestamp `1704067200000`
- Remainder → storyId `auth-login-flow`
