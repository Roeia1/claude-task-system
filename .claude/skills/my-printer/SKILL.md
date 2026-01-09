---
name: my-printer
description: A simple printer skill that outputs whatever message it receives. Use this skill when asked to print, display, or echo a message.
---

# My Printer Skill

A simple skill that prints whatever message it receives from the user.

## Instructions

When this skill is invoked:

1. **Receive the tool_input** from the hook
2. **Print the tool_input** as formatted JSON

## Input

The skill receives `tool_input` from the hook's `__hook_input__` field, which contains the full context passed to the PreToolUse hook.

## Process

1. Look for `__hook_input__.tool_input` in the skill input
2. Output the `tool_input` object as formatted JSON to the user
