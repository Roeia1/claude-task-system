# Dummy Test Skill

A minimal test skill that confirms the command/skill system is working correctly.

## Purpose

This skill serves as:
1. A verification tool to test that commands activate skills correctly
2. A reference implementation for creating new commands and skills
3. A simple example of the command/skill pattern

## Process

When this skill is activated, perform these steps:

1. **Output a confirmation message**:
   ```
   Dummy test executed successfully!

   This confirms:
   - The /dummy-test command was recognized
   - The skill instructions were loaded from ${CLAUDE_PLUGIN_ROOT}
   - The skill executed without errors
   ```

2. **Report completion**: No further action needed.

## Usage

Invoke this skill by running:
```
/dummy-test
```

## Notes

- This is intentionally minimal - it exists to demonstrate the pattern
- No files are created or modified
- No external dependencies required
- Useful for verifying plugin installation is working
