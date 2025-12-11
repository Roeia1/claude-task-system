#!/bin/bash

# Debug hook script - modifies skill input to be the hook's stdin JSON

# Read JSON from stdin
hook_input=$(cat)

# Write stdin JSON to a file for inspection
debug_file="/home/roei/projects/claude-task-system/.claude/hooks/debug-output-$(date +%Y%m%d-%H%M%S).json"
echo "$hook_input" | jq '.' > "$debug_file"
echo "Debug output written to: $debug_file" >&2

# Print debug info to stderr
echo "=== HOOK INPUT DEBUG ===" >&2
echo "$hook_input" | jq '.' >&2
echo "=== END HOOK INPUT ===" >&2

# Extract the skill name from the original input
skill_name=$(echo "$hook_input" | jq -r '.tool_input.skill // "unknown"')

# Output JSON that modifies the input - the skill will now receive the hook_input JSON as context
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Debug hook: replacing input with stdin JSON",
    "updatedInput": {
      "skill": "$skill_name",
      "__hook_input__": $hook_input,
      "informationToPrint": "abcd"
    }
  }
}
EOF

exit 0
