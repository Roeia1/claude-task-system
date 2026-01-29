---
id: playwright-e2e-real-backend
title: Playwright E2E Tests (Real Backend)
status: completed
epic: dashboard-restructure-and-testing
tasks:
  - id: t1
    title: Create test fixtures directory structure
    status: completed
  - id: t2
    title: Configure Playwright for E2E with real backend
    status: completed
  - id: t3
    title: Implement backend startup utilities
    status: completed
  - id: t4
    title: Write happy path tests
    status: completed
  - id: t5
    title: Write error path tests
    status: completed
  - id: t6
    title: Add CI workflow configuration
    status: completed
---

## Context

The SAGA dashboard is a React frontend served by an Express backend that displays epics, stories, and their real-time updates via WebSocket. While integration tests with mocked APIs verify component behavior in isolation, E2E tests with a real backend are essential to validate the full stack works correctly together.

This story creates Playwright E2E tests that run against a real backend server with test fixtures. These tests verify complete user flows including:
- Loading and displaying epics from the filesystem
- Navigating between epic list, epic detail, and story detail views
- Real-time updates when files change (via WebSocket)
- Graceful handling of error conditions (API failures, WebSocket disconnection, 404s)

The tests use a fixture directory with sample `.saga/` structure, allowing predictable test scenarios without polluting the real project data. Any bugs discovered through failing tests will be fixed as part of this story's implementation.

## Scope Boundaries

**In scope:**
- Playwright test configuration for E2E tests with real backend
- Test fixtures with sample epic/story data in `.saga/` structure
- Happy path E2E tests:
  - Epic list loading and display
  - Epic detail navigation and display
  - Story detail navigation and display (with tasks, journal entries)
  - Real-time updates via WebSocket when files change
- Error path E2E tests:
  - API failure handling (server unavailable)
  - WebSocket disconnection and reconnection behavior
  - 404 handling for non-existent epic/story
  - Empty state (no epics in directory)
- Bug fixes discovered through failing E2E tests
- CI workflow integration for E2E tests

**Out of scope:**
- Integration tests with mocked API (covered by "Playwright Integration Tests (Mocked API)" story)
- Visual regression testing and screenshot comparisons (covered by "Visual Regression Testing" story)
- Storybook setup and component stories (covered by "Storybook Setup and Component Stories" story)
- Package structure changes (covered by "Flatten Dashboard Package Structure" story)
- Unit tests for backend routes/parser (already exist in `src/server/__tests__/`)
- Performance testing or load testing
- Testing on multiple browsers (Chromium only for initial implementation)

## Interface

### Inputs

- Dashboard backend and frontend code in `packages/cli/src/server/` and `packages/cli/src/client/`
- REST API endpoints: `GET /api/epics`, `GET /api/epics/:slug`, `GET /api/stories/:epicSlug/:storySlug`
- WebSocket events: `epics:updated`, `story:updated`, `subscribe:story`, `unsubscribe:story`
- Playwright installed and configured (may need to be set up if not present)

### Outputs

- Test fixtures directory: `packages/cli/src/client/e2e/fixtures/`
- E2E test files: `packages/cli/src/client/e2e/*.spec.ts`
- Playwright config for E2E: `packages/cli/playwright.config.ts` (or extension of existing)
- CI workflow file: `.github/workflows/e2e-tests.yml` (or extension of existing workflow)
- Bug fixes for any issues discovered during test implementation

## Acceptance Criteria

- [ ] Test fixtures exist with sample epic and story data that covers all test scenarios
- [ ] Playwright is configured to start the real backend server before tests
- [ ] Happy path tests pass: epic list, epic detail, story detail navigation work correctly
- [ ] Real-time update test passes: WebSocket broadcasts trigger UI updates
- [ ] Error path tests pass: API failure, WebSocket disconnection, 404 pages display correctly
- [ ] Empty state test passes: dashboard shows appropriate message when no epics exist
- [ ] All E2E tests are deterministic (no flakiness)
- [ ] E2E tests run in CI and block PRs on failure
- [ ] Test execution time is reasonable (< 60 seconds for E2E suite)

## Tasks

### t1: Create test fixtures directory structure

**Guidance:**
- Create a fixtures directory at `packages/cli/src/client/e2e/fixtures/`
- Structure should mirror a real `.saga/` directory with epics and stories
- Include varied data: multiple epics, different story statuses, tasks in various states
- Create at least one story with journal entries to test journal rendering
- Include an epic with no stories to test empty story list state

**References:**
- Epic structure: `packages/cli/src/server/parser.ts` (scanSagaDirectory function)
- Story frontmatter format: `plugin/skills/generate-stories/templates/story-template.md`
- Existing test fixtures pattern: `packages/cli/src/server/__tests__/`

**Avoid:**
- Creating fixtures that are too complex or unrealistic
- Hardcoding absolute paths in fixture data
- Creating fixtures with invalid YAML frontmatter

**Done when:**
- Fixtures directory exists with at least 2 epics and 3-4 stories total
- Each story has valid YAML frontmatter and markdown content
- At least one story has journal.md with session/blocker entries
- At least one epic has stories in different statuses (ready, in_progress, completed)

### t2: Configure Playwright for E2E with real backend

**Guidance:**
- Install Playwright if not already installed: `pnpm add -D @playwright/test`
- Create or extend `playwright.config.ts` in `packages/cli/`
- Configure `webServer` to start the dashboard with fixtures directory
- Set reasonable timeouts for E2E tests (longer than unit tests)
- Configure to use Chromium only for faster CI runs

**References:**
- Playwright webServer config: https://playwright.dev/docs/test-webserver
- Dashboard start command: `packages/cli/src/commands/dashboard.ts`
- Existing test configs: `packages/cli/vitest.config.ts`

**Avoid:**
- Starting the server manually before tests (use Playwright's webServer config)
- Hardcoding ports that might conflict
- Setting timeouts too short (can cause flakiness)

**Done when:**
- `pnpm exec playwright test` starts the backend server automatically
- Server uses fixtures directory instead of real `.saga/`
- Tests can access the running dashboard at configured base URL
- Configuration supports both local dev and CI environments

### t3: Implement backend startup utilities

**Guidance:**
- Create a test utility that starts the dashboard server with a custom saga root
- The utility should return the server URL and a cleanup function
- Support passing the fixtures directory path as the saga root
- Handle port conflicts gracefully (use dynamic port allocation)

**References:**
- Dashboard server entry: `packages/cli/src/server/index.ts`
- Server creation: `packages/cli/src/commands/dashboard.ts`

**Avoid:**
- Leaving servers running after tests complete
- Using fixed ports that could conflict with other processes
- Starting multiple servers when one would suffice

**Done when:**
- Utility function can start server with custom saga root
- Server port is dynamically allocated or configurable
- Cleanup function properly shuts down server
- Playwright webServer config uses this utility

### t4: Write happy path tests

**Guidance:**
- Create `packages/cli/src/client/e2e/happy-paths.spec.ts`
- Test epic list: verify all fixture epics appear with correct titles and story counts
- Test epic detail: navigate to an epic, verify stories list and epic content
- Test story detail: navigate to a story, verify tasks, status, and journal entries
- Test real-time updates: modify a fixture file, verify UI updates via WebSocket

**References:**
- React components: `packages/cli/src/client/src/pages/EpicList.tsx`, `EpicDetail.tsx`, `StoryDetail.tsx`
- API responses: `packages/cli/src/server/routes.ts`
- WebSocket events: `packages/cli/src/server/websocket.ts`

**Avoid:**
- Testing implementation details (check user-visible outcomes)
- Using arbitrary waits (use Playwright's auto-waiting or explicit waitFor)
- Coupling tests to exact CSS classes or DOM structure

**Done when:**
- Epic list test loads page and verifies all epics from fixtures appear
- Epic detail test navigates and verifies story list matches fixture
- Story detail test verifies tasks, status badge, and journal entries render
- WebSocket test modifies fixture file and sees UI update within timeout

### t5: Write error path tests

**Guidance:**
- Create `packages/cli/src/client/e2e/error-paths.spec.ts`
- Test 404 handling: navigate to non-existent epic/story, verify error message
- Test API failure: configure backend to fail, verify error state in UI
- Test WebSocket disconnection: kill WebSocket, verify reconnection attempt or error message
- Test empty state: use fixtures with no epics, verify "no epics" message

**References:**
- Error handling in frontend: `packages/cli/src/client/src/machines/dashboardMachine.ts`
- 404 responses: `packages/cli/src/server/routes.ts` (lines 77, 99, 106)
- WebSocket reconnection: `packages/cli/src/client/src/context/DashboardContext.tsx`

**Avoid:**
- Making tests dependent on specific error message text (use test-ids or roles)
- Ignoring console errors that indicate real problems
- Testing browser-level network failures (beyond scope)

**Done when:**
- 404 test navigates to `/epics/nonexistent` and sees error message
- 404 test navigates to `/stories/real-epic/nonexistent` and sees error message
- Empty state test with no-epics fixture shows appropriate empty message
- WebSocket disconnection test verifies UI handles disconnection gracefully

### t6: Add CI workflow configuration

**Guidance:**
- Create or extend `.github/workflows/` with E2E test job
- Use Playwright's official GitHub Action for browser installation
- Run E2E tests on push to main and on PRs
- Configure test artifacts (screenshots, traces) on failure
- Ensure tests run in headless mode

**References:**
- Playwright CI docs: https://playwright.dev/docs/ci-intro
- Existing workflows: `.github/workflows/`
- Playwright GitHub Action: `playwright-github-action`

**Avoid:**
- Installing browsers on every run (use caching)
- Running E2E tests on every file change (only relevant paths)
- Failing silently without artifacts for debugging

**Done when:**
- CI runs E2E tests on PRs affecting `packages/cli/src/client/` or `packages/cli/src/server/`
- Failed tests upload screenshots and traces as artifacts
- CI job completes in reasonable time (< 5 minutes including browser install)
- E2E test failures block PR merge
