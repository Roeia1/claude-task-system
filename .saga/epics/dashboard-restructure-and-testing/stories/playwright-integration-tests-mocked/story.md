---
id: playwright-integration-tests-mocked
title: Playwright Integration Tests (Mocked API)
status: ready
epic: dashboard-restructure-and-testing
tasks:
  - id: t1
    title: Install and configure Playwright
    status: pending
  - id: t2
    title: Create API mocking infrastructure
    status: pending
  - id: t3
    title: Write loading state tests
    status: pending
  - id: t4
    title: Write error state tests
    status: pending
  - id: t5
    title: Write empty state tests
    status: pending
  - id: t6
    title: Write UI interaction tests
    status: pending
  - id: t7
    title: Add npm scripts and CI configuration
    status: pending
---

## Context

The SAGA dashboard is a React application that displays epics and stories from the `.saga/` directory. It fetches data via REST API endpoints (`/api/epics`, `/api/epics/:slug`, `/api/stories/:epicSlug/:storySlug`) and receives real-time updates through WebSocket connections.

Currently, the dashboard has no automated UI testing. This story establishes Playwright-based integration tests that use mocked API responses to test frontend behavior in isolation from the backend. By mocking API responses, these tests can:

1. Run fast without starting a real server
2. Test edge cases that are difficult to reproduce with real data (error states, empty states, slow loading)
3. Verify UI behavior is correct for all API response scenarios
4. Provide deterministic, non-flaky tests

This complements the E2E tests (covered in a separate story) that test the full stack with a real backend.

## Scope Boundaries

**In scope:**
- Playwright installation and configuration for the dashboard
- API route mocking infrastructure using Playwright's `page.route()` API
- Tests for loading states (skeleton loaders, spinners)
- Tests for error states (API failures, network errors)
- Tests for empty states (no epics, no stories)
- Tests for UI interactions (navigation, toggles, collapsibles)
- npm scripts for running integration tests
- Basic CI configuration for running tests in GitHub Actions

**Out of scope:**
- E2E tests with real backend (covered in "Playwright E2E Tests (Real Backend)" story)
- Visual regression testing / screenshot comparison (covered in "Visual Regression Testing" story)
- Storybook setup (covered in "Storybook Setup and Component Stories" story)
- Package structure changes (covered in "Flatten Dashboard Package Structure" story)
- WebSocket mocking for real-time update tests (E2E story scope)
- Backend unit tests (already exist in `src/server/__tests__/`)
- Creating Storybook stories for base shadcn/ui components (epic exclusion)

## Interface

### Inputs

- Dashboard React application in `packages/cli/src/client/`
- TypeScript types for API responses in `src/client/src/types/dashboard.ts`
- Existing Vite configuration at `src/client/vite.config.ts`

### Outputs

- Playwright configuration file (`playwright.config.ts`)
- Test utilities for API mocking (`tests/utils/mock-api.ts`)
- Integration test files in `tests/integration/` directory
- npm scripts: `test:integration`, `test:integration:ui`
- GitHub Actions workflow update for CI

## Acceptance Criteria

- [ ] Playwright is installed and configured for the dashboard project
- [ ] API mocking utilities allow easy setup of mock responses for all endpoints
- [ ] Loading state tests verify skeleton loaders appear during data fetch
- [ ] Error state tests verify error messages display when API calls fail
- [ ] Empty state tests verify appropriate messaging when no data exists
- [ ] UI interaction tests verify navigation, toggles, and other interactions work correctly
- [ ] All tests pass consistently without flakiness
- [ ] Tests can run in under 30 seconds for fast feedback
- [ ] npm scripts exist to run integration tests locally
- [ ] CI workflow runs integration tests on every PR

## Tasks

### t1: Install and configure Playwright

**Guidance:**
- Install Playwright as a dev dependency in the CLI package (`packages/cli/package.json`)
- Run `npx playwright install chromium` to install only the Chromium browser (sufficient for integration tests)
- Create `playwright.config.ts` in `packages/cli/src/client/` with appropriate settings:
  - Use `webServer` config to start Vite dev server before tests
  - Configure base URL to match Vite's dev server port
  - Set test directory to `tests/integration/`
  - Configure single browser (Chromium) for faster execution
  - Set reasonable timeouts (30s for tests, 5s for assertions)

**References:**
- Playwright configuration docs: https://playwright.dev/docs/test-configuration
- Vite dev server typically runs on port 5173
- Existing Vite config: `packages/cli/src/client/vite.config.ts`

**Avoid:**
- Installing all browsers (webkit, firefox) - not needed for integration tests
- Running tests against production build - use dev server for fast feedback
- Global installation of Playwright - keep it as a project dependency

**Done when:**
- `npx playwright test` runs from `packages/cli/src/client/` directory
- Playwright starts Vite dev server automatically
- A sample test can navigate to the dashboard

### t2: Create API mocking infrastructure

**Guidance:**
- Create `tests/utils/mock-api.ts` with helper functions for mocking API routes
- Use Playwright's `page.route()` API to intercept network requests
- Create typed mock data factories for `EpicSummary`, `Epic`, `StoryDetail`
- Provide helpers for common scenarios:
  - `mockEpicList(page, epics)` - mock GET /api/epics
  - `mockEpicDetail(page, epic)` - mock GET /api/epics/:slug
  - `mockStoryDetail(page, story)` - mock GET /api/stories/:epicSlug/:storySlug
  - `mockApiError(page, route, status, message)` - mock error responses
  - `mockApiDelay(page, route, delayMs)` - mock slow responses

**References:**
- Playwright route API: https://playwright.dev/docs/network#handle-requests
- Dashboard types: `packages/cli/src/client/src/types/dashboard.ts`
- API endpoints defined in epic: GET /api/epics, GET /api/epics/:slug, GET /api/stories/:epicSlug/:storySlug

**Avoid:**
- Mocking at the fetch level (use Playwright's route API instead)
- Creating overly complex mock data - keep it minimal but realistic
- Hardcoding mock data in test files - centralize in mock utilities

**Done when:**
- Mock utilities compile without TypeScript errors
- A test can mock API responses and verify the UI updates accordingly
- Mock data matches the TypeScript interfaces from dashboard.ts

### t3: Write loading state tests

**Guidance:**
- Create `tests/integration/loading-states.spec.ts`
- Test that skeleton loaders appear while waiting for API responses
- Use `mockApiDelay()` to simulate slow API responses
- Verify loading states for:
  - Epic list page (EpicCardSkeleton components)
  - Epic detail page loading
  - Story detail page loading
- Assert that loading indicators disappear after data loads

**References:**
- EpicList skeleton: `packages/cli/src/client/src/pages/EpicList.tsx` (EpicCardSkeleton component)
- Playwright assertions: https://playwright.dev/docs/test-assertions

**Avoid:**
- Flaky timing-based assertions - use Playwright's auto-waiting
- Testing implementation details (CSS classes) - test visible behavior
- Very long delays that slow down test suite

**Done when:**
- Tests verify skeleton loaders appear during data fetch
- Tests verify loading states disappear after data arrives
- All loading state tests pass consistently

### t4: Write error state tests

**Guidance:**
- Create `tests/integration/error-states.spec.ts`
- Test error handling for various failure scenarios:
  - 500 Internal Server Error from API
  - 404 Not Found for non-existent epic/story
  - Network failure (connection refused)
  - Timeout errors
- Verify error messages are displayed to users
- Test error toast notifications using `showApiErrorToast`

**References:**
- Error handling in EpicList: `packages/cli/src/client/src/pages/EpicList.tsx` (catch block)
- Toast utilities: `packages/cli/src/client/src/lib/toast-utils.ts`
- XState error state: `packages/cli/src/client/src/machines/dashboardMachine.ts`

**Avoid:**
- Testing every possible HTTP error code - focus on categories (4xx, 5xx, network)
- Relying on specific error message text that may change
- Ignoring toast notifications - they are the primary error feedback

**Done when:**
- Tests verify error states display for API failures
- Tests verify toast notifications appear for errors
- Tests verify 404 handling for missing resources
- All error state tests pass consistently

### t5: Write empty state tests

**Guidance:**
- Create `tests/integration/empty-states.spec.ts`
- Test empty state UI for:
  - No epics found (empty array from /api/epics)
  - Epic with no stories
  - Story with no tasks
  - Story with no journal entries
- Verify helpful messaging is displayed (e.g., "No epics found. Run /create-epic to get started.")

**References:**
- Empty state in EpicList: `packages/cli/src/client/src/pages/EpicList.tsx` (lines 156-162)
- The empty state shows guidance about running `/create-epic`

**Avoid:**
- Testing only the happy path - empty states are important UX
- Assuming empty state text is static - verify key elements

**Done when:**
- Tests verify empty state message for no epics
- Tests verify appropriate UI for epic with no stories
- Tests verify appropriate UI for story with no tasks/journal
- All empty state tests pass consistently

### t6: Write UI interaction tests

**Guidance:**
- Create `tests/integration/ui-interactions.spec.ts`
- Test user interactions without backend:
  - Navigation from epic list to epic detail
  - Navigation from epic detail to story detail
  - Breadcrumb navigation
  - Archive toggle on epic list (show/hide archived epics)
  - Collapsible sections (if present)
  - Tab switching (if present)
- Use mocked API responses to provide data for navigation targets

**References:**
- Router configuration: `packages/cli/src/client/src/router.tsx`
- Breadcrumb component: `packages/cli/src/client/src/components/Breadcrumb.tsx`
- Archive toggle in EpicList: `packages/cli/src/client/src/pages/EpicList.tsx` (lines 137-147)

**Avoid:**
- Testing React Router internals - test user-visible navigation
- Clicking non-interactive elements - use proper link/button targets
- Ignoring keyboard navigation - consider accessibility

**Done when:**
- Tests verify navigation between pages works correctly
- Tests verify breadcrumb links work
- Tests verify archive toggle filters epics correctly
- All UI interaction tests pass consistently

### t7: Add npm scripts and CI configuration

**Guidance:**
- Add npm scripts to `packages/cli/package.json`:
  - `test:integration` - run Playwright tests in headless mode
  - `test:integration:ui` - run Playwright tests with UI mode for debugging
- Update or create GitHub Actions workflow to run integration tests:
  - Install Playwright browsers in CI
  - Run tests after build step
  - Upload test results as artifacts on failure
- Ensure tests run in CI environment (headless, no GPU)

**References:**
- Playwright CI docs: https://playwright.dev/docs/ci-github-actions
- Existing CI workflow (if any) in `.github/workflows/`

**Avoid:**
- Running tests on every push to every branch - limit to PRs
- Installing unnecessary browsers in CI - Chromium only
- Long CI timeouts - tests should complete quickly

**Done when:**
- `pnpm test:integration` runs integration tests from packages/cli
- `pnpm test:integration:ui` opens Playwright UI mode
- CI workflow runs integration tests on PRs
- Test results are visible in CI output
