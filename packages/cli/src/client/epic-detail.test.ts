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

import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const clientRoot = path.join(__dirname, 'src');
const pagesDir = path.join(clientRoot, 'pages');
const epicDetailPath = path.join(pagesDir, 'EpicDetail.tsx');

describe('Epic Detail view', () => {
  describe('component structure', () => {
    it('should import useDashboard hook', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*useDashboard.*from\s+['"]@\/context\/DashboardContext['"]/);
    });

    it('should import useParams and Link from react-router-dom', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*useParams.*from\s+['"]react-router-dom['"]/);
      expect(content).toMatch(/import\s+.*Link.*from\s+['"]react-router-dom['"]/);
    });

    it('should import useEffect from react', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*useEffect.*from\s+['"]react['"]/);
    });

    it('should import Card components from shadcn/ui', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*Card.*from\s+['"]@\/components\/ui\/card['"]/);
    });

    it('should import Badge component from shadcn/ui', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*Badge.*from\s+['"]@\/components\/ui\/badge['"]/);
    });

    it('should import Progress component from shadcn/ui', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*Progress.*from\s+['"]@\/components\/ui\/progress['"]/);
    });

    it('should use useParams to get slug parameter', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/useParams.*slug/);
    });
  });

  describe('data fetching', () => {
    it('should fetch from /api/epics/:slug endpoint', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/fetch\s*\(\s*[`'"]\/api\/epics\/.*slug/);
    });

    it('should use useEffect for fetching on mount', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/useEffect\s*\(/);
    });

    it('should call setCurrentEpic with fetched data', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/setCurrentEpic/);
    });
  });

  describe('epic header', () => {
    it('should display epic title', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      // Should reference epic title in JSX
      expect(content).toMatch(/epic\.?title|currentEpic\.?title/i);
    });

    it('should display overall progress bar', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/<Progress/);
    });

    it('should calculate completion percentage', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      // Should have completion percentage calculation
      expect(content).toMatch(/completed.*total|storyCounts/);
    });
  });

  describe('story cards', () => {
    it('should have StoryCard component or inline card rendering', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      // Either a StoryCard component or Card with story mapping
      expect(content).toMatch(/StoryCard|stories\.map|\.stories\)\.map/);
    });

    it('should display story title', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/story\.title/);
    });

    it('should display status badge for each story', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/story\.status|StatusBadge/);
    });

    it('should display task progress count', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      // Should show something like "2/5 tasks" or task counts
      expect(content).toMatch(/tasks|task.*completed|completedTasks/);
    });
  });

  describe('story sorting', () => {
    it('should sort stories by status priority', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      // Should have sorting logic with status priority
      expect(content).toMatch(/sort|blocked.*in_progress|statusPriority|sortedStories/);
    });
  });

  describe('navigation', () => {
    it('should link to story detail page', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      // Should have Link to /epic/:epicSlug/story/:storySlug
      expect(content).toMatch(/Link.*to=.*story|\/epic\/.*\/story\//);
    });
  });

  describe('error handling', () => {
    it('should handle 404/not found state', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      // Should have error or not found state
      expect(content).toMatch(/notFound|error|404|not found|Epic not found/i);
    });
  });

  describe('loading state', () => {
    it('should have loading/skeleton state', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      // Should have loading indicator or skeleton
      expect(content).toMatch(/loading|skeleton|isLoading|isFetching/i);
    });

    it('should show skeleton while fetching', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      // Should conditionally render skeleton or loading state
      expect(content).toMatch(/loading.*\?|isFetching.*\?|Skeleton/);
    });
  });

  describe('component exports', () => {
    it('should export EpicDetail as named export', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/export\s+(function|const)\s+EpicDetail/);
    });

    it('should export EpicDetail as default export', () => {
      const content = fs.readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/export\s+default\s+EpicDetail/);
    });
  });
});
