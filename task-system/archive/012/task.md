# Task 012: Plugin Instructions Refactor

## Feature Context

**Feature**: [005-plugin-instructions-refactor](../../../features/005-plugin-instructions-refactor/feature.md)
**Technical Plan**: [plan.md](../../../features/005-plugin-instructions-refactor/plan.md)

## Overview

Refactor the plugin structure to separate content from metadata by creating a centralized `plugin/instructions/` folder. This task extracts instruction content from all 12 SKILL.md files into dedicated INSTRUCTIONS.md files, converts skills to thin wrappers with Content: references, creates 8 command files for non-internal skills, and updates plugin.json.

This refactor enables:
- Single source of truth for skill instructions (no duplication)
- Non-internal skills accessible as both skills AND slash commands
- Cleaner separation between registration metadata and execution instructions

## Task Type

refactor - Code improvements without behavior changes

## Priority

P2 - Important structural improvement that enables future flexibility, but not blocking active development

## Dependencies

None

## Objectives

- [ ] Create centralized `plugin/instructions/` directory structure with 12 subdirectories
- [ ] Extract content from all 12 SKILL.md files into INSTRUCTIONS.md files
- [ ] Convert all 12 SKILL.md files to thin wrappers (frontmatter + Content: reference)
- [ ] Move all supporting artifacts (templates, workflows, scripts) to instructions/ subdirectories
- [ ] Create 8 command files for non-internal skills
- [ ] Update plugin.json with 9 commands (existing init + 8 new)
- [ ] Verify plugin loads and functions correctly

## Sub-tasks

1. [ ] Create `plugin/instructions/` directory with 12 subdirectories matching skill names
2. [ ] Migrate simple skills (no artifacts): task-list, task-cleanup, task-resume, journal-write, task-merge
3. [ ] Migrate skills with templates: architecture-decisions, feature-definition, feature-planning, journal-create
4. [ ] Migrate task-generation (templates + scripts subdirectories)
5. [ ] Migrate task-builder (templates + instructions subdirectories)
6. [ ] Migrate task-start (workflows + scripts + loose .md files) - most complex
7. [ ] Create 8 command files: task-list.md, task-start.md, task-cleanup.md, task-resume.md, feature-definition.md, feature-planning.md, architecture-decisions.md, task-generation.md
8. [ ] Update plugin.json to register all 9 commands
9. [ ] Verify no orphaned files remain in skill directories
10. [ ] Test plugin loads correctly

## Technical Approach

### Files to Create

**New instructions directory structure:**
- `plugin/instructions/task-list/INSTRUCTIONS.md`
- `plugin/instructions/task-start/INSTRUCTIONS.md` + workflows/, scripts/, journaling-guidelines.md, worktree-flow.md
- `plugin/instructions/task-cleanup/INSTRUCTIONS.md`
- `plugin/instructions/task-resume/INSTRUCTIONS.md`
- `plugin/instructions/feature-definition/INSTRUCTIONS.md` + templates/
- `plugin/instructions/feature-planning/INSTRUCTIONS.md` + templates/
- `plugin/instructions/architecture-decisions/INSTRUCTIONS.md` + templates/
- `plugin/instructions/task-generation/INSTRUCTIONS.md` + templates/, scripts/
- `plugin/instructions/task-builder/INSTRUCTIONS.md` + templates/, instructions/
- `plugin/instructions/task-merge/INSTRUCTIONS.md`
- `plugin/instructions/journal-create/INSTRUCTIONS.md` + journal-template.md
- `plugin/instructions/journal-write/INSTRUCTIONS.md`

**New command files:**
- `plugin/commands/task-list.md`
- `plugin/commands/task-start.md`
- `plugin/commands/task-cleanup.md`
- `plugin/commands/task-resume.md`
- `plugin/commands/feature-definition.md`
- `plugin/commands/feature-planning.md`
- `plugin/commands/architecture-decisions.md`
- `plugin/commands/task-generation.md`

### Files to Modify

**All 12 SKILL.md files converted to thin wrappers:**
- `plugin/skills/task-list/SKILL.md`
- `plugin/skills/task-start/SKILL.md`
- `plugin/skills/task-cleanup/SKILL.md`
- `plugin/skills/task-resume/SKILL.md`
- `plugin/skills/feature-definition/SKILL.md`
- `plugin/skills/feature-planning/SKILL.md`
- `plugin/skills/architecture-decisions/SKILL.md`
- `plugin/skills/task-generation/SKILL.md`
- `plugin/skills/task-builder/SKILL.md`
- `plugin/skills/task-merge/SKILL.md`
- `plugin/skills/journal-create/SKILL.md`
- `plugin/skills/journal-write/SKILL.md`

**Plugin manifest:**
- `plugin/.claude-plugin/plugin.json`

### Implementation Steps

1. **Foundation**: Create `plugin/instructions/` with all 12 subdirectories

2. **Migrate simple skills (no artifacts)**: For each of task-list, task-cleanup, task-resume, journal-write, task-merge:
   - Extract content after frontmatter from SKILL.md
   - Write content to `instructions/{name}/INSTRUCTIONS.md`
   - Replace SKILL.md content with thin wrapper format

3. **Migrate skills with templates**: For architecture-decisions, feature-definition, feature-planning, journal-create:
   - Extract content to INSTRUCTIONS.md
   - Move templates/ directory (or journal-template.md) to instructions/{name}/
   - Update internal path references in INSTRUCTIONS.md
   - Replace SKILL.md with thin wrapper

4. **Migrate task-generation**:
   - Extract content to INSTRUCTIONS.md
   - Move templates/ and scripts/ to instructions/task-generation/
   - Update path references
   - Replace SKILL.md with thin wrapper

5. **Migrate task-builder**:
   - Extract content to INSTRUCTIONS.md
   - Move templates/ and instructions/ subdirectories
   - Update path references
   - Replace SKILL.md with thin wrapper

6. **Migrate task-start (most complex)**:
   - Extract content to INSTRUCTIONS.md
   - Move workflows/, scripts/, journaling-guidelines.md, worktree-flow.md
   - Update all internal path references
   - Replace SKILL.md with thin wrapper

7. **Create 8 command files**: Each with format:
   ```yaml
   ---
   description: "[user-facing description]"
   argument-hint: "[expected args]"
   ---

   Content: ../instructions/{name}/INSTRUCTIONS.md
   ```

8. **Update plugin.json**: Add all 9 commands to the commands array

### Path Reference Patterns

| Source | Target | Relative Path |
|--------|--------|---------------|
| `plugin/skills/{name}/SKILL.md` | `plugin/instructions/{name}/INSTRUCTIONS.md` | `../../instructions/{name}/INSTRUCTIONS.md` |
| `plugin/commands/{name}.md` | `plugin/instructions/{name}/INSTRUCTIONS.md` | `../instructions/{name}/INSTRUCTIONS.md` |

### Thin Wrapper Formats

**SKILL.md (thin wrapper):**
```yaml
---
name: task-start
description: "ONLY activate on DIRECT user request..."
---

Content: ../../instructions/task-start/INSTRUCTIONS.md
```

**command.md (thin wrapper):**
```yaml
---
description: "Start working on a task"
argument-hint: "[task-id]"
---

Content: ../instructions/task-start/INSTRUCTIONS.md
```

### Testing Strategy

- **Unit Tests**: Not applicable - this is a structural refactor
- **Integration Tests**: Manual verification that plugin loads
- **Smoke Tests**: Invoke several skills/commands to verify they still work
- **Verification Checklist**:
  - Each SKILL.md contains only frontmatter + Content: reference
  - Each command.md follows the same pattern
  - All artifacts exist in instructions/ subdirectories
  - No orphaned files in skill directories
  - plugin.json contains all 9 commands

### Edge Cases to Handle

- **Path references in instruction files**: INSTRUCTIONS.md files may reference relative paths to templates, workflows, etc. These must be updated to reflect the new directory structure (paths change from `./templates/` to `templates/` or similar)
- **Scripts with shebangs**: Shell scripts should be moved as-is without modification
- **Nested instructions directory**: task-builder has an `instructions/` subdirectory inside it - ensure this doesn't conflict with the top-level `plugin/instructions/`
- **Content extraction**: Ensure frontmatter is properly separated from content (everything after the closing `---` is content)

## Risks & Concerns

- **Path reference breakage**: Internal file references may break if not all paths are updated correctly. Mitigation: Carefully audit each INSTRUCTIONS.md for relative path references.
- **Plugin loading**: If Content: directive doesn't work as expected, plugin functionality breaks. Mitigation: Test incrementally after each batch of migrations.
- **Artifact ordering**: Files must be moved before SKILL.md is replaced to avoid broken references during transition.

## Resources & Links

- [Plugin skills directory](plugin/skills/)
- [Plugin commands directory](plugin/commands/)
- [Plugin manifest](plugin/.claude-plugin/plugin.json)
- [Feature definition](task-system/features/005-plugin-instructions-refactor/feature.md)
- [Technical plan](task-system/features/005-plugin-instructions-refactor/plan.md)

## Acceptance Criteria

- [ ] 12 `instructions/{name}/INSTRUCTIONS.md` files exist with extracted content
- [ ] 12 `skills/{name}/SKILL.md` files are thin wrappers (frontmatter + Content: ref only)
- [ ] 8 `commands/{name}.md` files created for non-internal skills (task-list, task-start, task-cleanup, task-resume, feature-definition, feature-planning, architecture-decisions, task-generation)
- [ ] All artifacts (templates/, workflows/, scripts/, loose .md files) moved to `instructions/` subdirectories
- [ ] `plugin.json` updated with 9 commands (init + 8 new)
- [ ] No orphaned files remain in old skill directories (only SKILL.md wrapper)
- [ ] Plugin loads without errors
- [ ] Invoking a skill produces same behavior as before refactor
- [ ] Invoking a new command produces same behavior as corresponding skill
