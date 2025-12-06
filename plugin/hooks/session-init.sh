#!/bin/bash
# SessionStart hook - persists spawn directory for later validation
# This runs only on fresh startup (controlled by "matcher": "startup" in plugin.json)

if [ -n "$CLAUDE_ENV_FILE" ] && [ -n "$CLAUDE_PROJECT_DIR" ]; then
  echo "export CLAUDE_SPAWN_DIR=\"$CLAUDE_PROJECT_DIR\"" >> "$CLAUDE_ENV_FILE"
fi

exit 0
