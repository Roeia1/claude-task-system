---
id: storybook-interaction-testing
title: Add Storybook Interaction Testing
status: ready
epic: dashboard-restructure-and-testing
tasks:
  - id: t1
    title: Install @storybook/test and @storybook/addon-a11y
    status: pending
  - id: t2
    title: Configure a11y addon in Storybook
    status: pending
  - id: t3
    title: Add play functions to StatusBadge stories
    status: pending
  - id: t4
    title: Add play functions to Breadcrumb stories
    status: pending
  - id: t5
    title: Add play functions to EpicList stories
    status: pending
  - id: t6
    title: Add play functions to EpicDetail stories
    status: pending
  - id: t7
    title: Add play functions to StoryDetail stories
    status: pending
  - id: t8
    title: Add accessibility tests to key interactive stories
    status: pending
  - id: t9
    title: Verify all tests pass with pnpm storybook test
    status: pending
---

## Context

The SAGA Dashboard has an established Storybook 10.x setup with 95+ component stories created by the "storybook-setup-component-stories" story. Currently, Storybook is used solely for component documentation - developers can view components in isolation with different props and states, but there is no automated verification that components behave correctly.

This story extends the existing Storybook infrastructure to include interaction testing via `@storybook/test` and accessibility testing via `@storybook/addon-a11y`. Interaction tests use `play` functions that run assertions against rendered stories, verifying:

1. **Correct rendering**: Text content, styling, and DOM structure match expectations
2. **Component behavior**: User interactions (clicks, hovers) produce expected results
3. **Accessibility compliance**: Components meet WCAG accessibility standards

This testing approach is **complementary** to Playwright tests:
- **Storybook tests** verify individual component behavior in isolation with mocked data
- **Playwright integration tests** verify page-level UI behavior with mocked APIs
- **Playwright E2E tests** verify full-stack flows with real backend

Storybook interaction tests run faster than Playwright and provide immediate feedback during component development. They are ideal for catching regressions in component-level logic and ensuring accessibility compliance.

## Scope Boundaries

**In scope:**
- Installing `@storybook/test` and `@storybook/addon-a11y` dependencies
- Configuring the a11y addon in `.storybook/main.ts`
- Adding `play` functions to existing stories:
  - StatusBadge: verify correct text and color styling for each status variant
  - Breadcrumb: verify link structure, text content, and navigation hierarchy
  - EpicList: verify epic cards render correctly, loading skeletons display, empty states show appropriate messaging
  - EpicDetail: verify story cards display, header content renders, status badges show correct states
  - StoryDetail: verify task items render with correct status icons, journal entries display, metadata shows correctly
- Adding accessibility tests to key interactive components (buttons, links, form controls)
- Ensuring `pnpm storybook test` runs and passes all interaction tests

**Out of scope:**
- Creating new stories (stories already exist from storybook-setup-component-stories)
- Testing actual API calls or WebSocket connections (covered by Playwright stories)
- Testing navigation between pages (covered by Playwright integration tests)
- Visual regression testing with screenshots (covered by visual-regression-testing story)
- Testing base shadcn/ui components (epic-level exclusion - they are documented externally)
- Modifying component implementation to make tests pass (tests should verify existing behavior)
- Testing loading state timing/animations (Playwright handles these better)

## Interface

### Inputs

- Existing Storybook 10.x configuration at `packages/cli/src/client/.storybook/`
- Existing story files in `packages/cli/src/client/src/**/*.stories.tsx`
- Component TypeScript types in `packages/cli/src/client/src/types/dashboard.ts`
- Tailwind CSS theme configuration for color verification

### Outputs

- Updated `packages/cli/package.json` with test dependencies
- Updated `.storybook/main.ts` with a11y addon configuration
- Updated story files with `play` functions for interaction tests
- Working `pnpm storybook test` command that runs all interaction tests
- Accessibility test coverage for key interactive components

## Acceptance Criteria

- [ ] `@storybook/test` and `@storybook/addon-a11y` are installed as dev dependencies
- [ ] The a11y addon is configured and visible in Storybook's addon panel
- [ ] StatusBadge stories have `play` functions verifying text and styling for all four variants (ready, in_progress, blocked, completed)
- [ ] Breadcrumb stories have `play` functions verifying link hierarchy for root, epic detail, and story detail states
- [ ] EpicList stories have `play` functions verifying epic card content, loading skeletons, and empty state messaging
- [ ] EpicDetail stories have `play` functions verifying story cards, header, and status displays
- [ ] StoryDetail stories have `play` functions verifying task items, journal entries, and metadata
- [ ] Key interactive components have accessibility tests (buttons, links, navigation elements)
- [ ] `pnpm storybook test` runs without errors and all tests pass
- [ ] Existing Storybook documentation functionality is not affected (stories still render correctly)

## Tasks

### t1: Install @storybook/test and @storybook/addon-a11y

**Guidance:**
- Add `@storybook/test` as a dev dependency - this provides `expect`, `within`, `userEvent`, and other testing utilities
- Add `@storybook/addon-a11y` as a dev dependency - this provides accessibility testing via axe-core
- Install from the CLI package directory to keep dependencies in the correct package.json
- Version should be compatible with Storybook 10.x

**References:**
- Storybook test docs: https://storybook.js.org/docs/writing-tests/interaction-testing
- a11y addon docs: https://storybook.js.org/docs/writing-tests/accessibility-testing
- Package.json: `packages/cli/package.json`

**Avoid:**
- Installing in the wrong package.json (should be in CLI package, not root)
- Installing incompatible versions (match the installed Storybook version)
- Installing testing-library separately (it's included in @storybook/test)

**Done when:**
- Both packages appear in `packages/cli/package.json` devDependencies
- `pnpm install` completes without errors
- Packages can be imported in story files

### t2: Configure a11y addon in Storybook

**Guidance:**
- Add `@storybook/addon-a11y` to the addons array in `.storybook/main.ts`
- The addon should appear after other addons in the list
- Verify the accessibility panel appears in Storybook's addon tabs

**References:**
- Storybook main.ts: `packages/cli/src/client/.storybook/main.ts`
- a11y configuration: https://storybook.js.org/docs/writing-tests/accessibility-testing#configure

**Avoid:**
- Disabling a11y checks globally (we want them enabled by default)
- Adding duplicate addon entries
- Modifying other addon configurations

**Done when:**
- `.storybook/main.ts` includes `@storybook/addon-a11y` in addons array
- Starting Storybook shows "Accessibility" panel in addon tabs
- a11y checks run automatically when viewing stories

### t3: Add play functions to StatusBadge stories

**Guidance:**
- Import `expect` and `within` from `@storybook/test`
- Add a `play` function to each StatusBadge story variant
- Verify the badge text content matches the expected status label
- Verify appropriate styling/colors are applied (use class or computed style checks)
- Test both "with count" and "without count" badge variants

**References:**
- StatusBadge stories: `packages/cli/src/client/src/components/StatusBadge.stories.tsx` (or in pages if inline)
- Status variants: ready (gray), in_progress (blue/primary), blocked (red/danger), completed (green/success)
- Storybook testing utilities: https://storybook.js.org/docs/writing-tests/interaction-testing

**Avoid:**
- Testing CSS implementation details that may change (test visible outcomes)
- Overly brittle selectors tied to DOM structure
- Testing the same thing multiple times across stories

**Done when:**
- Each status variant story has a `play` function
- Tests verify badge text matches expected label
- Tests verify visual distinction between variants
- `pnpm storybook test` passes for StatusBadge stories

### t4: Add play functions to Breadcrumb stories

**Guidance:**
- Test the root breadcrumb story: verify "Epics" text and home icon presence
- Test epic detail breadcrumb: verify Epics link, separator, and current epic name
- Test story detail breadcrumb: verify full hierarchy (Epics > epic-slug > story-slug)
- Use `within` to scope queries to the breadcrumb container
- Verify links have correct href attributes for navigation

**References:**
- Breadcrumb stories: `packages/cli/src/client/src/components/Breadcrumb.stories.tsx`
- Breadcrumb component: `packages/cli/src/client/src/components/Breadcrumb.tsx`

**Avoid:**
- Testing React Router navigation (that's Playwright territory)
- Verifying icon SVG content (check for icon container presence instead)
- Hardcoding specific route paths that may change

**Done when:**
- Root, epic detail, and story detail breadcrumb stories have `play` functions
- Tests verify correct text content at each breadcrumb level
- Tests verify link elements are present and have href attributes
- `pnpm storybook test` passes for Breadcrumb stories

### t5: Add play functions to EpicList stories

**Guidance:**
- For loading state story: verify skeleton elements are rendered
- For empty state story: verify "No epics found" message and guidance text
- For populated stories: verify epic cards show title, description summary, progress bar, status badges
- Test that archived epics toggle checkbox is present (don't test interaction behavior)
- Use `findBy*` queries for async rendering if needed

**References:**
- EpicList stories: `packages/cli/src/client/src/pages/EpicList.stories.tsx`
- EpicList component: `packages/cli/src/client/src/pages/EpicList.tsx`
- EpicSummary type: `packages/cli/src/client/src/types/dashboard.ts`

**Avoid:**
- Testing the archive toggle interaction (Playwright handles this)
- Making tests dependent on exact epic count (use flexible queries)
- Testing skeleton animation timing

**Done when:**
- Loading, empty, and populated stories have `play` functions
- Tests verify skeleton presence during loading
- Tests verify empty state messaging
- Tests verify epic cards render with expected content
- `pnpm storybook test` passes for EpicList stories

### t6: Add play functions to EpicDetail stories

**Guidance:**
- For loading state: verify header skeleton and story card skeletons render
- For 404 state: verify error message for non-existent epic
- For populated state: verify epic title, description, and story cards
- Verify story cards show story title, status badge, and task progress indicator
- Test stories with different status distributions

**References:**
- EpicDetail stories: `packages/cli/src/client/src/pages/EpicDetail.stories.tsx`
- EpicDetail component: `packages/cli/src/client/src/pages/EpicDetail.tsx`
- Epic type: `packages/cli/src/client/src/types/dashboard.ts`

**Avoid:**
- Testing navigation to story detail (Playwright handles this)
- Verifying exact pixel dimensions of progress bars
- Testing WebSocket subscription behavior

**Done when:**
- Loading, 404, error, and populated stories have `play` functions
- Tests verify header content renders correctly
- Tests verify story cards display with status and progress
- `pnpm storybook test` passes for EpicDetail stories

### t7: Add play functions to StoryDetail stories

**Guidance:**
- For loading state: verify header and content skeletons render
- For 404 state: verify error message for non-existent story
- For populated state: verify story title, status badge, and description
- Test Tasks tab: verify task items render with status icons (completed, in_progress, pending)
- Test Journal tab: verify journal entries render with type indicators (session, blocker, resolution)
- Verify metadata section shows epic link and timestamps

**References:**
- StoryDetail stories: `packages/cli/src/client/src/pages/StoryDetail.stories.tsx`
- StoryDetail component: `packages/cli/src/client/src/pages/StoryDetail.tsx`
- StoryDetail type, JournalEntry type: `packages/cli/src/client/src/types/dashboard.ts`

**Avoid:**
- Testing tab switching interaction (basic visual presence is sufficient)
- Testing journal entry expansion/collapse (Playwright can handle)
- Testing WebSocket real-time updates

**Done when:**
- Loading, 404, error, and populated stories have `play` functions
- Tests verify task list renders with correct status icons
- Tests verify journal entries display with type indicators
- Tests verify metadata section content
- `pnpm storybook test` passes for StoryDetail stories

### t8: Add accessibility tests to key interactive stories

**Guidance:**
- Import accessibility testing utilities from @storybook/addon-a11y or use the panel
- Add a11y assertions to stories with interactive elements:
  - Buttons and links should have accessible names
  - Navigation elements should have proper ARIA roles
  - Color contrast should meet WCAG AA standards
  - Focus indicators should be visible
- Focus on EpicCard (clickable), StoryCard (clickable), Breadcrumb links, and toggles

**References:**
- a11y testing: https://storybook.js.org/docs/writing-tests/accessibility-testing
- WCAG guidelines for interactive elements
- Dashboard uses dark theme - verify contrast in dark mode

**Avoid:**
- Testing every single story (focus on interactive components)
- Failing on minor issues that don't impact usability
- Disabling rules without justification

**Done when:**
- Key interactive stories include a11y test assertions
- Tests verify accessible names for buttons and links
- Tests verify proper ARIA attributes where needed
- `pnpm storybook test` passes including a11y checks

### t9: Verify all tests pass with pnpm storybook test

**Guidance:**
- Run `pnpm storybook test` from the CLI package directory
- All interaction tests should pass without failures
- All a11y tests should pass (or have documented exceptions)
- Fix any failing tests by adjusting test expectations (not component code)
- Verify tests run in a reasonable time (< 60 seconds)

**References:**
- Storybook test runner: https://storybook.js.org/docs/writing-tests/test-runner
- Package scripts: `packages/cli/package.json`

**Avoid:**
- Skipping failing tests without investigation
- Modifying component code to make tests pass (flag for separate fix)
- Running tests against production build (use dev mode for debugging)

**Done when:**
- `pnpm storybook test` exits with code 0
- All story `play` functions execute successfully
- Test output shows all tests passing
- Documentation of any known issues or exceptions
