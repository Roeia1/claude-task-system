---
id: flatten-package-structure
title: Flatten Dashboard Package Structure
status: ready
epic: dashboard-restructure-and-testing
tasks:
  - id: t1
    title: Audit Current Dependencies
    status: pending
  - id: t2
    title: Move Client Dependencies to CLI package.json
    status: pending
  - id: t3
    title: Update Vite Configuration
    status: pending
  - id: t4
    title: Update Build Scripts
    status: pending
  - id: t5
    title: Remove Nested package.json
    status: pending
  - id: t6
    title: Verify Build and Development Workflow
    status: pending
---

## Context

The SAGA dashboard is a React frontend served by the CLI's Express backend. Currently, the dashboard has a nested package structure where `packages/cli/src/client/` contains its own `package.json` with separate dependencies. This creates unnecessary complexity:

- Two `package.json` files to maintain within the same logical package
- Dependency version mismatches are possible between CLI and client
- Build tooling needs to handle two separate dependency trees
- Developers must run `pnpm install` in multiple locations

This story consolidates all dependencies into the main CLI `package.json`, updates the Vite build configuration to work from the flattened structure, and ensures the build process produces correct output. After this change, there will be a single `package.json` for the entire CLI package (including its dashboard client).

## Scope Boundaries

**In scope:**
- Moving all dependencies from `src/client/package.json` to the main CLI `package.json`
- Updating Vite configuration paths to work from the new structure
- Updating CLI build scripts to include client build steps
- Removing the nested `src/client/package.json` file
- Verifying the build output is correct (`pnpm build` produces working CLI and dashboard)
- Ensuring development workflow (`vite dev` for client) still works

**Out of scope:**
- Separating dashboard into its own npm package (explicitly excluded by epic)
- Adding new dependencies or features to the dashboard
- Storybook setup (covered by "Storybook Setup and Component Stories" story)
- Playwright test setup (covered by "Playwright Integration Tests" and "Playwright E2E Tests" stories)
- Visual regression testing (covered by "Visual Regression Testing" story)
- Bug fixes to epic display (will be discovered and fixed during E2E testing story)
- Backend changes (Express server configuration unchanged)

## Interface

### Inputs

- Current `packages/cli/package.json` with CLI-only dependencies
- Current `packages/cli/src/client/package.json` with React/Vite dependencies
- Current `packages/cli/src/client/vite.config.ts` configuration
- Existing client source code in `packages/cli/src/client/src/`

### Outputs

- Unified `packages/cli/package.json` containing all dependencies
- Updated `packages/cli/src/client/vite.config.ts` with corrected paths
- Removal of `packages/cli/src/client/package.json`
- Working `pnpm build` command that produces both CLI bundle and client build
- Working `pnpm dev:client` command for client development

## Acceptance Criteria

- [ ] Single `package.json` exists at `packages/cli/package.json` (no nested package.json in src/client/)
- [ ] All React, Vite, Radix, and Tailwind dependencies are in the main package.json
- [ ] `pnpm install` from packages/cli installs all dependencies (CLI and client)
- [ ] `pnpm build` produces working CLI bundle at `dist/cli.cjs`
- [ ] Client build output is generated at `src/client/dist/` (or configured output location)
- [ ] `pnpm test` continues to pass all existing tests
- [ ] Development workflow: `pnpm dev:client` starts Vite dev server with hot reload
- [ ] Running `saga dashboard` serves the built client correctly

## Tasks

### t1: Audit Current Dependencies

**Guidance:**
- Compare dependencies between `packages/cli/package.json` and `packages/cli/src/client/package.json`
- Identify any version conflicts or duplicates
- Note which dependencies are production vs development
- Document the merge strategy for each dependency category

**References:**
- `packages/cli/package.json` - current CLI dependencies
- `packages/cli/src/client/package.json` - current client dependencies

**Avoid:**
- Making changes in this task - audit only
- Ignoring devDependencies (they need to be merged too)

**Done when:**
- Full list of dependencies to merge is documented
- Version conflict resolution plan is clear
- No duplicate dependencies with conflicting versions

### t2: Move Client Dependencies to CLI package.json

**Guidance:**
- Add all client dependencies to the main package.json
- Place React, Radix, and runtime libraries in `dependencies`
- Place Vite, TypeScript (for client), and build tools in `devDependencies`
- Use the newer version when resolving conflicts
- Keep dependency organization logical (group related packages)

**References:**
- `packages/cli/src/client/package.json` lines 12-38 for all dependencies
- pnpm workspace documentation for monorepo patterns

**Avoid:**
- Removing existing CLI dependencies
- Adding dependencies that aren't actually used
- Mixing production and development dependencies incorrectly

**Done when:**
- All client dependencies appear in main package.json
- `pnpm install` from packages/cli succeeds
- No version conflicts in lockfile

### t3: Update Vite Configuration

**Guidance:**
- Update `vite.config.ts` to resolve paths correctly from new structure
- The `@` alias should still point to `./src` relative to client directory
- Ensure build output directory is configured appropriately
- Keep proxy configuration unchanged (still needed for dev)

**References:**
- `packages/cli/src/client/vite.config.ts` - current configuration
- Vite documentation on `resolve.alias` and `root` configuration

**Avoid:**
- Changing the proxy configuration (still needed for API/WebSocket)
- Moving client source files (they stay in `src/client/src/`)
- Breaking the `@` import alias that components use

**Done when:**
- `pnpm exec vite build --config src/client/vite.config.ts` produces correct output
- `@` imports resolve correctly in built output
- No path resolution errors during build

### t4: Update Build Scripts

**Guidance:**
- Add npm scripts for client development and build
- Consider a combined build script that builds both CLI and client
- Use `--config` flag to point Vite to the correct config location
- Ensure scripts work from packages/cli directory

**References:**
- Current CLI build script: `esbuild src/cli.ts --bundle --platform=node --outfile=dist/cli.cjs --format=cjs --banner:js='#!/usr/bin/env node'`
- Vite CLI options for specifying config location

**Avoid:**
- Breaking the existing `pnpm build` command (it should still build CLI)
- Requiring developers to cd into src/client/
- Complex script dependencies that are hard to understand

**Done when:**
- `pnpm build` builds CLI bundle
- `pnpm build:client` builds client (or combined with CLI build)
- `pnpm dev:client` starts Vite dev server for hot reload
- All scripts run from packages/cli directory

### t5: Remove Nested package.json

**Guidance:**
- Delete `packages/cli/src/client/package.json` after confirming everything works
- Also remove `packages/cli/src/client/node_modules/` if it exists
- Update any references to the nested package.json (unlikely but check)
- Consider keeping `pnpm-lock.yaml` clean by regenerating after removal

**References:**
- `packages/cli/src/client/package.json` - file to remove
- pnpm documentation on workspace cleanup

**Avoid:**
- Removing before build scripts are verified working
- Leaving orphaned node_modules directory
- Breaking tsconfig.json references (if any pointed to nested package)

**Done when:**
- `packages/cli/src/client/package.json` is deleted
- No node_modules in src/client/
- `pnpm install` and `pnpm build` still work

### t6: Verify Build and Development Workflow

**Guidance:**
- Run full test suite to ensure nothing broke
- Test the development workflow end-to-end
- Start dashboard server and verify client loads correctly
- Check that hot reload works in development mode

**References:**
- `pnpm test` for running test suite
- `saga dashboard` command for testing the built dashboard

**Avoid:**
- Skipping manual verification of the running dashboard
- Ignoring warnings in build output
- Leaving uncommitted changes

**Done when:**
- `pnpm test` passes all tests
- `pnpm build` produces valid CLI and client bundles
- `saga dashboard` serves the client correctly
- Hot reload works with `pnpm dev:client`
- No build warnings related to the restructuring
