---
id: foundation-packages
title: Create foundation packages (saga-types + plugin-scripts infrastructure)
status: ready
epic: cli-dashboard-refactor
tasks:
  - id: t1
    title: Create packages/saga-types package structure
    status: pending
  - id: t2
    title: Implement Zod schemas for Epic, Story, and Session types
    status: pending
  - id: t3
    title: Implement directory structure types
    status: pending
  - id: t4
    title: Create packages/plugin-scripts package structure
    status: pending
  - id: t5
    title: Configure esbuild to output to plugin/scripts/
    status: pending
  - id: t6
    title: Set up vitest test configuration for plugin-scripts
    status: pending
  - id: t7
    title: Add placeholder script to verify build pipeline
    status: pending
---

## Context

The SAGA CLI is being refactored to separate concerns: the CLI package will become a standalone dashboard tool (`@saga-ai/dashboard`), while orchestration logic moves into the plugin. This story establishes the foundation packages that enable parallel development of other stories.

Two new packages are created:
1. **`packages/saga-types/`** - Shared Zod schemas defining the `.saga/` directory contract (Epic, Story, Session types). These types are used by both the dashboard and plugin-scripts packages.
2. **`packages/plugin-scripts/`** - TypeScript source for plugin scripts that will be compiled and output to `plugin/scripts/`. This package provides the build infrastructure but does not yet contain the migrated commands (that's a separate story).

This story is intentionally minimal - it creates the package scaffolding and type definitions so that other stories can work in parallel on:
- Migrating CLI commands to plugin-scripts
- Refactoring the CLI to the dashboard package
- Updating plugin skills to use the new scripts

## Scope Boundaries

**In scope:**
- Create `packages/saga-types/` package with Zod schema definitions
- Create `packages/plugin-scripts/` package with build infrastructure
- Configure esbuild to output compiled scripts to `plugin/scripts/`
- Set up vitest test configuration for both packages
- Add a placeholder script to verify the build pipeline works
- Update root `pnpm-workspace.yaml` to include new packages

**Out of scope:**
- Migrating any CLI commands (implement.ts, find.ts, etc.) - covered by "Migrate all commands to plugin-scripts" story
- Modifying the existing CLI package - covered by "Refactor CLI to standalone dashboard package" story
- Publishing packages to npm - covered by "Update plugin skills and publish v3.0.0" story
- Creating the `plugin/skills/init/` skill - covered by dashboard refactor story
- Any runtime validation logic beyond the Zod schemas themselves

## Interface

### Inputs

- Existing repository structure at `packages/cli/`
- Epic specification with Zod schema examples and directory structure
- pnpm workspace configuration

### Outputs

- `packages/saga-types/` package exporting:
  - `EpicSchema`, `Epic`, `EpicFrontmatter`, `EpicFrontmatterSchema`
  - `StorySchema`, `Story`, `StoryFrontmatter`, `StoryFrontmatterSchema`, `StoryStatus`, `StoryStatusSchema`
  - `SessionSchema`, `Session`, `SessionStatus`, `SessionStatusSchema`
  - `SagaDirectorySchema` (directory path structure types)
- `packages/plugin-scripts/` package with:
  - Working esbuild configuration outputting to `plugin/scripts/`
  - Vitest test setup
  - A placeholder script (`hello.ts`) that compiles and runs successfully
- Updated `pnpm-workspace.yaml` including both new packages

## Acceptance Criteria

- [ ] `packages/saga-types/` exports all Zod schemas defined in the epic (Epic, Story, Session, directory types)
- [ ] TypeScript types are correctly inferred from Zod schemas via `z.infer<>`
- [ ] `packages/plugin-scripts/` has esbuild config that outputs to `plugin/scripts/`
- [ ] Running `pnpm build` in plugin-scripts produces bundled JS files in `plugin/scripts/`
- [ ] Vitest is configured and `pnpm test` runs successfully in both packages
- [ ] Both packages are included in pnpm workspace and install correctly
- [ ] A placeholder script demonstrates the full build pipeline: TypeScript source in plugin-scripts compiles to runnable JS in plugin/scripts

## Tasks

### t1: Create packages/saga-types package structure

**Guidance:**
- Create standard TypeScript package structure with `src/`, `package.json`, `tsconfig.json`
- Package name should be `@saga-ai/types` (internal, not published)
- Use ESM module format (`"type": "module"` in package.json)
- Include `zod` as a dependency

**References:**
- `packages/cli/package.json` - for package.json structure conventions
- `packages/cli/tsconfig.json` - for TypeScript configuration patterns

**Avoid:**
- Making this package publishable - it's internal only
- Adding any dependencies beyond `zod` and `typescript`
- Creating complex build scripts - just needs `tsc` for type checking

**Done when:**
- `packages/saga-types/package.json` exists with correct name and dependencies
- `packages/saga-types/tsconfig.json` exists with appropriate compiler options
- `packages/saga-types/src/index.ts` exists (can be empty placeholder)
- `pnpm install` succeeds from repository root

### t2: Implement Zod schemas for Epic, Story, and Session types

**Guidance:**
- Follow the exact schema definitions from the epic specification
- Export both the Zod schema (e.g., `StorySchema`) and the inferred type (e.g., `Story`)
- Use `z.infer<typeof Schema>` pattern for type inference
- Organize in separate files: `epic.ts`, `story.ts`, `session.ts`

**References:**
- Epic specification "Data Models" section - contains exact schema definitions
- Epic "Zod Schemas (packages/saga-types/)" section for code examples

**Avoid:**
- Deviating from the schema structure defined in the epic
- Adding optional fields not specified in the epic
- Creating circular dependencies between schema files

**Done when:**
- `packages/saga-types/src/epic.ts` exports `EpicSchema`, `Epic`, `EpicFrontmatterSchema`, `EpicFrontmatter`
- `packages/saga-types/src/story.ts` exports `StorySchema`, `Story`, `StoryFrontmatterSchema`, `StoryFrontmatter`, `StoryStatusSchema`, `StoryStatus`
- `packages/saga-types/src/session.ts` exports `SessionSchema`, `Session`, `SessionStatusSchema`, `SessionStatus`
- All exports are re-exported from `src/index.ts`
- TypeScript compiles without errors

### t3: Implement directory structure types

**Guidance:**
- Define types representing the `.saga/` directory structure paths
- These are utility types for constructing/validating paths, not Zod schemas for parsing
- Include types for epic paths, story paths, worktree paths

**References:**
- Epic ".saga/ Directory Structure" section showing the folder hierarchy
- How `finder.ts` and `project-discovery.ts` currently construct paths

**Avoid:**
- Over-engineering - these should be simple path helper types
- Creating runtime path manipulation functions (that's for the commands)

**Done when:**
- `packages/saga-types/src/directory.ts` exports directory structure types
- Types cover: epic directory, story directory, worktree directory, archive directory
- Types are re-exported from `src/index.ts`

### t4: Create packages/plugin-scripts package structure

**Guidance:**
- Create standard TypeScript package structure with `src/`, `package.json`, `tsconfig.json`
- Package name should be `@saga-ai/plugin-scripts` (internal, not published)
- Add workspace dependency on `@saga-ai/types`
- Use ESM module format

**References:**
- `packages/cli/package.json` - for package structure conventions
- Epic "Repository Structure" section showing plugin-scripts location

**Avoid:**
- Adding CLI-specific dependencies yet (commander, express, etc.) - those come with command migration
- Making this package publishable

**Done when:**
- `packages/plugin-scripts/package.json` exists with correct name and workspace dependency
- `packages/plugin-scripts/tsconfig.json` exists
- `packages/plugin-scripts/src/` directory exists
- Package can import from `@saga-ai/types`

### t5: Configure esbuild to output to plugin/scripts/

**Guidance:**
- Create `esbuild.config.js` (or `.mjs`) with build configuration
- Output should go to `../../plugin/scripts/` relative to plugin-scripts package
- Each source file in `src/` should produce a separate bundled JS file
- Bundle all dependencies (external only Node built-ins)
- Add `"build"` script to package.json

**References:**
- `packages/cli/package.json` `build:cli` script - shows esbuild usage pattern
- Epic states scripts should be "Pre-built" and "committed to `plugin/scripts/`"

**Avoid:**
- Creating a single mega-bundle - each command should be a separate file
- Minification that makes debugging difficult
- Forgetting the shebang for executable scripts

**Done when:**
- `packages/plugin-scripts/esbuild.config.mjs` exists with build configuration
- `pnpm build` in plugin-scripts outputs files to `plugin/scripts/`
- Output files are standalone (dependencies bundled)
- Output files have appropriate shebang (`#!/usr/bin/env node`)

### t6: Set up vitest test configuration for plugin-scripts

**Guidance:**
- Create `vitest.config.ts` with appropriate test configuration
- Configure to find tests in `src/**/*.test.ts` pattern
- Add `"test"` script to package.json

**References:**
- `packages/cli/vitest.config.ts` - for vitest configuration patterns (if exists)
- `packages/cli/package.json` test scripts

**Avoid:**
- Complex test configuration - keep it minimal
- Browser test configuration (not needed for CLI scripts)

**Done when:**
- `packages/plugin-scripts/vitest.config.ts` exists
- `pnpm test` runs successfully (even if no tests yet)
- Test configuration finds `*.test.ts` files in src

### t7: Add placeholder script to verify build pipeline

**Guidance:**
- Create a simple `hello.ts` script that outputs a message and exits
- This verifies the entire build pipeline works end-to-end
- Add a corresponding test file
- Delete this placeholder when real scripts are migrated

**References:**
- Any simple CLI script pattern
- The script should be runnable via `node plugin/scripts/hello.js`

**Avoid:**
- Complex logic - this is just a pipeline verification
- Forgetting to test that the built output actually runs

**Done when:**
- `packages/plugin-scripts/src/hello.ts` exists with simple console output
- `packages/plugin-scripts/src/hello.test.ts` exists with at least one test
- `pnpm build` produces `plugin/scripts/hello.js`
- Running `node plugin/scripts/hello.js` outputs expected message
- `pnpm test` passes
