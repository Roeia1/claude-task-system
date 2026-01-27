# Dashboard Restructure and Testing Infrastructure

## Overview

This epic addresses internal restructuring of the dashboard within the CLI package and establishes a comprehensive testing strategy. The dashboard (backend Express server + React frontend) currently has a nested package structure within `packages/cli/src/client/` that creates unnecessary complexity. Additionally, the dashboard has a bug preventing epics from displaying, and lacks any UI testing infrastructure.

The goal is to clean up the internal organization, fix the epic display bug, and add Storybook for component development along with Playwright for end-to-end testing.

## Goals

- Clean up the internal organization of the dashboard within the CLI package (flatten nested dependencies)
- Fix the dashboard bug where epics don't display in the frontend
- Establish Storybook for documenting and developing custom SAGA components
- Implement Playwright for E2E testing of the dashboard UI with the backend

## Success Metrics

- Dashboard correctly displays all epics from `.saga/epics/` directory
- All custom SAGA components have Storybook stories
- E2E test suite covers critical user flows (viewing epics, viewing stories, real-time updates)
- Visual regression baselines established for all key pages and states
- Single `package.json` for the CLI package (no nested client package.json)
- All tests pass in CI

## Scope

### In Scope

- Internal restructuring of dashboard within CLI package
- Fixing epic display bug in dashboard frontend
- Storybook setup and stories for custom SAGA components (Layout, Breadcrumb, EpicList, EpicDetail, StoryDetail, status badges)
- Playwright E2E tests for dashboard user flows
- Integration tests for frontend components with mocked APIs
- Visual regression testing with screenshot comparison
- CI integration for running tests

### Out of Scope

- Separating dashboard into its own npm package
- Creating Storybook stories for base shadcn/ui components (button, card, etc.) - these are already documented externally
- Major feature additions to the dashboard
- Backend-only unit tests (already exist in `src/server/__tests__/`)

## Non-Functional Requirements

- Storybook should build and run without errors
- Playwright tests should be deterministic and not flaky
- Test execution time should remain reasonable (< 2 minutes for full suite)
- Development workflow should support hot-reload for both Storybook and dashboard

## Technical Approach

### Phase 1: Internal Restructuring

Flatten the nested package structure by:
1. Moving client dependencies from `src/client/package.json` into the main CLI `package.json`
2. Updating Vite configuration to work from the new structure
3. Ensuring the build process (`pnpm build`) still produces the correct output

### Phase 2: Bug Fix

Investigate and fix the epic display bug:
1. Verify the backend API (`GET /api/epics`) returns correct data
2. Check the frontend XState machine transitions
3. Ensure WebSocket connection and data flow work correctly

### Phase 3: Storybook Integration

Set up Storybook for React with Vite:
1. Install Storybook dependencies
2. Configure for the existing Tailwind CSS setup
3. Create stories for custom SAGA components
4. Document component props and usage

### Phase 4: Playwright Testing (Integration + E2E)

Set up Playwright for both integration and end-to-end testing:

1. Install Playwright and configure for the dashboard
2. **Integration tests (mocked API)**:
   - Mock API responses for fast, isolated component testing
   - Test loading states, error states, empty states
   - Test UI interactions without backend dependency
3. **E2E tests (real backend)**:
   - Create test fixtures with sample `.saga/` directory structure
   - Test full user flows with real data:
     - Loading and displaying epic list
     - Navigating to epic detail
     - Navigating to story detail
     - Real-time updates via WebSocket
4. Integrate with CI pipeline

### Phase 5: Visual Regression Testing

Set up visual regression testing to catch unintended UI changes:

1. Use Playwright's built-in screenshot comparison capabilities
2. Capture baseline screenshots for key pages and components:
   - Epic list page (with epics, empty state)
   - Epic detail page
   - Story detail page (with tasks, journal entries)
   - Loading and error states
3. Configure screenshot comparison thresholds for acceptable pixel differences
4. Integrate with CI to block PRs with unexpected visual changes
5. Provide workflow for updating baselines when intentional changes are made

## Key Decisions

### Keep Dashboard in CLI Package

- **Choice**: Maintain dashboard as part of the CLI package rather than separating into its own package
- **Rationale**: The dashboard is a feature of SAGA CLI, not a standalone product. It shares utilities (parser, saga-scanner, project-discovery) with the CLI. Single package simplifies installation and version management.
- **Alternatives Considered**: Separate `@saga-ai/dashboard` package - rejected due to added complexity and tight coupling with CLI utilities

### Storybook Scope

- **Choice**: Focus Storybook documentation on custom SAGA components only
- **Rationale**: Base shadcn/ui components are already well-documented on the shadcn/ui website. Value comes from documenting SAGA-specific components and compositions.
- **Alternatives Considered**: Document all components including shadcn/ui primitives - rejected as duplicative effort

### E2E Testing Approach

- **Choice**: Use both real backend with fixtures AND mocked API responses for different test scenarios
- **Rationale**: Real backend tests verify full stack integration works correctly. Mocked API tests provide faster feedback, better isolation, and easier testing of edge cases (error states, loading states, empty states).
- **Test Categories**:
  - **Integration tests (mocked)**: Component behavior, loading states, error handling, empty states
  - **E2E tests (real backend)**: Full user flows, WebSocket real-time updates, data persistence

## Data Models

No new data models. Existing types remain:

```typescript
// Epic, Story, Task, JournalEntry types in src/server/parser.ts
// Frontend types mirror these in src/client/src/types/dashboard.ts
```

## Interface Contracts

### Existing REST API (unchanged)

- `GET /api/epics` - Returns `EpicSummary[]`
- `GET /api/epics/:slug` - Returns `Epic` with stories
- `GET /api/stories/:epicSlug/:storySlug` - Returns `StoryDetail`

### Existing WebSocket Events (unchanged)

- `epics:updated` - Broadcast when any epic changes
- `story:updated` - Sent to subscribed clients when story changes
- `subscribe:story` / `unsubscribe:story` - Client subscription management

## Tech Stack

- **Storybook 8.x**: Component documentation and isolated development
- **Playwright**: E2E browser testing, integration tests, and visual regression (built-in screenshot comparison)
- **Vite**: Existing build tool, will configure for Storybook integration
- **React Testing Library**: Component integration tests (with Playwright for E2E)

## Open Questions

- Should Playwright tests run in CI on every PR, or only on main branch merges?
- What specific user flows are highest priority for E2E coverage?
