/**
 * Tests for Epic Detail view (t8)
 *
 * Verifies:
 * - Component structure and imports
 * - Data fetching from /api/epics/:slug
 * - Epic header with title and progress
 * - Story cards with status badges and task counts
 * - Story sorting by status priority
 * - Navigation to story detail
 * - 404/error state handling
 * - Loading state
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regex patterns for import verification
const IMPORT_USE_DASHBOARD = /import\s+.*useDashboard.*from\s+['"]@\/context\/DashboardContext['"]/;
const IMPORT_USE_PARAMS = /import\s+.*useParams.*from\s+['"]react-router['"]/;
const IMPORT_LINK = /import\s+.*Link.*from\s+['"]react-router['"]/;
const IMPORT_USE_EFFECT = /import\s+.*useEffect.*from\s+['"]react['"]/;
const IMPORT_CARD = /import\s+.*Card.*from\s+['"]@\/components\/ui\/card['"]/;
const IMPORT_BADGE = /import\s+.*Badge.*from\s+['"]@\/components\/ui\/badge['"]/;
const IMPORT_PROGRESS = /import\s+.*Progress.*from\s+['"]@\/components\/ui\/progress['"]/;

// Regex patterns for component usage
const USE_PARAMS_SLUG = /useParams.*slug/;
const FETCH_API_EPICS = /fetch\s*\(\s*[`'"]\/api\/epics\/.*slug/;
const USE_EFFECT_CALL = /useEffect\s*\(/;
const SET_CURRENT_EPIC = /setCurrentEpic/;
const EPIC_TITLE = /epic\.?title|currentEpic\.?title/i;
const PROGRESS_COMPONENT = /<Progress/;
const COMPLETION_CALC = /completed.*total|storyCounts/;
const STORY_CARD = /StoryCard|stories\.map|\.stories\)\.map/;
const STORY_TITLE = /story\.title/;
const STORY_STATUS = /story\.status|StatusBadge/;
const TASK_PROGRESS = /tasks|task.*completed|completedTasks/;
const STORY_SORTING = /sort|blocked.*in_progress|statusPriority|sortedStories/;
const LINK_TO_STORY = /Link.*to=.*story|\/epic\/.*\/story\//;
const ERROR_NOT_FOUND = /notFound|error|404|not found|Epic not found/i;
const LOADING_STATE = /loading|skeleton|isLoading|isFetching/i;
const LOADING_CONDITIONAL = /loading.*\?|isFetching.*\?|Skeleton/;
const EXPORT_EPIC_DETAIL_NAMED = /export\s+(function|const)\s+EpicDetail/;
const EXPORT_EPIC_DETAIL_DEFAULT = /export\s+default\s+EpicDetail/;

const clientRoot = join(__dirname, 'src');
const pagesDir = join(clientRoot, 'pages');
const epicDetailPath = join(pagesDir, 'EpicDetail.tsx');

describe('Epic Detail view', () => {
  describe('component structure', () => {
    it('should import useDashboard hook', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(IMPORT_USE_DASHBOARD);
    });

    it('should import useParams and Link from react-router', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(IMPORT_USE_PARAMS);
      expect(content).toMatch(IMPORT_LINK);
    });

    it('should import useEffect from react', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(IMPORT_USE_EFFECT);
    });

    it('should import Card components from shadcn/ui', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(IMPORT_CARD);
    });

    it('should import Badge component from shadcn/ui', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(IMPORT_BADGE);
    });

    it('should import Progress component from shadcn/ui', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(IMPORT_PROGRESS);
    });

    it('should use useParams to get slug parameter', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(USE_PARAMS_SLUG);
    });
  });

  describe('data fetching', () => {
    it('should fetch from /api/epics/:slug endpoint', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(FETCH_API_EPICS);
    });

    it('should use useEffect for fetching on mount', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(USE_EFFECT_CALL);
    });

    it('should call setCurrentEpic with fetched data', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(SET_CURRENT_EPIC);
    });
  });

  describe('epic header', () => {
    it('should display epic title', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Should reference epic title in JSX
      expect(content).toMatch(EPIC_TITLE);
    });

    it('should display overall progress bar', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(PROGRESS_COMPONENT);
    });

    it('should calculate completion percentage', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Should have completion percentage calculation
      expect(content).toMatch(COMPLETION_CALC);
    });
  });

  describe('story cards', () => {
    it('should have StoryCard component or inline card rendering', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Either a StoryCard component or Card with story mapping
      expect(content).toMatch(STORY_CARD);
    });

    it('should display story title', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(STORY_TITLE);
    });

    it('should display status badge for each story', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(STORY_STATUS);
    });

    it('should display task progress count', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Should show something like "2/5 tasks" or task counts
      expect(content).toMatch(TASK_PROGRESS);
    });
  });

  describe('story sorting', () => {
    it('should sort stories by status priority', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Should have sorting logic with status priority
      expect(content).toMatch(STORY_SORTING);
    });
  });

  describe('navigation', () => {
    it('should link to story detail page', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Should have Link to /epic/:epicSlug/story/:storySlug
      expect(content).toMatch(LINK_TO_STORY);
    });
  });

  describe('error handling', () => {
    it('should handle 404/not found state', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Should have error or not found state
      expect(content).toMatch(ERROR_NOT_FOUND);
    });
  });

  describe('loading state', () => {
    it('should have loading/skeleton state', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Should have loading indicator or skeleton
      expect(content).toMatch(LOADING_STATE);
    });

    it('should show skeleton while fetching', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Should conditionally render skeleton or loading state
      expect(content).toMatch(LOADING_CONDITIONAL);
    });
  });

  describe('component exports', () => {
    it('should export EpicDetail as named export', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(EXPORT_EPIC_DETAIL_NAMED);
    });

    it('should export EpicDetail as default export', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(EXPORT_EPIC_DETAIL_DEFAULT);
    });
  });
});
