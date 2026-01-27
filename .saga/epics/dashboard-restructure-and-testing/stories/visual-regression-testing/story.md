---
id: visual-regression-testing
title: Visual Regression Testing
status: ready
epic: dashboard-restructure-and-testing
tasks:
  - id: t1
    title: Configure Playwright screenshot comparison
    status: pending
  - id: t2
    title: Capture baseline screenshots for all key pages
    status: pending
  - id: t3
    title: Capture baseline screenshots for component states
    status: pending
  - id: t4
    title: Integrate visual regression into CI pipeline
    status: pending
  - id: t5
    title: Document baseline update workflow
    status: pending
---

## Context

The SAGA dashboard is a React frontend served by an Express backend within the CLI package. As the dashboard evolves, unintended visual changes can slip through code review - a button might shift, colors might change, or layouts might break on different screen sizes. Visual regression testing catches these issues by comparing screenshots against known-good baselines.

This story establishes visual regression testing using Playwright's built-in screenshot comparison capabilities. When a PR introduces visual changes, the CI pipeline will detect and flag them, requiring developers to either fix unintended regressions or explicitly approve intentional design changes by updating the baselines.

## Scope Boundaries

**In scope:**
- Configuring Playwright's `toHaveScreenshot()` matcher with appropriate thresholds
- Capturing baseline screenshots for key pages: Epic List, Epic Detail, Story Detail
- Capturing baseline screenshots for UI states: loading, error, empty states
- CI integration to run visual regression tests and block PRs with failures
- Documentation for updating baselines when intentional changes are made
- Configuring screenshot directories and naming conventions

**Out of scope:**
- Setting up Playwright itself (covered by "Playwright Integration Tests" story)
- Writing functional E2E tests (covered by "Playwright E2E Tests" story)
- Mocked API integration tests (covered by "Playwright Integration Tests" story)
- Storybook visual testing or Storybook Chromatic integration (covered by "Storybook Setup" story)
- Creating new Storybook stories (covered by "Storybook Setup" story)
- Dashboard package restructuring (covered by "Flatten Dashboard Package Structure" story)
- Cross-browser visual testing (focusing on Chromium only for baseline stability)
- Mobile/responsive visual testing (desktop viewport only for initial baselines)

## Interface

### Inputs

- **Playwright configuration**: Base Playwright setup from the "Playwright Integration Tests" story
- **Test fixtures**: Sample `.saga/` directory with test data from "Playwright E2E Tests" story
- **Running dashboard**: Ability to start the dashboard server for screenshot capture

### Outputs

- **Baseline screenshots**: Committed PNG files in `packages/cli/tests/visual/__screenshots__/`
- **Visual test suite**: Playwright test file(s) for visual regression
- **CI workflow update**: GitHub Actions configuration for visual regression checks
- **Documentation**: Instructions for updating baselines in contributing guide

## Acceptance Criteria

- [ ] Playwright is configured with `toHaveScreenshot()` and appropriate threshold settings
- [ ] Baseline screenshots exist for Epic List page (with data and empty state)
- [ ] Baseline screenshots exist for Epic Detail page
- [ ] Baseline screenshots exist for Story Detail page (with tasks and journal entries)
- [ ] Baseline screenshots exist for loading and error states
- [ ] Visual regression tests run in CI on every PR
- [ ] PRs with visual differences are blocked until reviewed/resolved
- [ ] Documentation exists explaining how to update baselines after intentional changes
- [ ] Screenshot comparison threshold is tuned to avoid false positives from anti-aliasing

## Tasks

### t1: Configure Playwright screenshot comparison

**Guidance:**
- Add visual regression configuration to existing `playwright.config.ts`
- Configure `toHaveScreenshot()` options including:
  - `threshold`: Pixel difference threshold (start with 0.2, tune as needed)
  - `maxDiffPixels` or `maxDiffPixelRatio`: Maximum acceptable difference
  - `animations: 'disabled'`: Prevent animation-related flakiness
- Set up snapshot directory structure: `packages/cli/tests/visual/__screenshots__/`
- Configure snapshot naming to include test name and platform

**References:**
- Playwright visual comparisons docs: https://playwright.dev/docs/test-snapshots
- Existing Playwright config: `packages/cli/playwright.config.ts` (after integration tests story)

**Avoid:**
- Setting threshold too low (causes flaky tests from anti-aliasing differences)
- Setting threshold too high (misses real regressions)
- Running visual tests across multiple browsers (causes baseline explosion)

**Done when:**
- `playwright.config.ts` includes visual regression configuration
- Running a visual test creates/compares screenshots in the expected directory
- Screenshots are named consistently and stored in version control

### t2: Capture baseline screenshots for all key pages

**Guidance:**
- Create `packages/cli/tests/visual/pages.spec.ts` for page-level visual tests
- Capture full-page screenshots for:
  - Epic List page with multiple epics displayed
  - Epic Detail page showing epic metadata and story list
  - Story Detail page showing tasks and journal entries
- Use test fixtures to ensure consistent data across runs
- Wait for network idle and any loading states to complete before capture
- Set consistent viewport size (e.g., 1280x720) for reproducibility

**References:**
- Test fixtures from E2E tests story: `packages/cli/tests/fixtures/`
- Dashboard routes: `/`, `/epics/:slug`, `/stories/:epicSlug/:storySlug`

**Avoid:**
- Capturing screenshots before data has fully loaded
- Including dynamic content like timestamps without masking
- Using different viewport sizes which create different baselines

**Done when:**
- Visual tests exist for Epic List, Epic Detail, and Story Detail pages
- Running `pnpm test:visual` generates/compares screenshots
- Baseline screenshots are committed to the repository

### t3: Capture baseline screenshots for component states

**Guidance:**
- Create `packages/cli/tests/visual/states.spec.ts` for state-level visual tests
- Capture screenshots for:
  - Loading state (skeleton/spinner while data loads)
  - Error state (API failure message display)
  - Empty state (no epics available)
- Use mocked API responses or intercept network to force specific states
- For loading states, pause the API response to capture the intermediate UI

**References:**
- Playwright route interception: https://playwright.dev/docs/network#handle-requests
- Component states from integration tests story

**Avoid:**
- Relying on race conditions to capture loading states
- Capturing transient states that are inherently unstable

**Done when:**
- Visual tests exist for loading, error, and empty states
- Each state has a committed baseline screenshot
- Tests reliably capture the intended state

### t4: Integrate visual regression into CI pipeline

**Guidance:**
- Update `.github/workflows/` to include visual regression test step
- Configure CI to:
  - Run visual regression tests after unit/integration tests pass
  - Upload screenshot diffs as artifacts on failure
  - Fail the workflow if visual differences are detected
- Use Playwright's `--update-snapshots` flag only in a separate "update baselines" workflow
- Store baselines in git (not in CI artifacts) for version control

**References:**
- Playwright CI guide: https://playwright.dev/docs/ci
- Existing GitHub Actions workflows in `.github/workflows/`

**Avoid:**
- Auto-updating baselines in CI (defeats the purpose of visual regression)
- Running visual tests on multiple OS (causes platform-specific differences)
- Ignoring failures in visual regression step

**Done when:**
- CI runs visual regression tests on every PR
- Failed visual tests block PR merge
- Screenshot diffs are available as artifacts for debugging
- CI uses consistent environment (e.g., Ubuntu with specific Chromium version)

### t5: Document baseline update workflow

**Guidance:**
- Add section to `packages/cli/CONTRIBUTING.md` or create `packages/cli/tests/visual/README.md`
- Document the workflow for updating baselines:
  1. Make intentional UI changes
  2. Run visual tests locally to see failures
  3. Review the diff to confirm changes are expected
  4. Run `pnpm test:visual:update` to regenerate baselines
  5. Commit updated baselines with the code changes
- Include troubleshooting for common issues (flaky tests, platform differences)
- Document how to view screenshot diffs locally

**References:**
- Playwright snapshot update: `npx playwright test --update-snapshots`
- Similar docs in other projects using visual regression

**Avoid:**
- Making baseline updates seem like a routine step (should be intentional)
- Documenting workarounds for flaky tests instead of fixing them

**Done when:**
- Documentation clearly explains when and how to update baselines
- `package.json` includes convenience scripts for visual testing
- Team can successfully update baselines following the documented process
