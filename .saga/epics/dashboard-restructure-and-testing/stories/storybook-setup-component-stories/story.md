---
id: storybook-setup-component-stories
title: Storybook Setup and Component Stories
status: ready
epic: dashboard-restructure-and-testing
tasks:
  - id: t1
    title: Install and configure Storybook 10.x
    status: pending
  - id: t2
    title: Configure Tailwind CSS and theme integration
    status: pending
  - id: t3
    title: Create stories for Layout component
    status: pending
  - id: t4
    title: Create stories for Breadcrumb component
    status: pending
  - id: t5
    title: Create stories for EpicList page and subcomponents
    status: pending
  - id: t6
    title: Create stories for EpicDetail page and subcomponents
    status: pending
  - id: t7
    title: Create stories for StoryDetail page and subcomponents
    status: pending
  - id: t8
    title: Create stories for status badges
    status: pending
  - id: t9
    title: Add Storybook scripts and verify build
    status: pending
---

## Context

The SAGA Dashboard is a React frontend that displays epics and stories from the `.saga/` directory. While the dashboard uses shadcn/ui for base components, it has several custom SAGA-specific components that need documentation and isolated development support. This story establishes Storybook 10.x as the component development environment, configured for the existing Vite + Tailwind CSS setup, and creates comprehensive stories for all custom SAGA components.

Storybook provides value by:
- Documenting component props and variants in isolation
- Enabling rapid UI development without running the full backend
- Serving as living documentation for the component library
- Supporting visual regression testing (used by a sibling story)

The dashboard is located at `packages/cli/src/client/` and uses React 19 with Vite as the build tool. The custom components include Layout, Breadcrumb, and three page components (EpicList, EpicDetail, StoryDetail) which contain reusable subcomponents like status badges, skeleton loaders, and cards.

## Scope Boundaries

**In scope:**
- Installing Storybook 10.x with React and Vite support
- Configuring Storybook to work with the existing Tailwind CSS setup
- Creating stories for custom SAGA components:
  - Layout component (header, navigation shell)
  - Breadcrumb component (navigation breadcrumbs)
  - EpicList page (EpicCard, EpicCardSkeleton, StatusBadge with counts)
  - EpicDetail page (StoryCard, HeaderSkeleton, StoryCardSkeleton, StatusBadge)
  - StoryDetail page (TaskItem, TaskStatusIcon, JournalEntryItem, StatusBadge, skeletons)
  - All status badge variants (ready, in_progress, blocked, completed)
- Documenting component props with TypeScript integration
- Setting up Storybook scripts in package.json

**Out of scope:**
- Creating stories for base shadcn/ui components (button, card, badge, etc.) - these are documented externally
- Visual regression testing setup (covered by "Visual Regression Testing" story)
- Playwright integration tests (covered by "Playwright Integration Tests" story)
- E2E tests (covered by "Playwright E2E Tests" story)
- Package structure changes (covered by "Flatten Dashboard Package Structure" story)
- Major refactoring of components to make them more testable
- Testing actual API interactions or WebSocket functionality

## Interface

### Inputs

- Existing React components in `packages/cli/src/client/src/components/`
- Existing page components in `packages/cli/src/client/src/pages/`
- Existing Tailwind CSS configuration in `packages/cli/src/client/`
- Existing TypeScript types in `packages/cli/src/client/src/types/dashboard.ts`

### Outputs

- Configured Storybook 10.x installation at `packages/cli/src/client/.storybook/`
- Story files for each custom component in `packages/cli/src/client/src/**/*.stories.tsx`
- NPM scripts: `storybook` (dev server) and `build-storybook` (static build)
- Static Storybook build capability for CI/documentation

## Acceptance Criteria

- [ ] Storybook 10.x is installed and configured for React + Vite
- [ ] `pnpm storybook` starts the Storybook dev server without errors
- [ ] `pnpm build-storybook` produces a static build without errors
- [ ] Tailwind CSS styles render correctly in Storybook
- [ ] Layout component has stories showing header and navigation shell
- [ ] Breadcrumb component has stories for all navigation states (root, epic detail, story detail)
- [ ] EpicList has stories for: loading state, empty state, populated state, with archived epics
- [ ] EpicDetail has stories for: loading state, 404 state, error state, populated state with various story statuses
- [ ] StoryDetail has stories for: loading state, 404 state, error state, populated state with tasks and journal entries
- [ ] StatusBadge has stories showing all four status variants (ready, in_progress, blocked, completed)
- [ ] All stories use TypeScript and document component props via Storybook's autodocs

## Tasks

### t1: Install and configure Storybook 10.x

**Guidance:**
- Use the Storybook CLI to initialize: `npx storybook@10 init` from the `packages/cli/src/client/` directory
- Select React + Vite as the framework when prompted
- Storybook 10.x is ESM-only, ensure configuration files use ESM syntax
- The main config will be at `.storybook/main.ts`

**References:**
- Storybook 10 documentation: https://storybook.js.org/docs
- Existing Vite config: `packages/cli/src/client/vite.config.ts`

**Avoid:**
- Installing Storybook 8.x or older versions
- Using CommonJS syntax in Storybook config files
- Installing unnecessary addons (keep the default minimal set)

**Done when:**
- `.storybook/main.ts` and `.storybook/preview.ts` exist
- `npx storybook dev` starts without errors
- Default example stories (if generated) render correctly

### t2: Configure Tailwind CSS and theme integration

**Guidance:**
- Import the global CSS file in `.storybook/preview.ts` to include Tailwind styles
- Ensure the Tailwind config from the client directory is picked up
- Configure dark mode to match the dashboard's default dark theme
- Set up decorators to provide consistent styling context for stories

**References:**
- Tailwind CSS config: `packages/cli/src/client/tailwind.config.js`
- Global styles: `packages/cli/src/client/src/index.css`
- Theme colors are defined as CSS custom properties

**Avoid:**
- Creating a separate Tailwind config for Storybook
- Duplicating CSS imports
- Using light mode as the default (dashboard uses dark mode)

**Done when:**
- Stories render with correct dark theme colors
- Tailwind utility classes work in story components
- Custom SAGA color tokens (primary, success, danger, etc.) render correctly

### t3: Create stories for Layout component

**Guidance:**
- Create `packages/cli/src/client/src/components/Layout.stories.tsx`
- The Layout component requires React Router context (uses `<Outlet />`)
- Use Storybook's decorators to provide a mock router context
- Show the component with sample child content via the Outlet

**References:**
- Component: `packages/cli/src/client/src/components/Layout.tsx`
- Uses Breadcrumb component and Toaster

**Avoid:**
- Testing actual routing behavior (that's for E2E tests)
- Including the DashboardContext provider (mock the toast hook if needed)

**Done when:**
- Layout story renders with header showing "SAGA Dashboard"
- Breadcrumb area is visible
- Main content area shows placeholder content

### t4: Create stories for Breadcrumb component

**Guidance:**
- Create `packages/cli/src/client/src/components/Breadcrumb.stories.tsx`
- The Breadcrumb component uses `useParams` from React Router
- Create decorators that mock different route states
- Show three variants: root (Epics only), epic detail, story detail

**References:**
- Component: `packages/cli/src/client/src/components/Breadcrumb.tsx`
- Uses lucide-react icons (Home, ChevronRight)

**Avoid:**
- Relying on actual navigation to test states
- Over-mocking - keep decorators simple and focused

**Done when:**
- Root breadcrumb story shows: Home icon + "Epics"
- Epic detail story shows: Epics > epic-slug
- Story detail story shows: Epics > epic-slug > story-slug
- Links are visually distinguishable from current page indicator

### t5: Create stories for EpicList page and subcomponents

**Guidance:**
- Create `packages/cli/src/client/src/pages/EpicList.stories.tsx`
- Extract and export the subcomponents for individual stories:
  - EpicCardSkeleton (loading placeholder)
  - StatusBadge (with count parameter)
  - EpicCard (single epic card)
- Create composite stories for the full EpicList in different states
- Mock the `useDashboard` hook or provide test data via props

**References:**
- Component: `packages/cli/src/client/src/pages/EpicList.tsx`
- Types: `EpicSummary`, `StoryStatus` from `src/types/dashboard.ts`

**Avoid:**
- Making actual API calls in stories
- Testing the archived filter checkbox interaction extensively (basic visibility is fine)

**Done when:**
- EpicCardSkeleton story shows animated loading state
- StatusBadge stories show all four status variants with different counts
- EpicCard story shows a realistic epic with progress bar and status badges
- EpicList stories cover: loading (3 skeletons), empty state, populated with 3+ epics

### t6: Create stories for EpicDetail page and subcomponents

**Guidance:**
- Create `packages/cli/src/client/src/pages/EpicDetail.stories.tsx`
- Extract and export subcomponents for individual stories:
  - HeaderSkeleton (loading placeholder for epic header)
  - StoryCardSkeleton (loading placeholder for story cards)
  - StatusBadge (single status, no count)
  - StoryCard (single story card with task progress)
- Create composite stories for the full EpicDetail in different states

**References:**
- Component: `packages/cli/src/client/src/pages/EpicDetail.tsx`
- Types: `Epic`, `StoryDetail`, `StoryStatus` from `src/types/dashboard.ts`

**Avoid:**
- Duplicating StatusBadge stories if already covered in EpicList
- Testing navigation behavior

**Done when:**
- HeaderSkeleton and StoryCardSkeleton stories show loading states
- StoryCard stories show cards with different statuses and task progress
- EpicDetail stories cover: loading, 404 error, general error, empty (no stories), populated

### t7: Create stories for StoryDetail page and subcomponents

**Guidance:**
- Create `packages/cli/src/client/src/pages/StoryDetail.stories.tsx`
- Extract and export subcomponents for individual stories:
  - HeaderSkeleton, ContentSkeleton (loading placeholders)
  - TaskStatusIcon (completed, in_progress, pending)
  - TaskItem (single task row)
  - JournalEntryItem (collapsible journal entry)
- Create composite stories for the full StoryDetail in different states
- Show all three tabs: Tasks, Story Content, Journal

**References:**
- Component: `packages/cli/src/client/src/pages/StoryDetail.tsx`
- Types: `StoryDetail`, `JournalEntry`, `JournalEntryType`, `TaskStatus` from `src/types/dashboard.ts`

**Avoid:**
- Testing WebSocket subscriptions
- Testing tab switching interactions (visual coverage is sufficient)

**Done when:**
- Skeleton stories show loading states
- TaskStatusIcon stories show all three task states with correct icons/colors
- TaskItem stories show tasks in different states
- JournalEntryItem stories show session, blocker, and resolution entries (collapsed and expanded)
- StoryDetail stories cover: loading, 404, error, populated with tasks and journal

### t8: Create stories for status badges

**Guidance:**
- Create a dedicated `packages/cli/src/client/src/components/StatusBadge.stories.tsx`
- Since StatusBadge is defined inline in EpicList and EpicDetail, either:
  1. Extract to a shared component file and create stories, OR
  2. Create story-only versions that demonstrate the visual variants
- Show both variants: with count (EpicList style) and without count (EpicDetail/StoryDetail style)

**References:**
- EpicList StatusBadge: `packages/cli/src/client/src/pages/EpicList.tsx` lines 30-50
- EpicDetail StatusBadge: `packages/cli/src/client/src/pages/EpicDetail.tsx` lines 49-66

**Avoid:**
- Creating breaking changes to existing components
- Over-engineering a shared component if inline definitions work fine

**Done when:**
- All four status variants are documented: ready (gray), in_progress (primary/blue), blocked (danger/red), completed (success/green)
- Both badge styles are shown: with count label and without
- Color tokens render correctly matching the dashboard theme

### t9: Add Storybook scripts and verify build

**Guidance:**
- Add scripts to `packages/cli/package.json`:
  - `"storybook": "storybook dev -p 6006 -c src/client/.storybook"`
  - `"build-storybook": "storybook build -c src/client/.storybook -o storybook-static"`
- Verify both scripts run successfully
- Ensure storybook-static output directory is gitignored

**References:**
- Package: `packages/cli/package.json`
- Existing scripts pattern in the package.json

**Avoid:**
- Adding Storybook dependencies to the root package.json
- Running Storybook from a different directory than the CLI package

**Done when:**
- `pnpm storybook` starts dev server on port 6006
- `pnpm build-storybook` creates `storybook-static/` directory
- Build completes without errors or warnings
- `storybook-static/` is listed in `.gitignore`
