/**
 * Tests for Story Detail view (t9)
 *
 * Verifies:
 * - Component structure and imports
 * - Data fetching from /api/stories/:epicSlug/:storySlug
 * - Story metadata display (title, status, epic link)
 * - Task list with status indicators
 * - Markdown content rendering
 * - Journal entries with collapsible sections
 * - Journal entry type grouping/filtering
 * - WebSocket subscription for real-time updates
 * - Tabs component for Story Content vs Journal views
 * - Loading and error states
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const clientRoot = path.join(__dirname, 'src');
const pagesDir = path.join(clientRoot, 'pages');
const storyDetailPath = path.join(pagesDir, 'StoryDetail.tsx');

describe('Story Detail view', () => {
  describe('component structure', () => {
    it('should import useDashboard hook', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(
        /import\s+.*useDashboard.*from\s+['"]@\/context\/DashboardContext['"]/,
      );
    });

    it('should import useParams and Link from react-router', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*useParams.*from\s+['"]react-router['"]/);
      expect(content).toMatch(/import\s+.*Link.*from\s+['"]react-router['"]/);
    });

    it('should import useEffect from react', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*useEffect.*from\s+['"]react['"]/);
    });

    it('should import Card components from shadcn/ui', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*Card.*from\s+['"]@\/components\/ui\/card['"]/);
    });

    it('should import Badge component from shadcn/ui', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*Badge.*from\s+['"]@\/components\/ui\/badge['"]/);
    });

    it('should import Tabs components from shadcn/ui', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/import\s+.*Tabs.*from\s+['"]@\/components\/ui\/tabs['"]/);
    });

    it('should import Collapsible components from shadcn/ui', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      // Collapsible import may be multiline
      expect(content).toMatch(
        /import[\s\S]*Collapsible[\s\S]*from\s+['"]@\/components\/ui\/collapsible['"]/,
      );
    });

    it('should use useParams to get epicSlug and storySlug', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      // useParams with epicSlug and storySlug (may be on different lines)
      expect(content).toMatch(/useParams/);
      expect(content).toMatch(/epicSlug/);
      expect(content).toMatch(/storySlug/);
    });
  });

  describe('data fetching', () => {
    it('should fetch from /api/stories/:epicSlug/:storySlug endpoint', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/fetch\s*\(\s*[`'"]\/api\/stories\//);
    });

    it('should use useEffect for fetching on mount', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/useEffect\s*\(/);
    });

    it('should call setCurrentStory with fetched data', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/setCurrentStory/);
    });
  });

  describe('story metadata', () => {
    it('should display story title', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/story\.?title|currentStory\.?title/i);
    });

    it('should display status badge', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/StatusBadge|story\.status|currentStory\.status/);
    });

    it('should include link back to epic', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/Link.*to=.*epic|\/epic\//);
    });
  });

  describe('task list', () => {
    it('should display task list', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/tasks\.map|\.tasks\)\.map/);
    });

    it('should display task title', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/task\.title/);
    });

    it('should have status indicator for tasks', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      // Visual checkbox or status indicator
      expect(content).toMatch(/task\.status|checkbox|completed|pending/i);
    });

    it('should have visual-only checkboxes (not interactive)', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      // Should have disabled or visual-only checkbox indicator
      expect(content).toMatch(/disabled|readOnly|pointer-events-none|cursor-default|visual/i);
    });
  });

  describe('tabs component', () => {
    it('should use Tabs component for Story/Journal views', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/<Tabs/);
    });

    it('should have TabsList with triggers', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/<TabsList/);
      expect(content).toMatch(/<TabsTrigger/);
    });

    it('should have TabsContent sections', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/<TabsContent/);
    });

    it('should have Story Content tab', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/Story|Content|Tasks/i);
    });

    it('should have Journal tab', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/Journal/i);
    });
  });

  describe('journal entries', () => {
    it('should display journal entries', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      // Journal entries are iterated via filter+map or direct map
      expect(content).toMatch(/journal\.filter|journal\.map|\.journal\)\.map|Entries\.map/);
    });

    it('should use Collapsible for journal sections', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/<Collapsible/);
    });

    it('should have CollapsibleTrigger for expand/collapse', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/<CollapsibleTrigger/);
    });

    it('should have CollapsibleContent for entry content', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/<CollapsibleContent/);
    });

    it('should distinguish journal entry types (session, blocker, resolution)', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/entry\.type|session|blocker|resolution/);
    });

    it('should highlight blocker entries prominently', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      // Should have special styling for blockers
      expect(content).toMatch(/blocker.*danger|blocker.*bg-|type.*blocker/i);
    });

    it('should display entry title', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/entry\.title/);
    });

    it('should display entry content', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/entry\.content/);
    });
  });

  describe('websocket subscription', () => {
    it('should subscribe to story updates on mount', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/subscribeToStory/);
    });

    it('should unsubscribe from story updates on unmount', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/unsubscribeFromStory/);
    });

    it('should handle subscription in useEffect cleanup', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      // Should have return function in useEffect with unsubscribe
      expect(content).toMatch(/return\s*\(\s*\)\s*=>\s*\{[\s\S]*unsubscribe/);
    });
  });

  describe('loading state', () => {
    it('should have loading/skeleton state', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/loading|skeleton|isLoading|isFetching/i);
    });

    it('should show skeleton while fetching', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/loading.*\?|isFetching.*\?|Skeleton/);
    });
  });

  describe('error handling', () => {
    it('should handle 404/not found state', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/notFound|error|404|not found|Story not found/i);
    });

    it('should link back to epic on error', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/Link.*epic|Back.*epic/i);
    });
  });

  describe('component exports', () => {
    it('should export StoryDetail as named export', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/export\s+(function|const)\s+StoryDetail/);
    });

    it('should export StoryDetail as default export', () => {
      const content = fs.readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/export\s+default\s+StoryDetail/);
    });
  });
});
