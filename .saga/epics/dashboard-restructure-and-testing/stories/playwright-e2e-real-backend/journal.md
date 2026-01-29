# Journal

## Session: 2026-01-29T03:15:00Z

### Task: t1 - Create test fixtures directory structure

**What was done:**
- Created fixtures directory at `packages/cli/src/client/e2e/fixtures/`
- Created `.saga/epics/` structure with 3 epics:
  - `feature-development`: Has 2 stories (auth-implementation, api-design)
  - `empty-epic`: No stories (for testing empty state)
  - `testing-suite`: Has 2 stories (unit-tests, integration-tests)
- Created 4 stories with varied statuses:
  - `auth-implementation`: in_progress, 4 tasks (1 completed, 1 in_progress, 2 pending)
  - `api-design`: completed, 2 tasks (both completed)
  - `unit-tests`: ready, 3 tasks (all pending)
  - `integration-tests`: blocked, 2 tasks (1 completed, 1 pending)
- Created journal.md for auth-implementation with session, blocker, and resolution entries

**Decisions:**
- Used realistic epic/story names that reflect common development workflows
- Included variety of task states within stories to test task rendering
- Created journal with all three entry types (session, blocker, resolution) to fully test journal parsing

**Next steps:**
- Configure Playwright for E2E with real backend (t2)

## Session: 2026-01-29T03:22:00Z

### Task: t2 - Configure Playwright for E2E with real backend

**What was done:**
- Created `packages/cli/src/client/playwright.e2e.config.ts` for E2E tests with real backend
- Config starts the full Express dashboard server using the built CLI (`dist/cli.cjs`)
- Configured webServer to use fixtures directory as saga root
- Uses port 3849 to avoid conflicts with default port 3847
- Added `test:e2e` and `test:e2e:ui` scripts to package.json
- Created `packages/cli/src/client/e2e/setup.spec.ts` with basic verification tests:
  - Backend health check
  - Fixtures API loading verification
  - Dashboard browser loading test
- All 3 verification tests pass

**Decisions:**
- Created separate E2E config (`playwright.e2e.config.ts`) rather than extending existing integration config, since they have different purposes:
  - Integration tests: Use Vite dev server with mocked APIs
  - E2E tests: Use real Express backend with fixtures
- Used built CLI (`node dist/cli.cjs`) instead of tsx for reliability
- Set longer timeouts (60s test, 10s expect) for E2E tests since they involve real network/filesystem
- Configured video recording on first retry for debugging E2E failures

**Next steps:**
- Implement backend startup utilities (t3) - may be optional since webServer config handles server lifecycle
- Write happy path tests (t4)

## Session: 2026-01-29T04:00:00Z

### Task: t4 - Write happy path tests

**What was done:**
- Created `packages/cli/src/client/e2e/happy-paths.spec.ts` with comprehensive E2E tests
- Epic List tests (2):
  - Displays all fixture epics with correct titles and story counts
  - Displays status badges for epics with stories
- Epic Detail tests (4):
  - Navigates to epic and displays stories
  - Displays story status badges correctly
  - Empty epic shows no stories message
  - Stories are sorted by status priority (blocked first)
- Story Detail tests (6):
  - Navigates to story and displays all sections
  - Displays tasks with correct status
  - Displays story content tab
  - Displays journal entries with session, blocker, and resolution types
  - Navigates back to epic from breadcrumb
- WebSocket tests (2 - skipped):
  - Epic list updates when story status changes
  - Story detail updates when story file changes

**Decisions:**
- Added beforeEach hook to reset fixtures to known state before each test
- Skipped WebSocket real-time update tests because the dashboard doesn't auto-connect to WebSocket on load - this is a pre-existing gap in the dashboard implementation
- Used navigation through UI (click) rather than direct `goto()` to avoid SPA routing issues with the backend
- Used more robust locators (href selectors, containsText) rather than heading role selectors for better reliability

**Discovered issues:**
1. Story content is not parsed/returned by the backend - `StoryDetail` type has `content?: string` but parser doesn't populate it
2. WebSocket connection is never initiated - dashboard machine has `connect()` but no component calls it on mount
3. SPA routing fails for direct navigation to `/epic/slug` - backend serves 404 instead of index.html

**Test results:**
- 14 tests pass (including 3 setup tests from previous session)
- 2 tests skipped (WebSocket tests pending dashboard fix)

**Next steps:**
- Write error path tests (t5)
- Add CI workflow configuration (t6)

## Session: 2026-01-29T04:30:00Z

### Task: t5 - Write error path tests

**What was done:**
- Created `packages/cli/src/client/e2e/error-paths.spec.ts` with comprehensive error handling tests
- 404 Error Handling tests (4):
  - Displays error message for non-existent epic via API 404
  - Displays error message for non-existent story via API 404
  - Back link from epic 404 navigates to epic list
  - Back link from story 404 navigates to epic
- Empty State Handling tests (2):
  - Empty saga directory test (skipped - requires separate server config)
  - Empty epic displays no stories message
- API Error Handling tests (3):
  - Handles network error gracefully on epic list
  - Handles server error (500) on epic detail
  - Handles server error (500) on story detail
- WebSocket Disconnection tests (2):
  - Dashboard loads and functions without WebSocket connection
  - Can navigate between pages when WebSocket is blocked

**Decisions:**
- Used API route interception (Playwright's `page.route()`) to simulate 404/500 errors instead of direct URL navigation, working around the SPA routing limitation
- Used `page.evaluate()` with `history.pushState` and `popstate` events to trigger client-side navigation for 404 testing
- Skipped the "no epics" test since it requires a separate server instance with empty fixtures directory
- Simplified WebSocket tests to verify the dashboard functions independently of WebSocket availability

**Test approach notes:**
- Direct navigation to SPA routes (e.g., `/epic/nonexistent`) fails because the backend doesn't serve index.html for non-root routes - this is a pre-existing issue documented in the previous session
- Tests use API interception to simulate error conditions, which tests the frontend error handling without relying on the backend's SPA routing support

**Test results:**
- 27 total E2E tests (24 passing, 3 intentionally skipped)
- Error path tests: 10 passing, 1 skipped

**Next steps:**
- Add CI workflow configuration (t6)

## Session: 2026-01-29T05:00:00Z

### Task: t6 - Add CI workflow configuration

**What was done:**
- Created `.github/workflows/e2e-tests.yml` with GitHub Actions workflow for E2E tests
- Workflow configuration:
  - Runs on push to main/master and PRs targeting those branches
  - Path filtering to only run on relevant changes (client, server, dashboard command, config, workflow)
  - Uses pnpm with caching for fast installs
  - Installs only Chromium browser (matching Playwright config)
  - Builds both CLI and client before running tests
  - Uploads test artifacts (test-results, playwright-report) on failure or success
  - 10 minute job timeout
  - 7 day artifact retention
- Verified all 24 E2E tests still pass locally

**Decisions:**
- Used `pnpm/action-setup@v4` for pnpm installation with caching
- Set `working-directory: packages/cli` as default for most steps, but override to root for `pnpm install --frozen-lockfile` since lockfile is at repo root
- Used `--with-deps` flag for Playwright browser installation to include system dependencies on Ubuntu
- Included the workflow file itself in path filters to ensure changes to CI config trigger a test run
- Used `if: ${{ !cancelled() }}` for artifact upload to capture results even on failure

**Test results:**
- All 24 E2E tests pass (3 skipped as expected)
- Workflow file created and ready for CI

**Next steps:**
- Story complete - all tasks done

## Session: 2026-01-29T05:30:00Z

### User requested: Remove GitHub Actions CI

**What was done:**
- Removed `.github/workflows/e2e-tests.yml` - user does not want GitHub Actions CI for this project

**Decisions:**
- User explicitly requested no GitHub Actions CI, removing the workflow file entirely

## Session: 2026-01-29T06:00:00Z

### Improvements: Test isolation, new tests, and parallel execution

**What was done:**

1. **Fixed flaky navigation test**
   - Test `should navigate correctly via links in story header` was matching two elements (breadcrumb and story header)
   - Changed locator to `getByRole('main').getByRole('link')` to target only the main content area

2. **Updated main test script**
   - Added E2E tests to the main `test` script
   - Changed to reuse existing scripts: `pnpm run test:integration && pnpm run test:e2e`

3. **Refactored fixtures to use temp directory**
   - Created `fixtures-utils.ts` with helper functions for fixture management
   - Created `global-teardown.ts` to clean up temp directory after tests
   - Fixtures are now copied to `/tmp/saga-e2e-fixtures` before tests run
   - Each test resets fixtures via `beforeEach` for complete isolation
   - Tests run serially (1 worker) since they share filesystem state

4. **Enabled previously skipped empty state test**
   - `displays no epics message when saga directory is empty` - now works by deleting all epics from temp fixtures

5. **Added new dynamic content tests**
   - `epic with deleted stories shows empty state`
   - `newly created epic appears after refresh`
   - `newly created story appears after refresh`
   - `deleted epic disappears after refresh`

6. **Parallelized test suites**
   - Added `concurrently` package as dev dependency
   - Updated test script: `concurrently -g "vitest run" "pnpm run test:integration" "pnpm run test:e2e"`
   - Tests use different ports so no conflicts:
     - vitest: no server
     - integration: port 5173 (Vite dev server)
     - E2E: port 3849 (real backend)

**Decisions:**
- Used temp directory approach instead of in-place fixture modification to avoid git state changes
- Reset all fixtures before each test rather than selective restoration for simplicity
- Run E2E tests serially (single worker) since they share filesystem state
- Used `concurrently -g` flag to ensure if any test suite fails, all are killed and overall command fails

**Test results:**
- vitest: 434 tests passed (25 files)
- integration: 77 tests passed
- E2E: 29 tests passed, 2 skipped (WebSocket auto-connect not implemented)
