# Feature: Plugin Instructions Refactor

**Created:** 2026-01-03
**Status:** Draft
**Feature ID:** 005

## Overview

Refactor the plugin's skill and command structure to separate content from metadata by introducing a centralized `plugin/instructions/` folder. Skills and commands become thin wrappers (frontmatter + reference) that point to shared instruction files.

## Motivation

Currently, each `SKILL.md` file contains both YAML frontmatter metadata AND full instructional content. This creates several issues:

1. **No content reuse** - Skills and commands cannot share the same instructions
2. **Coupled concerns** - Metadata (name, description) is mixed with behavior (instructions)
3. **Limited flexibility** - Non-internal skills cannot also be invoked as commands

This refactor enables:
- Skills and commands to reference the same instruction content
- Cleaner separation between registration metadata and execution instructions
- Non-internal skills to be accessible both as skills AND slash commands

## User Stories

### Story 1: Plugin Maintainer Updating Instructions

**As a** plugin maintainer
**I want** skill/command instructions stored in a single location
**So that** I only need to update content in one place when making changes

**Acceptance Criteria:**
- [ ] Instructions for each skill/command exist in exactly one file
- [ ] Both SKILL.md and command.md reference the exact same instructions file
- [ ] Changing the instructions file updates behavior for both skill and command
- [ ] Content is moved verbatim - no edits to instruction content

### Story 2: User Invoking Feature via Command

**As a** claude-task-system user
**I want** to invoke non-internal skills as slash commands (e.g., `/task-list`)
**So that** I have flexibility in how I trigger functionality

**Acceptance Criteria:**
- [ ] All 8 non-internal skills have corresponding command files
- [ ] Commands are registered in plugin.json
- [ ] Invoking the command produces the same behavior as the skill

### Story 3: Developer Understanding Plugin Structure

**As a** developer exploring the plugin
**I want** a clear separation between metadata and instructions
**So that** I can quickly understand what each component does

**Acceptance Criteria:**
- [ ] SKILL.md files contain only frontmatter + content reference
- [ ] Command files contain only frontmatter + content reference
- [ ] All detailed instructions live in `plugin/instructions/`

## Functional Requirements

1. Create `plugin/instructions/` directory with subdirectory for each skill
2. Extract content (everything after frontmatter) from each SKILL.md into `instructions/[name]/INSTRUCTIONS.md` **verbatim - no content changes**
3. Move supporting artifacts (templates, workflows, scripts) to instructions folders
4. Convert SKILL.md files to thin wrappers with format:
   ```yaml
   ---
   name: [skill-name]
   description: "[activation description]"
   ---

   Content: ../../instructions/[skill-name]/INSTRUCTIONS.md
   ```
5. Create command files for all 8 non-internal skills in `plugin/commands/`, each referencing the **same** instructions file as the corresponding skill:
   ```yaml
   ---
   description: "[command description]"
   ---

   Content: ../instructions/[skill-name]/INSTRUCTIONS.md
   ```
6. Update `plugin.json` to register new commands
7. Update internal path references in instruction files to reflect new locations

## Non-Functional Requirements

### Maintainability
- Single source of truth for each skill's instructions
- Clear naming conventions (INSTRUCTIONS.md for content)

### Backwards Compatibility
- Existing skill invocation patterns must continue to work
- No changes to user-facing activation keywords

### Organization
- Logical grouping of related files (instructions + templates + scripts)
- Consistent directory structure across all skills

## Out of Scope

- Changing skill behavior or functionality
- Adding new skills or commands (only creating command wrappers for existing skills)
- Modifying activation keywords or descriptions
- Editing or improving instruction content - this is a **structural refactor only**, content moves verbatim

## Success Metrics

- **Metric 1**: All 12 skills converted to thin wrapper format
- **Metric 2**: All 8 non-internal skills have corresponding commands
- **Metric 3**: Zero content duplication between skills and commands
- **Metric 4**: All existing functionality works unchanged after refactor

## Dependencies

- **Plugin infrastructure**: Assumes Claude Code supports `Content:` directive for file references
- **plugin.json schema**: Assumes commands can be added to the commands array

## Open Questions

- [x] Does Claude Code properly resolve `Content: path/to/file.md` references in skills/commands? **Yes, confirmed.**
- [x] Should the init command also move to instructions/ or stay special? **Keep init.md as-is with inline content.**

## References

- Current skills: `plugin/skills/*/SKILL.md` (12 total)
- Current commands: `plugin/commands/init.md` (1 total)
- Plugin manifest: `plugin/.claude-plugin/plugin.json`

---

**Note**: This document describes WHAT to build, not HOW. Technical implementation details belong in plan.md.
