#!/bin/bash
# PreToolUse hook: block npm/npx and suggest pnpm equivalents
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

case "$COMMAND" in
  npm\ *)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Do not use npm. Use pnpm instead."}}'
    ;;
  npx\ *)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Do not use npx. Use pnpm dlx (or pnpm exec for local bins) instead."}}'
    ;;
esac
