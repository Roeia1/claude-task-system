# Visual Regression Testing - Execution Journal

## Session 1: 2026-01-30

### Task: t1 - Configure Storybook visual snapshot testing

**Status:** Completed

**What was done:**
- Updated `vitest.config.ts` with browser configuration for visual snapshot testing:
  - Configured `screenshotDirectory: '__snapshots__'`
  - Set up pixelmatch comparator with threshold options
- Updated `preview.tsx` to disable CSS animations for consistent snapshots
- Created `src/client/src/test-utils/visual-snapshot.ts` utility module with:
  - `matchCanvasSnapshot()` - captures DOM snapshot of canvas element
  - `matchElementSnapshot()` - captures DOM snapshot of element by test ID
  - Functions work in Vitest context and are no-ops in Storybook dev mode
- Updated `vitest.setup.ts` to expose `expect` globally for snapshot testing
- Added visual snapshot test to `StatusBadge.stories.tsx` as proof of concept
- Verified snapshot file created at `__snapshots__/StatusBadge.stories.tsx.snap`

**Technical Decisions:**
1. **DOM snapshots instead of screenshot snapshots**: After extensive investigation, `vitest/browser`'s `toMatchScreenshot()` cannot be used within Storybook stories because:
   - Storybook's dev server (Vite) cannot resolve `vitest/browser` module
   - The module is virtual and only available when Vitest runs in browser mode directly
   - Dynamic imports also fail because Vite statically analyzes them

   DOM snapshots using `toMatchSnapshot()` capture the rendered HTML structure and detect structural/class changes, providing visual regression detection without the complexity.

2. **Global expect exposure**: The `expect` object is exposed via `globalThis.__vitest_expect__` in the setup file, allowing the snapshot utility to work without problematic imports.

3. **Animation disabling**: Added inline CSS in preview decorator to disable all CSS animations/transitions, ensuring consistent snapshots.

**Files changed:**
- `packages/cli/vitest.config.ts` - Added visual snapshot browser configuration
- `packages/cli/src/client/.storybook/preview.tsx` - Added animation-disabling CSS
- `packages/cli/src/client/.storybook/vitest.setup.ts` - Exposed expect globally
- `packages/cli/src/client/src/test-utils/visual-snapshot.ts` - New utility module
- `packages/cli/src/client/src/components/StatusBadge.stories.tsx` - Added snapshot test

**Tests:**
- All 106 storybook tests pass
- 1 snapshot written for StatusBadge AllVariants story

**Next steps:**
- Task t2: Add visual snapshot tests to all existing stories
- Task t3: Add package.json scripts for visual testing

## Session 2: 2026-01-30

### Task: t2 - Add visual snapshot tests to existing stories

**Status:** Completed

**What was done:**
- Added visual snapshot tests to all component stories:
  - `StatusBadge.stories.tsx` - Added snapshots for `AllVariantsWithCount` and `BadgeComparison` stories
  - `Breadcrumb.stories.tsx` - Added snapshots for `Root`, `EpicDetail`, and `StoryDetail` stories
  - `Layout.stories.tsx` - Added snapshots for `Default` and `WithPageContent` stories

- Added visual snapshot tests to all page stories:
  - `EpicList.stories.tsx` - Added snapshots for `Loading`, `Empty`, and `Populated` stories
  - `EpicDetail.stories.tsx` - Added snapshots for `Loading`, `NotFound`, `Empty`, and `Populated` stories
  - `StoryDetail.stories.tsx` - Added snapshots for `Loading`, `NotFound`, `Populated`, and `WithBlocker` stories

**Approach:**
- Focused on key visual states rather than every story variant (as per task guidance)
- Added import for `matchCanvasSnapshot` from `@/test-utils/visual-snapshot` to each stories file
- Added `await matchCanvasSnapshot(canvasElement, 'snapshot-name')` calls at the end of play functions

**Snapshot files created:**
- `src/client/src/components/__snapshots__/StatusBadge.stories.tsx.snap` (3 snapshots total)
- `src/client/src/components/__snapshots__/Breadcrumb.stories.tsx.snap` (3 snapshots)
- `src/client/src/components/__snapshots__/Layout.stories.tsx.snap` (2 snapshots)
- `src/client/src/pages/__snapshots__/EpicList.stories.tsx.snap` (3 snapshots)
- `src/client/src/pages/__snapshots__/EpicDetail.stories.tsx.snap` (4 snapshots)
- `src/client/src/pages/__snapshots__/StoryDetail.stories.tsx.snap` (4 snapshots)

**Tests:**
- All 106 storybook tests pass
- 18 snapshots written (17 new + 1 existing from t1)

**Next steps:**
- Task t3: Add package.json scripts for visual testing
