---
id: epic-content-display
title: Epic content display in dashboard
status: completed
epic: epic-readme-display-dashboard
tasks:
  - id: t1
    title: Add react-markdown and remark-gfm dependencies
    status: completed
  - id: t2
    title: Create EpicContent collapsible component
    status: completed
  - id: t3
    title: Integrate EpicContent into EpicDetail page
    status: completed
  - id: t4
    title: Add unit tests for EpicContent component
    status: completed
  - id: t5
    title: Add integration tests for epic content display
    status: completed
---

## Context

The SAGA dashboard currently displays epic metadata (title, progress, story counts) and a grid of story cards when viewing an epic. However, users cannot see the full epic documentation (epic.md) which contains critical context like goals, scope, technical approach, and architecture decisions.

This story implements a collapsible markdown display section in the EpicDetail page that renders the epic.md content above the stories grid. The section will be expanded by default so users immediately see the epic context when opening an epic. Users can collapse it when they want to focus on individual stories.

The backend already provides the epic content via the `/api/epics/:slug` endpoint - the `Epic` response includes a `content` field populated from the epic.md file. This story focuses on the frontend implementation: adding markdown rendering capabilities and a collapsible UI component.

## Scope Boundaries

**In scope:**
- Installing react-markdown and remark-gfm packages for markdown rendering
- Creating a reusable EpicContent component with collapsible behavior
- Integrating the component into EpicDetail.tsx above the stories grid
- Styling the markdown output to match the dashboard theme
- Unit tests for the new component
- Integration tests verifying end-to-end behavior

**Out of scope:**
- Editing epic.md from the dashboard (read-only display)
- Displaying epic content on the EpicList page (only on detail view)
- PDF export or print formatting
- Caching or performance optimizations beyond what exists
- Backend changes (content is already provided in the API response)

## Interface

### Inputs

- `Epic.content?: string` - The raw markdown content from epic.md, provided by the existing `/api/epics/:slug` API endpoint

### Outputs

- Rendered markdown content displayed in a collapsible section on the EpicDetail page
- Accessible, screen-reader friendly content with proper heading hierarchy

## Acceptance Criteria

- [ ] react-markdown and remark-gfm are added to package.json devDependencies
- [ ] EpicContent component renders markdown with proper formatting (headings, lists, code blocks, tables)
- [ ] EpicContent section appears above the stories grid in EpicDetail
- [ ] Collapsible section is expanded by default when epic loads
- [ ] Collapse/expand toggle works correctly with smooth animation
- [ ] Component handles missing/empty content gracefully (no errors, section hidden)
- [ ] Markdown styles match the dashboard's dark theme
- [ ] All existing tests continue to pass
- [ ] New unit tests cover EpicContent component behavior
- [ ] Integration tests verify epic content is visible on EpicDetail page

## Tasks

### t1: Add react-markdown and remark-gfm dependencies

**Guidance:**
- Add react-markdown and remark-gfm as devDependencies (they're only used in the client build)
- Use pnpm to add the packages in the packages/cli directory
- Verify TypeScript types are included (react-markdown includes its own types)

**References:**
- `packages/cli/package.json` - existing dependencies location
- react-markdown: https://github.com/remarkjs/react-markdown
- remark-gfm: https://github.com/remarkjs/remark-gfm (for GitHub Flavored Markdown)

**Avoid:**
- Adding to regular dependencies (these are dev/build-time only)
- Installing additional plugins beyond remark-gfm (keep minimal)

**Done when:**
- `pnpm install` succeeds with new packages
- Import `import ReactMarkdown from 'react-markdown'` works without errors
- Import `import remarkGfm from 'remark-gfm'` works without errors

### t2: Create EpicContent collapsible component

**Guidance:**
- Create component at `src/client/src/components/EpicContent.tsx`
- Use existing Radix UI Collapsible primitive (already in project)
- Accept `content: string | undefined` prop
- Return null when content is empty/undefined (no empty section)
- Default to expanded state (`open={true}`)
- Include toggle button with clear expand/collapse indication
- Use lucide-react icons (ChevronDown/ChevronUp) for toggle indicator

**References:**
- `packages/cli/src/client/src/components/ui/collapsible.tsx` - existing Collapsible components
- `packages/cli/src/client/src/pages/EpicDetail.tsx` - target integration location
- Radix Collapsible: https://www.radix-ui.com/primitives/docs/components/collapsible

**Avoid:**
- Custom collapse animation implementation (use Radix built-in)
- Inline styles (use Tailwind classes)
- Hardcoding colors (use theme CSS variables like `text-text`, `bg-bg-light`)

**Done when:**
- Component renders markdown content using react-markdown with remark-gfm
- Collapsible toggle button shows "Epic Documentation" header with chevron icon
- Section expands/collapses smoothly
- Component returns null when content is undefined or empty string

### t3: Integrate EpicContent into EpicDetail page

**Guidance:**
- Import EpicContent component in EpicDetail.tsx
- Add component between epic header section and stories list
- Pass `currentEpic.content` as the content prop
- Ensure layout flows correctly with spacing between sections

**References:**
- `packages/cli/src/client/src/pages/EpicDetail.tsx:193-227` - current layout structure
- `packages/cli/src/client/src/components/ui/card.tsx` - styling patterns

**Avoid:**
- Breaking existing layout or spacing
- Showing loading skeleton for content (header skeleton is sufficient)
- Conditional rendering based on loading state (component handles empty content)

**Done when:**
- EpicContent appears between header and stories sections
- Spacing is consistent with rest of page (space-y-6)
- No visual regressions on empty epics (component hidden when no content)
- Page layout matches expected design from epic specification

### t4: Add unit tests for EpicContent component

**Guidance:**
- Create test file at `src/client/src/components/EpicContent.test.tsx`
- Test markdown rendering (headings, lists, code blocks, tables)
- Test collapsible behavior (expand/collapse toggle)
- Test empty/undefined content handling
- Use Vitest and React Testing Library (existing test setup)

**References:**
- `packages/cli/src/client/src/components/*.test.tsx` - existing component test patterns
- `packages/cli/vitest.config.ts` - test configuration

**Avoid:**
- Testing react-markdown library internals
- Snapshot tests (prefer explicit assertions)
- Testing Radix Collapsible internals (only test component behavior)

**Done when:**
- Tests verify markdown renders with proper elements (h1, ul, code, table)
- Tests verify collapse/expand toggle changes visibility
- Tests verify component returns null for empty content
- All tests pass with `pnpm test`

### t5: Add integration tests for epic content display

**Guidance:**
- Add test cases to existing EpicDetail integration tests or create new spec file
- Use Playwright for end-to-end testing
- Test that epic content section is visible when viewing an epic with content
- Test that section is not visible when epic has no content
- Test collapse/expand interaction

**References:**
- `packages/cli/src/client/playwright.config.ts` - Playwright configuration
- `packages/cli/src/client/tests/` - existing integration test patterns (if present)
- `packages/cli/src/client/playwright.e2e.config.ts` - e2e test configuration

**Avoid:**
- Duplicating unit test coverage
- Testing markdown rendering details (unit tests cover this)
- Flaky selectors (use data-testid attributes)

**Done when:**
- Integration test verifies epic content section appears on EpicDetail page
- Test verifies collapse/expand button functionality
- Tests pass with `pnpm test:integration` or `pnpm test:e2e`
