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
