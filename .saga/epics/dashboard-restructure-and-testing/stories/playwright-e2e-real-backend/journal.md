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
