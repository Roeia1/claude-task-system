# Storybook Restructure

## Overview

Restructure the SAGA dashboard's Storybook component library from 50+ cluttered stories to ~25 well-organized stories using a "Showcase + Playground" pattern. Each component will have a Showcase displaying curated examples and a Playground with presets and override controls for interactive exploration.

## Goals

- Reduce story count from 50+ to ~25 while maintaining full component coverage
- Organize components into a clear hierarchy (Foundation → Atoms → Components → Pages)
- Provide realistic mock data via presets with override controls for edge case testing
- Eliminate duplicate stories (e.g., StatusBadge appearing in 4 places)
- Show Pages with full Layout context (header/breadcrumb)

## Success Metrics

- Story count reduced from 50+ to ~25
- All components have exactly 2 stories: Showcase + Playground
- Pages render with full Layout wrapper including header and breadcrumb
- No duplicate component entries in sidebar

## Scope

### In Scope

- Create mock data factories with preset functions for all components
- Create `PageWrapper` component for Page stories with Layout context
- Rewrite 14 story files with Showcase + Playground pattern
- Implement presets and overrides for: StatusBadge, EpicCard, StoryCard, SessionCard, TaskItem, JournalEntry, LogViewer, Breadcrumb, EpicContent, ActiveSessions, Epic List, Epic Detail, Story Detail
- Organize sidebar into Foundation/Atoms/Components/Pages hierarchy
- Keep play functions for both Showcase and Playground stories

### Out of Scope

- Component logic changes (visual-only refactor)
- Adding new components
- Changing the actual dashboard React application
- Performance optimizations beyond the restructure

## Non-Functional Requirements

- Storybook builds without errors
- All preset combinations render valid UI
- Stories are scannable (3-6 examples per Showcase)
- Playgrounds provide realistic defaults with full control override
- Existing visual snapshot tests preserved in the new structure

## Technical Approach

1. **Step 1: Create Mock Data Factories** - Build `mock-factories.ts` in `packages/cli/src/client/src/test-utils/` with preset-based factory functions. Follow existing patterns using `@storybook/react-vite` types.

2. **Step 2: Create Page Wrapper** - Build `storybook-page-wrapper.tsx` providing MemoryRouter + Layout context for Page stories (follow existing decorator patterns from `preview.tsx`).

3. **Step 3: Rewrite Story Files** - Transform each component's stories to Showcase + Playground pattern using existing `Meta<typeof Component>` and `StoryObj` patterns. Keep existing play functions for testing.

4. **Step 4: Update Story Titles** - Reorganize into Foundation/Atoms/Components/Pages hierarchy via `title` property in meta.

5. **Step 5: Delete Obsolete Files** - Remove `layout.stories.tsx`.

## Key Decisions

### Showcase + Playground Pattern

- **Choice**: Every component gets exactly 2 stories (Showcase + Playground)
- **Rationale**: Balances discoverability (Showcase shows curated examples) with flexibility (Playground provides full control)
- **Alternatives Considered**: Single story with all variants, MDX docs pages, individual stories per prop value

### Presets + Overrides Architecture

- **Choice**: Factory functions that accept preset name + optional overrides
- **Rationale**: Realistic default data with full Storybook controls power; ensures valid data combinations while allowing edge case testing
- **Alternatives Considered**: Pure argTypes (less realistic), hardcoded data (no flexibility)

### Keep Play Functions

- **Choice**: Both Showcase and Playground stories include play functions for testing
- **Rationale**: Maintains existing test coverage and enables visual regression testing via Storybook test addon
- **Alternatives Considered**: Showcase only, remove all play functions

## Data Models

### Preset Types

```typescript
// Epic presets
type EpicPreset = 'typical' | 'just-started' | 'in-progress' | 'has-blockers' | 'almost-done' | 'completed';

// Story presets
type StoryPreset = 'ready' | 'in-progress' | 'blocked' | 'almost-done' | 'completed';

// Session presets
type SessionPreset = 'just-started' | 'running' | 'long-running' | 'no-output' | 'output-unavailable';

// Journal presets
type JournalPreset = 'session' | 'blocker' | 'resolution';

// Task presets
type TaskPreset = 'pending' | 'in-progress' | 'completed';
```

### Override Interfaces

```typescript
interface EpicOverrides {
  title?: string;
  totalStories?: number;
  isArchived?: boolean;
}

interface StoryOverrides {
  title?: string;
  taskCount?: number;
}

interface SessionOverrides {
  storySlug?: string;
  epicSlug?: string;
  durationSeconds?: number;
}
```

## Interface Contracts

### Mock Factory Functions

- **Function**: `createMockEpic(preset: EpicPreset, overrides?: EpicOverrides): EpicSummary`
- **Input**: Preset name, optional overrides
- **Output**: Complete EpicSummary with realistic data

- **Function**: `createMockStory(preset: StoryPreset, overrides?: StoryOverrides): StoryDetail`
- **Input**: Preset name, optional overrides
- **Output**: Complete StoryDetail with realistic data

- **Function**: `createMockSession(preset: SessionPreset, overrides?: SessionOverrides): SessionInfo`
- **Input**: Preset name, optional overrides
- **Output**: Complete SessionInfo with realistic data

### PageWrapper Component

- **Component**: `PageWrapper`
- **Props**: `{ children: React.ReactNode, route: string }`
- **Output**: Children wrapped with MemoryRouter, DashboardProvider, and Layout components

## Tech Stack

- `@storybook/react-vite`: Storybook framework
- `storybook/test`: Play functions (expect, within)
- `@/test-utils/visual-snapshot`: Existing visual snapshot testing utilities
- `react-router`: MemoryRouter for page routing context (v7 imports)

## Open Questions

- None - all questions resolved during epic creation dialog
