---
id: update-plugin-skills-publish
title: Update plugin skills and publish workflow
status: ready
epic: cli-dashboard-refactor
tasks:
  - id: t1
    title: Update plugin skills to use plugin-scripts
    status: pending
  - id: t2
    title: Update generate-story agent to use plugin-scripts
    status: pending
  - id: t3
    title: Update CHANGELOG.md for v3.0.0 release
    status: pending
  - id: t4
    title: Update version numbers across packages
    status: pending
  - id: t5
    title: Update root publish skill for @saga-ai/dashboard
    status: pending
  - id: t6
    title: Delete @saga-ai/cli from npm
    status: pending
---

## Context

This story finalizes the CLI dashboard refactor epic by updating all plugin skills and agents to use the new plugin-scripts infrastructure instead of `npx @saga-ai/cli` commands, and updating the root publish skill to handle the new `@saga-ai/dashboard` package.

The SAGA plugin currently invokes CLI commands via `npx @saga-ai/cli <command>` in skill files. After the refactor, orchestration commands (implement, find, worktree, scope-validator) live in `plugin/scripts/` as pre-built JavaScript files. This story updates all references to use `node $SAGA_PLUGIN_ROOT/scripts/<name>.js` instead.

Additionally, the root publish skill (`.claude/skills/publish/SKILL.md`) still references the old `@saga-ai/cli` package. This story updates it to correctly publish `@saga-ai/dashboard` instead.

## Scope Boundaries

**In scope:**
- Updating all plugin skill files (SKILL.md) to replace `npx @saga-ai/cli` with `node $SAGA_PLUGIN_ROOT/scripts/`
- Updating the generate-story agent to use plugin-scripts
- Writing CHANGELOG.md entries for v3.0.0 release
- Updating version numbers in plugin.json and package.json files
- Updating the root publish skill (`.claude/skills/publish/SKILL.md`) to publish `@saga-ai/dashboard` instead of `@saga-ai/cli`
- Deprecating/deleting `@saga-ai/cli` from npm registry

**Out of scope:**
- Creating the plugin-scripts themselves (handled by "Migrate all commands to plugin-scripts" story)
- Creating the dashboard package (handled by "Refactor CLI to standalone dashboard package" story)
- Creating saga-types package (handled by "Create foundation packages" story)
- Modifying the `.saga/` directory structure
- Adding new features to skills or dashboard
- Actually publishing packages or creating releases (handled by running `/publish` after this story)

## Interface

### Inputs

- `plugin/scripts/` directory containing pre-built JavaScript files:
  - `implement.js` - Story implementation orchestrator
  - `find.js` - Fuzzy search for epics/stories
  - `worktree.js` - Git worktree creation
  - `scope-validator.js` - Tool call scope enforcement
  - `sessions-kill.js` - Kill tmux sessions
- `packages/dashboard/` with `@saga-ai/dashboard` package ready for publishing
- `packages/saga-types/` with shared type definitions
- `packages/plugin-scripts/` with source files (for build verification)
- `.claude/skills/publish/SKILL.md` - Current publish skill referencing `@saga-ai/cli`

### Outputs

- Updated plugin skills using `node $SAGA_PLUGIN_ROOT/scripts/<name>.js`
- Updated generate-story agent using plugin-scripts
- CHANGELOG.md with v3.0.0 release notes
- Updated root publish skill that publishes `@saga-ai/dashboard` instead of `@saga-ai/cli`
- `@saga-ai/cli` deprecated/deleted from npm

## Acceptance Criteria

- [ ] All occurrences of `npx @saga-ai/cli` in plugin skills are replaced with `node $SAGA_PLUGIN_ROOT/scripts/`
- [ ] The generate-story agent uses `node $SAGA_PLUGIN_ROOT/scripts/worktree.js` instead of `npx @saga-ai/cli worktree`
- [ ] CHANGELOG.md contains comprehensive v3.0.0 release notes documenting the architecture change
- [ ] plugin.json version is updated to 3.0.0
- [ ] packages/dashboard/package.json version is 3.0.0
- [ ] The root publish skill references `@saga-ai/dashboard` instead of `@saga-ai/cli` in all npm commands, verification steps, and documentation
- [ ] `@saga-ai/cli` is deprecated or deleted from npm
- [ ] All skills function correctly with the new script paths (manual verification)

## Tasks

### t1: Update plugin skills to use plugin-scripts

**Guidance:**
- Search all SKILL.md files for `npx @saga-ai/cli` patterns
- Replace with equivalent `node $SAGA_PLUGIN_ROOT/scripts/<command>.js` calls
- Maintain the same argument structure - the scripts accept the same arguments as CLI commands
- Update any inline documentation that references the CLI

**References:**
- `plugin/skills/execute-story/SKILL.md` - Uses `saga find` and `saga implement`
- `plugin/skills/generate-stories/SKILL.md` - Uses `saga find`
- `plugin/skills/list-sessions/SKILL.md` - Uses `saga sessions list`
- `plugin/skills/dashboard/SKILL.md` - Uses `saga dashboard` (this stays as `npx @saga-ai/dashboard`)
- `plugin/skills/resolve-blocker/SKILL.md` - Uses `saga find`
- `plugin/skills/init/SKILL.md` - Uses `saga init` (this becomes a native skill, check if already converted)

**Avoid:**
- Changing the argument structure or behavior of commands
- Modifying skills that don't use CLI commands
- Breaking the `!` backtick syntax for immediate command execution

**Done when:**
- All `npx @saga-ai/cli` references in SKILL.md files are replaced
- The dashboard skill uses `npx @saga-ai/dashboard` instead of `npx @saga-ai/cli`
- Grep for `npx @saga-ai/cli` in plugin/ returns no results

### t2: Update generate-story agent to use plugin-scripts

**Guidance:**
- The generate-story agent uses `npx @saga-ai/cli worktree` command
- Update to use `node $SAGA_PLUGIN_ROOT/scripts/worktree.js`
- Ensure the same JSON output format is expected

**References:**
- `plugin/agents/generate-story.md` - Agent that spawns for each story generation

**Avoid:**
- Changing the agent's workflow or task structure
- Modifying any non-CLI-related parts of the agent

**Done when:**
- generate-story.md uses `node $SAGA_PLUGIN_ROOT/scripts/worktree.js`
- The worktree command invocation is syntactically correct

### t3: Update CHANGELOG.md for v3.0.0 release

**Guidance:**
- Add a new `## [3.0.0] - YYYY-MM-DD` section at the top
- Document this as a major breaking change release
- Include sections for Added, Changed, Removed
- Reference the epic for full architectural details
- Be comprehensive about what changed

**References:**
- `CHANGELOG.md` - Existing changelog format and style
- `.saga/epics/cli-dashboard-refactor/epic.md` - Full context for changes

**Avoid:**
- Vague descriptions - be specific about what changed
- Missing the breaking changes section

**Done when:**
- CHANGELOG.md has complete v3.0.0 entry
- Breaking changes are clearly documented
- All major changes from the epic are represented

### t4: Update version numbers across packages

**Guidance:**
- Update `plugin/plugin.json` version to "3.0.0"
- Verify `packages/dashboard/package.json` has version "3.0.0" and name "@saga-ai/dashboard"
- Verify `packages/saga-types/package.json` exists with appropriate version
- Verify `packages/plugin-scripts/package.json` exists with appropriate version

**References:**
- `plugin/plugin.json` - Plugin manifest
- `packages/dashboard/package.json` - Dashboard package manifest
- `packages/saga-types/package.json` - Types package manifest
- `packages/plugin-scripts/package.json` - Scripts source package manifest

**Avoid:**
- Changing package names (those are set by other stories)
- Modifying any other fields in package.json unnecessarily

**Done when:**
- plugin.json version is "3.0.0"
- All package versions are consistent and appropriate

### t5: Update root publish skill for @saga-ai/dashboard

**Guidance:**
- Edit `.claude/skills/publish/SKILL.md` to replace all references to `@saga-ai/cli` with `@saga-ai/dashboard`
- Update the skill description from "plugin + CLI" to "plugin + dashboard"
- Update the "Publish CLI to npm" task to publish `@saga-ai/dashboard` instead:
  - Change task subject and active form to reference "dashboard" instead of "CLI"
  - Update the `cd packages/dashboard && pnpm run publish:npm` command (path is already correct)
- Update the "Verify release" task:
  - Change `npm view @saga-ai/cli version` to `npm view @saga-ai/dashboard version`
  - Update the npm package URL from `https://www.npmjs.com/package/@saga-ai/cli` to `https://www.npmjs.com/package/@saga-ai/dashboard`
  - Update the installation command from `npx @saga-ai/cli@latest <command>` to `npx @saga-ai/dashboard@latest`
- Update the Quick Reference section:
  - Change `npm view @saga-ai/cli` to `npm view @saga-ai/dashboard`
- Update the Troubleshooting section:
  - Change `@saga-ai scope` reference to `@saga-ai/dashboard`
  - Update test command if it references `@saga-ai/cli`

**References:**
- `.claude/skills/publish/SKILL.md` - The current publish skill

**Avoid:**
- Changing the overall workflow or task structure of the publish skill
- Removing any existing tasks (gather changes, determine version, changelog, etc.)
- Modifying git tag or GitHub release logic

**Done when:**
- Grep for `@saga-ai/cli` in `.claude/skills/publish/SKILL.md` returns no results
- All npm publish, verify, and documentation references use `@saga-ai/dashboard`
- The skill's description frontmatter is updated

### t6: Delete @saga-ai/cli from npm

**Guidance:**
- Use `npm deprecate` to mark the package as deprecated first
- Deprecation message should point users to @saga-ai/dashboard
- If possible, unpublish the package (only works within 72 hours of publish)
- If unpublish fails, deprecation is acceptable

**References:**
- npm deprecate documentation: `npm deprecate @saga-ai/cli "This package has been replaced by @saga-ai/dashboard"`
- npm unpublish documentation (if applicable)

**Avoid:**
- Leaving the package without any deprecation notice
- Unpublishing if it will break existing installations (deprecation is safer)

**Done when:**
- `@saga-ai/cli` is deprecated with a message pointing to `@saga-ai/dashboard`
- OR `@saga-ai/cli` is unpublished (if within 72-hour window)
