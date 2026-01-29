---
name: dashboard
description: Open the SAGA dashboard in your browser
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - Bash
---

# Dashboard Skill

Open the SAGA dashboard to visualize epics, stories, and execution progress.

## Instructions

1. Start the dashboard server using Bash tool with `run_in_background: true`:

```bash
npx @saga-ai/cli@latest dashboard
```

2. Open the dashboard in the user's default browser:

```bash
open http://localhost:3847
```

3. Report to the user:

> Dashboard is running at http://localhost:3847
>
> The server is running in the background. To stop it, find and kill the process:
> ```bash
> pkill -f "saga dashboard"
> ```
