---
name: my-math-skill
description: A simple math skill that takes a number and returns the number plus 1. Use this skill when asked to add one to a number or test math operations.
---

# My Math Skill

A simple skill for testing pretooluse hook functionality.

## Instructions

When this skill is invoked:

1. **Receive the number** from the user's request
2. **Add 1** to the provided number
3. **Return the result** clearly stating the input and output

## Input

- **number**: A numeric value (integer or float)

## Process

1. Validate the input is a valid number
2. Calculate: `result = number + 1`
3. Return the result

## Examples

**User**: "Use my-math-skill with 5"
**Response**: "Input: 5, Result: 6"

**User**: "Add one to 42 using the math skill"
**Response**: "Input: 42, Result: 43"

**User**: "my-math-skill with -3"
**Response**: "Input: -3, Result: -2"
