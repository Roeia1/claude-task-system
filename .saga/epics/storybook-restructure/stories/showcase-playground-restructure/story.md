---
id: showcase-playground-restructure
title: Storybook Showcase-Playground Restructure
status: ready
epic: storybook-restructure
tasks:
  - id: t1
    title: Create mock data factories
    status: pending
  - id: t2
    title: Create PageWrapper component
    status: pending
  - id: t3
    title: Rewrite StatusBadge stories
    status: pending
  - id: t4
    title: Rewrite Breadcrumb stories
    status: pending
  - id: t5
    title: Rewrite EpicCard stories
    status: pending
  - id: t6
    title: Rewrite StoryCard stories
    status: pending
  - id: t7
    title: Rewrite SessionCard stories
    status: pending
  - id: t8
    title: Rewrite TaskItem stories
    status: pending
  - id: t9
    title: Rewrite JournalEntry stories
    status: pending
  - id: t10
    title: Rewrite LogViewer stories
    status: pending
  - id: t11
    title: Rewrite EpicContent stories
    status: pending
  - id: t12
    title: Rewrite ActiveSessions stories
    status: pending
  - id: t13
    title: Rewrite Epic List page stories
    status: pending
  - id: t14
    title: Rewrite Epic Detail page stories
    status: pending
  - id: t15
    title: Rewrite Story Detail page stories
    status: pending
  - id: t16
    title: Reorganize sidebar hierarchy
    status: pending
  - id: t17
    title: Delete obsolete files and verify build
    status: pending
---

## Context

The SAGA dashboard's Storybook currently has 50+ stories with significant redundancy and organization issues. Components like StatusBadge appear in 4+ places, making navigation confusing. Page components render without proper Layout context (missing header/breadcrumb), giving an inaccurate preview of how they appear in the actual dashboard.

This story implements a "Showcase + Playground" pattern where every component gets exactly 2 stories:
- **Showcase**: Curated display of 3-6 representative examples demonstrating typical usage, edge cases, and visual states
- **Playground**: Interactive story with preset-based controls for exploring all prop combinations

Mock data factories with presets ensure realistic, valid data combinations while allowing edge case testing through overrides. A PageWrapper component provides proper Layout context for Page stories.

## Scope Boundaries

**In scope:**
- Create `mock-factories.ts` with preset-based factory functions for all component data types (Epic, Story, Session, Task, Journal)
- Create `storybook-page-wrapper.tsx` providing MemoryRouter + Layout context for Page stories
- Rewrite 14 story files to Showcase + Playground pattern: StatusBadge, Breadcrumb, EpicCard, StoryCard, SessionCard, TaskItem, JournalEntry, LogViewer, EpicContent, ActiveSessions, Epic List, Epic Detail, Story Detail
- Update story `title` properties to organize into Foundation/Atoms/Components/Pages hierarchy
- Delete `layout.stories.tsx`
- Maintain all existing play functions for testing

**Out of scope:**
- Component logic or implementation changes (visual-only refactor)
- Adding new components to the dashboard
- Changes to the actual dashboard React application
- Performance optimizations beyond the restructure
- Adding new play function tests (only preserve existing)

## Interface

### Inputs

- Existing story files in `packages/cli/src/client/src/components/*.stories.tsx` and `packages/cli/src/client/src/pages/*.stories.tsx`
- Existing component files and their prop interfaces
- Existing `preview.tsx` decorator patterns
- Dashboard type definitions in `packages/cli/src/client/src/types/dashboard.ts`

### Outputs

- `packages/cli/src/client/src/test-utils/mock-factories.ts` - Factory functions for test data
- `packages/cli/src/client/src/test-utils/storybook-page-wrapper.tsx` - PageWrapper component
- 14 rewritten story files with Showcase + Playground pattern
- Sidebar hierarchy: Foundation -> Atoms -> Components -> Pages
- Reduced story count from 50+ to ~25-28

## Acceptance Criteria

- [ ] Story count reduced from 50+ to approximately 25-28 stories (14 components x 2 stories each)
- [ ] All components have exactly 2 stories: Showcase + Playground
- [ ] Page stories render with full Layout wrapper including header and breadcrumb
- [ ] No duplicate component entries in sidebar (StatusBadge appears once under Atoms, not in multiple places)
- [ ] Sidebar organized into Foundation/Atoms/Components/Pages hierarchy
- [ ] All preset combinations render valid UI without console errors
- [ ] Existing visual snapshot tests continue to pass
- [ ] Storybook builds without errors (`pnpm --filter @saga-ai/cli storybook build` succeeds)
- [ ] Each Showcase displays 3-6 representative examples
- [ ] Each Playground has working preset selector and override controls

## Tasks

### t1: Create mock data factories

**Guidance:**
- Create `packages/cli/src/client/src/test-utils/mock-factories.ts`
- Implement preset-based factory functions matching the epic's data model specifications
- Use TypeScript generics and overload signatures for type safety
- Export preset type unions for use in argTypes

**References:**
- `packages/cli/src/client/src/types/dashboard.ts` - Type definitions for EpicSummary, StoryDetail, SessionInfo, Task, JournalEntry
- Epic specification for preset types: `EpicPreset = 'typical' | 'just-started' | 'in-progress' | 'has-blockers' | 'almost-done' | 'completed'`
- Epic specification for override interfaces: `EpicOverrides`, `StoryOverrides`, `SessionOverrides`

**Avoid:**
- Creating overly complex factory signatures - keep simple preset + overrides pattern
- Hardcoding values that should come from presets
- Creating invalid data combinations (e.g., completed story with pending tasks)

**Done when:**
- `createMockEpic()`, `createMockStory()`, `createMockSession()`, `createMockTask()`, `createMockJournal()` functions exported
- Each function accepts preset name and optional overrides
- Preset type unions exported for use in Storybook argTypes
- All presets generate valid data matching dashboard types

### t2: Create PageWrapper component

**Guidance:**
- Create `packages/cli/src/client/src/test-utils/storybook-page-wrapper.tsx`
- Wrap children with MemoryRouter, DashboardProvider (if exists), and Layout components
- Accept `route` prop to set initial route for breadcrumb context
- Follow existing decorator patterns from `preview.tsx`

**References:**
- `packages/cli/src/client/.storybook/preview.tsx` - Existing decorator patterns
- `packages/cli/src/client/src/components/Layout.tsx` - Layout component to wrap
- React Router v7 imports from 'react-router' (not 'react-router-dom')

**Avoid:**
- Duplicating the dark theme decorator (already applied in preview.tsx)
- Breaking existing page story functionality
- Using react-router-dom imports (use 'react-router' for v7)

**Done when:**
- `PageWrapper` component exported with `{ children, route }` props
- Component renders children inside MemoryRouter + Layout
- Breadcrumb displays correct path based on route prop

### t3: Rewrite StatusBadge stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Display all 4 status variants (ready, inProgress, blocked, completed) with and without count
- Playground: Preset selector for status + count override controls
- Keep existing play functions for testing
- Update title to `'Atoms/StatusBadge'`

**References:**
- `packages/cli/src/client/src/components/status-badge.stories.tsx` - Current implementation with StatusBadge and StatusBadgeWithCount variants
- Current stories: Ready, InProgress, Blocked, Completed, AllVariants, WithCount variants, BadgeComparison, EdgeCases

**Avoid:**
- Losing existing visual snapshot tests (`matchCanvasSnapshot` calls)
- Removing the WithCount variant - consolidate into single file with both variants in Showcase
- Breaking existing play function assertions

**Done when:**
- Single story file with Showcase + Playground
- Showcase displays both variants (with/without count) across all statuses
- Playground has preset selector and count override
- Title updated to `'Atoms/StatusBadge'`
- Existing play functions preserved

### t4: Rewrite Breadcrumb stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Epic list, epic detail, story detail breadcrumb states
- Playground: Route path input for testing different navigation states
- Update title to `'Atoms/Breadcrumb'`

**References:**
- `packages/cli/src/client/src/components/breadcrumb.stories.tsx` - Current implementation
- Breadcrumb component uses react-router for route context

**Avoid:**
- Breaking router context - ensure MemoryRouter is used
- Testing invalid route patterns

**Done when:**
- Showcase displays 3 breadcrumb states (root, epic, story)
- Playground allows custom route input
- Title updated to `'Atoms/Breadcrumb'`

### t5: Rewrite EpicCard stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Typical epic, just started, in progress, with blockers, almost done, completed
- Playground: Epic preset selector + overrides for title, storyCounts, isArchived
- Update title to `'Components/EpicCard'`

**References:**
- Current epic-related stories in `epic-list.stories.tsx` or `epic-detail.stories.tsx`
- `createMockEpic()` factory function from t1

**Avoid:**
- Duplicating EpicCard stories that may exist in page stories
- Creating invalid story count combinations

**Done when:**
- Showcase displays 6 epic states using presets
- Playground has preset selector and override controls
- Title updated to `'Components/EpicCard'`

### t6: Rewrite StoryCard stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Ready, in-progress, blocked, almost-done, completed stories
- Playground: Story preset selector + overrides for title, taskCount
- Update title to `'Components/StoryCard'`

**References:**
- `packages/cli/src/client/src/pages/epic-detail.stories.tsx` - Contains StoryCard stories (Card, CardReady, CardBlocked, etc.)
- `createMockStory()` factory function from t1

**Avoid:**
- Breaking the existing grid layout stories
- Losing link navigation testing

**Done when:**
- Showcase displays 5 story states using presets
- Playground has preset selector and override controls
- Title updated to `'Components/StoryCard'`
- Router context preserved for link testing

### t7: Rewrite SessionCard stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Just started, running, long-running, no output, output unavailable
- Playground: Session preset selector + overrides for duration, output availability
- Update title to `'Components/SessionCard'`

**References:**
- `packages/cli/src/client/src/components/session-card.stories.tsx` - Current implementation
- `createMockSession()` factory function from t1

**Avoid:**
- Breaking relative time display testing
- Creating sessions with invalid status/output combinations

**Done when:**
- Showcase displays 5 session states using presets
- Playground has preset selector and override controls
- Title updated to `'Components/SessionCard'`

### t8: Rewrite TaskItem stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Pending, in-progress, completed tasks
- Playground: Task preset selector + title override
- Update title to `'Atoms/TaskItem'`

**References:**
- Task stories may be embedded in story-detail.stories.tsx
- `createMockTask()` factory function from t1

**Avoid:**
- Removing task status indicator testing
- Breaking checkbox/icon display tests

**Done when:**
- Showcase displays 3 task states using presets
- Playground has preset selector and title override
- Title updated to `'Atoms/TaskItem'`

### t9: Rewrite JournalEntry stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Session entry, blocker entry, resolution entry
- Playground: Journal type preset selector + content override
- Update title to `'Components/JournalEntry'`

**References:**
- Journal stories may be embedded in story-detail.stories.tsx
- `createMockJournal()` factory function from t1

**Avoid:**
- Losing timestamp display testing
- Breaking markdown content rendering tests

**Done when:**
- Showcase displays 3 journal types using presets
- Playground has preset selector and content override
- Title updated to `'Components/JournalEntry'`

### t10: Rewrite LogViewer stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Empty log, short log, long log with scroll, log with ANSI colors
- Playground: Log content textarea + line count controls
- Update title to `'Components/LogViewer'`

**References:**
- `packages/cli/src/client/src/components/log-viewer.stories.tsx` - Current implementation

**Avoid:**
- Breaking ANSI color rendering tests
- Losing scroll behavior testing for long logs

**Done when:**
- Showcase displays 4 log states
- Playground has log content input and controls
- Title updated to `'Components/LogViewer'`

### t11: Rewrite EpicContent stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Simple text, headings, lists, code blocks, tables, complete example
- Playground: Markdown content textarea for testing custom content
- Update title to `'Components/EpicContent'`

**References:**
- `packages/cli/src/client/src/components/epic-content.stories.tsx` - Current implementation with Headings, Lists, CodeBlocks, Tables, Links, Strikethrough, CollapsibleBehavior, CompleteExample

**Avoid:**
- Losing GFM feature testing (tables, strikethrough)
- Breaking collapsible behavior tests
- Removing individual markdown feature demonstrations from Showcase

**Done when:**
- Showcase displays 6 markdown feature examples
- Playground has markdown textarea for custom content
- Title updated to `'Components/EpicContent'`
- Collapsible interaction tests preserved

### t12: Rewrite ActiveSessions stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: No sessions, single session, multiple sessions, mixed status sessions
- Playground: Session count control + session preset selector
- Update title to `'Components/ActiveSessions'`

**References:**
- `packages/cli/src/client/src/components/active-sessions.stories.tsx` - Current implementation
- `createMockSession()` factory function from t1

**Avoid:**
- Breaking real-time update simulation tests
- Losing empty state display testing

**Done when:**
- Showcase displays 4 session list states
- Playground has session count and preset controls
- Title updated to `'Components/ActiveSessions'`

### t13: Rewrite Epic List page stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Loading state, empty state, single epic, multiple epics, with archived
- Playground: Epic count + preset selector with PageWrapper
- Update title to `'Pages/EpicList'`
- Use PageWrapper from t2 for proper Layout context

**References:**
- `packages/cli/src/client/src/pages/epic-list.stories.tsx` - Current implementation
- PageWrapper component from t2

**Avoid:**
- Rendering without Layout context (use PageWrapper)
- Breaking loading skeleton tests
- Losing navigation link tests

**Done when:**
- Showcase displays 5 page states with PageWrapper
- Playground has epic configuration controls
- Title updated to `'Pages/EpicList'`
- Page renders with full Layout including header/breadcrumb

### t14: Rewrite Epic Detail page stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Loading, not found, empty, populated, all completed, with blockers
- Playground: Epic preset selector + story count controls with PageWrapper
- Update title to `'Pages/EpicDetail'`
- Use PageWrapper from t2 for proper Layout context

**References:**
- `packages/cli/src/client/src/pages/epic-detail.stories.tsx` - Current implementation with Loading, NotFound, ErrorState, Empty, Populated, AllCompleted, WithBlockers
- PageWrapper component from t2

**Avoid:**
- Removing the sub-component stories (HeaderSkeleton, StoryCardSkeleton) - move these to Components section
- Breaking EpicContent integration
- Losing visual snapshot tests

**Done when:**
- Showcase displays 6 page states with PageWrapper
- Playground has epic and story configuration controls
- Title updated to `'Pages/EpicDetail'`
- Sub-component stories moved to appropriate locations
- Page renders with full Layout including header/breadcrumb

### t15: Rewrite Story Detail page stories

**Guidance:**
- Transform to Showcase + Playground pattern
- Showcase: Loading, not found, ready story, in-progress story, blocked story, completed story
- Playground: Story preset selector + task/journal controls with PageWrapper
- Update title to `'Pages/StoryDetail'`
- Use PageWrapper from t2 for proper Layout context

**References:**
- `packages/cli/src/client/src/pages/story-detail.stories.tsx` - Current implementation
- PageWrapper component from t2

**Avoid:**
- Rendering without Layout context (use PageWrapper)
- Breaking task list and journal display tests
- Losing blocker resolution UI testing

**Done when:**
- Showcase displays 6 page states with PageWrapper
- Playground has story, task, and journal configuration controls
- Title updated to `'Pages/StoryDetail'`
- Page renders with full Layout including header/breadcrumb

### t16: Reorganize sidebar hierarchy

**Guidance:**
- Update all story file meta `title` properties to follow hierarchy:
  - `Foundation/...` - Theme, colors, typography (if any exist)
  - `Atoms/StatusBadge`, `Atoms/Breadcrumb`, `Atoms/TaskItem`
  - `Components/EpicCard`, `Components/StoryCard`, `Components/SessionCard`, `Components/JournalEntry`, `Components/LogViewer`, `Components/EpicContent`, `Components/ActiveSessions`
  - `Pages/EpicList`, `Pages/EpicDetail`, `Pages/StoryDetail`
- Verify no duplicate entries appear in sidebar

**References:**
- Storybook title hierarchy documentation
- Current story file title properties

**Avoid:**
- Creating orphan categories with single items
- Breaking existing story URLs/paths
- Missing any story files in the reorganization

**Done when:**
- All story titles follow Foundation/Atoms/Components/Pages hierarchy
- Sidebar shows clean organization with no duplicates
- Each component appears exactly once in sidebar

### t17: Delete obsolete files and verify build

**Guidance:**
- Delete `packages/cli/src/client/src/components/layout.stories.tsx`
- Delete `packages/cli/src/client/src/components/theme-test.stories.tsx` if it exists and is redundant
- Run Storybook build to verify no errors
- Run existing visual snapshot tests

**References:**
- `packages/cli/src/client/src/components/layout.stories.tsx` - File to delete
- Build command: `pnpm --filter @saga-ai/cli storybook build`

**Avoid:**
- Deleting files that are still referenced
- Breaking the build with missing imports
- Removing files that contain unique, valuable tests

**Done when:**
- `layout.stories.tsx` deleted
- Storybook builds without errors
- Visual snapshot tests pass
- Story count is approximately 25-28 (14 Showcases + 14 Playgrounds, possibly minus a few if components are combined)
