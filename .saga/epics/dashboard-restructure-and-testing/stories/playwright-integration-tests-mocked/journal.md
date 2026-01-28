# Journal: playwright-integration-tests-mocked

## Session: 2026-01-28T06:15:00Z

### Task: t1 - Install and configure Playwright

**What was done:**
- Created `playwright.config.ts` in `packages/cli/src/client/` with:
  - Test directory configured to `./tests/integration`
  - WebServer config to auto-start Vite dev server on port 5173
  - Single browser (Chromium) for faster test execution
  - CI-specific settings (reporters, retries, workers)
  - Reasonable timeouts (30s for tests, 5s for assertions)
- Created test directory structure:
  - `tests/integration/` for integration test files
  - `tests/utils/` for mock utilities
- Created sample test file `tests/integration/sample.spec.ts` to verify setup
- Added npm scripts to `package.json`:
  - `test:integration` - run tests in headless mode
  - `test:integration:ui` - run with Playwright UI for debugging
- Installed `@playwright/test` as dev dependency

**Decisions:**
- Used `pnpm dev:client` as the webServer command since that's the existing script
- Set `cwd: '../..'` in webServer config since Playwright runs from src/client/ but pnpm runs from packages/cli/
- Used `reuseExistingServer: !process.env.CI` to allow running against an already running dev server locally
- Kept only Chromium browser for faster test execution (per story guidance)

**Blockers:**
- Chromium browser download timing out due to slow network. This is a one-time setup step that runs with `pnpm exec playwright install chromium`

**Verification:**
- TypeScript compilation passes for playwright.config.ts
- Playwright command runs successfully (version 1.58.0 confirmed)
- Test framework starts Vite dev server and attempts to run tests
- Error message correctly indicates browser needs to be installed

**Next steps:**
- Task t2: Create API mocking infrastructure in `tests/utils/mock-api.ts`

## Session: 2026-01-28T06:30:00Z

### Task: t2 - Create API mocking infrastructure

**What was done:**
- Created `tests/utils/mock-api.ts` with comprehensive API mocking utilities:
  - Mock data factories: `createMockStoryCounts`, `createMockTask`, `createMockJournalEntry`, `createMockEpicSummary`, `createMockStoryDetail`, `createMockEpic`
  - API route mocking helpers: `mockEpicList`, `mockEpicDetail`, `mockStoryDetail`, `mockApiError`, `mockApiDelay`, `mockNetworkFailure`
  - Convenience helper: `setupMockDashboard` for quick test setup with sample data
- Created `tests/integration/mock-api.spec.ts` with tests verifying:
  - Mock data factories create valid typed objects
  - Factory overrides work correctly
  - API route mocking intercepts requests correctly
  - Error mocking returns proper error responses
  - Delay mocking adds configurable latency
- Removed placeholder `sample.spec.ts` (replaced by comprehensive mock-api.spec.ts)
- All TypeScript types are properly imported from `src/types/dashboard.ts`

**Decisions:**
- Used Playwright's `page.route()` API as recommended in task guidance
- Created typed factories that match dashboard TypeScript interfaces exactly
- Included `setupMockDashboard` helper for convenient test setup with realistic sample data
- Added `mockNetworkFailure` utility for testing connection errors (using `route.abort('connectionrefused')`)
- Used generic URL patterns (e.g., `**/api/epics`) for flexibility

**Verification:**
- TypeScript compilation passes for `mock-api.ts` and `mock-api.spec.ts`
- All factory functions return properly typed objects matching dashboard.ts interfaces
- All mock utilities use Playwright's recommended route API

**Blockers:**
- Cannot run actual tests yet due to Chromium browser download timeout (same network issue from t1)

**Next steps:**
- Once browser is installed, run tests to verify mocking works end-to-end
- Task t3: Write loading state tests using the mock infrastructure

## Session: 2026-01-28T07:00:00Z

### Task: t3 - Write loading state tests

**What was done:**
- Created `tests/integration/loading-states.spec.ts` with 10 comprehensive loading state tests:
  - **Epic List Page (3 tests):**
    - `should show skeleton loaders while loading epics` - verifies skeleton loaders appear during API fetch
    - `should show multiple skeleton cards while loading` - verifies 3 skeleton cards are shown
    - `should hide skeleton loaders after data arrives` - verifies skeletons disappear after data loads
  - **Epic Detail Page (2 tests):**
    - `should show header and story card skeletons while loading` - verifies HeaderSkeleton and StoryCardSkeleton
    - `should show progress skeleton in header while loading` - verifies progress bar skeleton
  - **Story Detail Page (3 tests):**
    - `should show header and content skeletons while loading` - verifies HeaderSkeleton and ContentSkeleton
    - `should show skeleton placeholders for header elements` - verifies 2 skeleton components
    - `should transition from loading to loaded state correctly` - verifies full loading->loaded transition
  - **Fast Responses (2 tests):**
    - `should handle immediate response without visible loading state` - tests instant API responses
    - `should handle quick sequence of navigations` - tests navigation with fast responses
- Fixed Vitest/Playwright conflict by creating `vitest.config.ts` that excludes Playwright tests from Vitest
- All tests use `mockApiDelay` to simulate slow API responses and observe loading states
- Tests use Playwright's auto-waiting with `toBeVisible()` to avoid flaky timing assertions

**Decisions:**
- Used `.animate-pulse` class to detect skeleton loaders (matches the actual implementation in EpicList.tsx, EpicDetail.tsx, StoryDetail.tsx)
- Used short delays (100-2000ms) to keep tests fast while still being able to observe loading states
- Created separate test sections for each page type for clarity
- Added "Fast Responses" section to test edge cases where loading states may not be visible

**Verification:**
- TypeScript compilation passes: `tsc --noEmit` succeeds
- Playwright discovers all 19 tests (10 loading + 9 mock-api)
- Test structure follows the task guidance from story.md

**Blockers:**
- Cannot run actual tests due to Chromium browser download timeout (ongoing network issue)

**Next steps:**
- Task t4: Write error state tests
- Task t5: Write empty state tests

## Session: 2026-01-28T07:45:00Z

### Task: t4 - Write error state tests

**What was done:**
- Created `tests/integration/error-states.spec.ts` with 17 comprehensive error state tests:
  - **Epic List Page (3 tests):**
    - `should show toast notification on 500 server error` - verifies API error toast appears
    - `should show toast notification on network failure` - verifies error toast for connection issues
    - `should display empty state after error when no cached data` - verifies empty state fallback
  - **Epic Detail Page (4 tests):**
    - `should show 404 error page for non-existent epic` - verifies "Epic not found" message
    - `should show error page on 500 server error` - verifies "Failed to load epic" message
    - `should show toast notification on network failure` - verifies both toast and error page
    - `should allow navigation back to epic list from error page` - verifies back link works
  - **Story Detail Page (4 tests):**
    - `should show 404 error page for non-existent story` - verifies "Story not found" message
    - `should show error page on 500 server error` - verifies "Failed to load story" message
    - `should show toast notification on network failure` - verifies both toast and error page
    - `should allow navigation back to epic from error page` - verifies back link works
  - **Mixed Error Scenarios (2 tests):**
    - `should handle error on one page and success on another` - verifies partial failures
    - `should recover after navigating away from error page` - verifies recovery flow
  - **Error Response Formats (4 tests):**
    - Tests for 400 Bad Request, 403 Forbidden, 502 Bad Gateway, 503 Service Unavailable

**Decisions:**
- Used `mockApiError` and `mockNetworkFailure` utilities from mock-api.ts
- Tested both toast notifications and inline error states based on page implementations
- Tested navigation from error pages back to working pages to ensure recovery works
- Used Radix UI toast locator `[data-radix-toast-viewport] [role="status"]` for toast assertions
- Covered various HTTP error codes to ensure consistent error handling

**Verification:**
- Playwright discovers all 36 tests (17 error + 10 loading + 9 mock-api)
- TypeScript compilation passes for error-states.spec.ts
- Test structure follows the task guidance from story.md

**Blockers:**
- Cannot run actual tests due to Chromium browser download (needs `pnpm exec playwright install chromium`)

**Next steps:**
- Task t5: Write empty state tests
