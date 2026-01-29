# Epic README Display in Dashboard

## Overview

Add the ability to display the epic's README/epic.md content directly in the SAGA dashboard. When a user clicks on an epic to view its stories, they should also be able to read the full epic documentation that describes the vision, goals, architecture, and context for that epic.

## Goals

- Enable users to read epic documentation (epic.md) directly within the dashboard interface
- Provide context for stories by surfacing the parent epic's details alongside the story list
- Improve dashboard usability by eliminating the need to open separate files to understand an epic

## Success Metrics

- Epic content is visible in the EpicDetail page when viewing an epic
- The content renders markdown properly (headings, lists, code blocks, tables)
- Content loads alongside story data without additional user action

## Scope

### In Scope

- Display epic.md content on the EpicDetail page
- Markdown rendering for the epic content using react-markdown
- Collapsible UI component to toggle/expand the epic content view

### Out of Scope

- Editing epic.md from the dashboard (read-only display)
- Displaying epic content on the EpicList page (only on detail view)
- PDF export or print formatting

## Non-Functional Requirements

- **Performance**: Epic content should load without noticeable delay (fetched with epic data)
- **Usability**: Content should be collapsible so users can focus on stories when needed
- **Accessibility**: Markdown rendered content should be screen-reader friendly

## Technical Approach

The implementation involves both backend and frontend changes:

1. **Backend (Parser)**: The `/api/epics/:slug` endpoint already returns an `Epic` object with a `content?: string` field in the type definition. The parser in `packages/cli/src/server/parser.ts` needs to read the full epic.md file content and include it when fetching epic details.

2. **Frontend (EpicDetail)**: The `EpicDetail.tsx` page will add a collapsible section above the stories grid to display the epic content. This section will be expanded by default.

3. **Markdown Rendering**: Add react-markdown and remark-gfm packages to render the epic.md content with proper formatting (headings, lists, code blocks, tables, etc.).

## Key Decisions

### UI Display Pattern

- **Choice**: Collapsible section above stories grid, expanded by default
- **Rationale**: Keeps stories visible while providing easy access to epic context; users can collapse when focusing on story work
- **Alternatives Considered**: Tab interface (adds navigation friction), side panel (reduces screen space for stories)

### Markdown Rendering Library

- **Choice**: react-markdown with remark-gfm plugin
- **Rationale**: Industry standard, lightweight, supports GitHub Flavored Markdown features commonly used in epic docs (tables, task lists, strikethrough)
- **Alternatives Considered**: Pre-formatted text (loses formatting), marked.js (requires dangerouslySetInnerHTML which has security implications)

### Default Collapsible State

- **Choice**: Expanded by default
- **Rationale**: Users see epic context immediately when opening an epic, providing full context before reviewing stories
- **Alternatives Considered**: Collapsed by default (would require extra click to see context)

## Data Models

No schema changes required. The existing `Epic` interface already includes a `content?: string` field:

```typescript
interface Epic extends EpicSummary {
  content?: string        // epic.md content - needs to be populated
  stories: StoryDetail[]
}
```

## Interface Contracts

### GET /api/epics/:slug

- **Endpoint**: `GET /api/epics/:slug`
- **Input**: Epic slug as URL parameter
- **Output**: `Epic` object with `content` field now populated with epic.md file contents

No API signature changes - the existing endpoint will include the content that was previously undefined.

## Tech Stack

- **react-markdown**: Render markdown content as React components
- **remark-gfm**: GitHub Flavored Markdown plugin for tables, task lists, strikethrough
- **Radix UI Collapsible**: Already available in the project for collapsible sections

## Open Questions

- None - all questions resolved during epic creation
