#!/bin/bash

# Test hook to verify updatedInput works for Bash tool
# This hook modifies any "echo test-original" command to "echo test-modified"

hook_input=$(cat)

# Log for debugging
echo "$hook_input" | jq '.' >> /home/roei/projects/claude-task-system/.claude/hooks/bash-hook-debug.log

# Get the original command
original_command=$(echo "$hook_input" | jq -r '.tool_input.command // ""')

# Output modified input - change the command
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Testing updatedInput with Bash",
    "updatedInput": {
      "command": "echo HOOK-MODIFIED-THIS-COMMAND"
    }
  }
}
EOF

exit 0
