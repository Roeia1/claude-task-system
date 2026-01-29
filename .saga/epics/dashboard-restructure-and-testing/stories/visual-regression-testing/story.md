---
id: visual-regression-testing
title: Visual Regression Testing with Storybook
status: ready
epic: dashboard-restructure-and-testing
tasks:
  - id: t1
    title: Configure Storybook visual snapshot testing
    status: pending
  - id: t2
    title: Add visual snapshot tests to existing stories
    status: pending
  - id: t3
    title: Add package.json scripts and integrate with test command
    status: pending
---

## Context

The SAGA dashboard is a React frontend served by an Express backend within the CLI package. As the dashboard evolves, unintended visual changes can slip through code review - a button might shift, colors might change, or layouts might break. Visual regression testing catches these issues by comparing screenshots against known-good baselines.

This story establishes visual regression testing using Storybook's existing integration with Vitest. The project already has Storybook set up with `@storybook/addon-vitest` and stories for all major components and pages. We'll add visual snapshot testing to these existing stories using Vitest's snapshot capabilities.

## Scope Boundaries

**In scope:**
- Configuring Vitest snapshot testing for Storybook stories
- Adding visual snapshot assertions to existing component stories
- Adding visual snapshot assertions to existing page stories
- Creating `test:visual` script in package.json
- Integrating visual tests into the main `test` script

**Out of scope:**
- GitHub workflows or CI pipeline changes (not needed - local testing only)
- Chromatic or other paid visual testing services
- Creating new Storybook stories (already covered by "Storybook Setup" story)
- Cross-browser visual testing
- Mobile/responsive visual testing
- Playwright-based visual testing

## Interface

### Inputs

- **Existing Storybook stories**: Component and page stories in `src/client/src/components/*.stories.tsx` and `src/client/src/pages/*.stories.tsx`
- **Vitest Storybook integration**: Existing `@storybook/addon-vitest` setup in `vitest.config.ts`
- **Test infrastructure**: Existing storybook test project configuration

### Outputs

- **Visual snapshot files**: Committed snapshot files in `__snapshots__/` directories
- **Updated package.json**: New `test:visual` script integrated with main `test` command
- **Updated vitest setup**: Configuration for visual snapshot testing

## Acceptance Criteria

- [ ] Visual snapshot tests run for all existing component stories (StatusBadge, Breadcrumb, Layout)
- [ ] Visual snapshot tests run for all existing page stories (EpicList, EpicDetail, StoryDetail)
- [ ] `pnpm test:visual` runs visual snapshot tests
- [ ] `pnpm test:visual:update` updates baselines when intentional changes are made
- [ ] Visual tests are included in the main `pnpm test` command
- [ ] Baseline snapshots are committed to the repository

## Tasks

### t1: Configure Storybook visual snapshot testing

**Guidance:**
- Update `src/client/.storybook/vitest.setup.ts` to enable visual snapshot testing
- Use Vitest's `toMatchSnapshot()` or `toMatchImageSnapshot()` for visual comparisons
- Configure snapshot directory structure to store baselines alongside stories
- Ensure consistent rendering by disabling animations in Storybook preview

**References:**
- Existing Storybook vitest setup: `packages/cli/src/client/.storybook/vitest.setup.ts`
- Vitest snapshot docs: https://vitest.dev/guide/snapshot.html
- Storybook addon-vitest: `packages/cli/vitest.config.ts`

**Avoid:**
- Complex configuration that makes tests brittle
- External services or dependencies

**Done when:**
- Vitest is configured to capture and compare visual snapshots
- A simple test can capture and verify a component's visual appearance
- Snapshot files are created in a predictable location

### t2: Add visual snapshot tests to existing stories

**Guidance:**
- Add visual snapshot test assertions to existing stories using play functions or separate test files
- Cover all component stories:
  - `StatusBadge.stories.tsx` - all status variants
  - `Breadcrumb.stories.tsx` - all navigation states
  - `Layout.stories.tsx` - different layout configurations
- Cover all page stories:
  - `EpicList.stories.tsx` - list with data, empty state, loading, error
  - `EpicDetail.stories.tsx` - detail view with stories, empty, loading, error
  - `StoryDetail.stories.tsx` - with tasks, journal, different states
- Ensure consistent viewport size for reproducible snapshots

**References:**
- Existing stories: `packages/cli/src/client/src/components/*.stories.tsx`
- Existing page stories: `packages/cli/src/client/src/pages/*.stories.tsx`

**Avoid:**
- Testing every single story variant (focus on key visual states)
- Flaky tests from animations or dynamic content

**Done when:**
- All major component stories have visual snapshot assertions
- All page stories have visual snapshot assertions for key states
- Running tests generates baseline snapshots
- Snapshots are committed to version control

### t3: Add package.json scripts and integrate with test command

**Guidance:**
- Add `test:visual` script to run visual snapshot tests
- Add `test:visual:update` script to update baselines (`vitest run --project=storybook --update`)
- Update the main `test` script to include visual tests
- The test script should run unit tests, storybook tests (which now include visual), integration tests, and e2e tests

**References:**
- Current package.json test scripts: `packages/cli/package.json`
- Existing test command: `concurrently -g "vitest run" "pnpm run test:integration" "pnpm run test:e2e"`

**Avoid:**
- Breaking existing test commands
- Making visual tests slow down the test suite significantly

**Done when:**
- `pnpm test:visual` runs visual snapshot tests
- `pnpm test:visual:update` updates baselines
- `pnpm test` includes visual tests in its execution
- All tests pass when run together
