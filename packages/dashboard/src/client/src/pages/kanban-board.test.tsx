import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardProvider, useDashboardActorRef } from '@/context/dashboard-context';
import type { SessionInfo, StoryDetail } from '@/types/dashboard';
import { KanbanBoard } from './KanbanBoard.tsx';

// Expected story counts per column
const EXPECTED_PENDING_COUNT = 1;
const EXPECTED_IN_PROGRESS_COUNT = 1;
const EXPECTED_COMPLETED_COUNT = 1;

// Regex patterns
const PENDING_COLUMN_PATTERN = /Pending/;
const IN_PROGRESS_COLUMN_PATTERN = /In Progress/;
const COMPLETED_COLUMN_PATTERN = /Completed/;

/**
 * Helper to render components with all required providers
 */
function renderWithProviders(ui: React.ReactNode) {
  return render(
    <DashboardProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </DashboardProvider>,
  );
}

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

const pendingStory: StoryDetail = {
  id: 'story-pending',
  title: 'Pending Story',
  description: '## Setup\n\nThis story sets up the project.',
  status: 'pending',
  tasks: [
    {
      id: 't1',
      subject: 'Write tests',
      description: 'Write unit tests',
      status: 'pending',
      blockedBy: [],
    },
    {
      id: 't2',
      subject: 'Setup config',
      description: 'Setup project config',
      status: 'completed',
      blockedBy: [],
    },
  ],
};

const inProgressStory: StoryDetail = {
  id: 'story-in-progress',
  title: 'In Progress Story',
  description: '## Implementation\n\nThis story implements the feature.',
  status: 'inProgress',
  epic: 'epic-one',
  epicName: 'First Epic',
  tasks: [
    {
      id: 't1',
      subject: 'Implement API',
      description: 'Build the REST API',
      status: 'completed',
      blockedBy: [],
    },
    {
      id: 't2',
      subject: 'Implement UI',
      description: 'Build the frontend',
      status: 'inProgress',
      blockedBy: [],
    },
    {
      id: 't3',
      subject: 'Write docs',
      description: 'Write documentation',
      status: 'pending',
      blockedBy: ['t2'],
    },
  ],
};

const completedStory: StoryDetail = {
  id: 'story-completed',
  title: 'Completed Story',
  description: '## Done\n\nThis story is completed.',
  status: 'completed',
  epic: 'epic-two',
  epicName: 'Second Epic',
  tasks: [
    {
      id: 't1',
      subject: 'All done',
      description: 'Everything is done',
      status: 'completed',
      blockedBy: [],
    },
  ],
};

const allStories: StoryDetail[] = [pendingStory, inProgressStory, completedStory];

const runningSession: SessionInfo = {
  name: 'saga__epic-one__story-in-progress__12345',
  storyId: 'story-in-progress',
  status: 'running',
  outputFile: '/tmp/saga/output.txt',
  outputAvailable: true,
  startTime: '2026-02-27T01:00:00Z',
  outputPreview: 'Building components...',
};

describe('KanbanBoard', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  // ==========================================================================
  // COLUMN RENDERING
  // ==========================================================================
  describe('column rendering', () => {
    it('renders 3 columns: Pending, In Progress, Completed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('column-pending')).toBeInTheDocument();
        expect(screen.getByTestId('column-inProgress')).toBeInTheDocument();
        expect(screen.getByTestId('column-completed')).toBeInTheDocument();
      });
    });

    it('displays column headers with status names', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        // Use heading role to specifically target column headers
        const pendingCol = screen.getByTestId('column-pending');
        expect(pendingCol.querySelector('h2')).toHaveTextContent(PENDING_COLUMN_PATTERN);

        const inProgressCol = screen.getByTestId('column-inProgress');
        expect(inProgressCol.querySelector('h2')).toHaveTextContent(IN_PROGRESS_COLUMN_PATTERN);

        const completedCol = screen.getByTestId('column-completed');
        expect(completedCol.querySelector('h2')).toHaveTextContent(COMPLETED_COLUMN_PATTERN);
      });
    });

    it('shows story count in column headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        const pendingCol = screen.getByTestId('column-pending');
        expect(pendingCol).toHaveTextContent(String(EXPECTED_PENDING_COUNT));

        const inProgressCol = screen.getByTestId('column-inProgress');
        expect(inProgressCol).toHaveTextContent(String(EXPECTED_IN_PROGRESS_COUNT));

        const completedCol = screen.getByTestId('column-completed');
        expect(completedCol).toHaveTextContent(String(EXPECTED_COMPLETED_COUNT));
      });
    });

    it('places stories in the correct column based on status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        const pendingCol = screen.getByTestId('column-pending');
        expect(pendingCol).toHaveTextContent('Pending Story');

        const inProgressCol = screen.getByTestId('column-inProgress');
        expect(inProgressCol).toHaveTextContent('In Progress Story');

        const completedCol = screen.getByTestId('column-completed');
        expect(completedCol).toHaveTextContent('Completed Story');
      });
    });

    it('shows empty state for columns with no stories', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [pendingStory],
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        const pendingCol = screen.getByTestId('column-pending');
        expect(pendingCol).toHaveTextContent('Pending Story');
      });

      const inProgressCol = screen.getByTestId('column-inProgress');
      expect(inProgressCol).toHaveTextContent('No stories');

      const completedCol = screen.getByTestId('column-completed');
      expect(completedCol).toHaveTextContent('No stories');
    });
  });

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================
  describe('loading state', () => {
    it('shows skeleton placeholders while stories are loading', () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally never resolves to test loading state
          }),
      );

      renderWithProviders(<KanbanBoard />);

      expect(screen.getByTestId('kanban-loading')).toBeInTheDocument();
    });

    it('hides skeleton placeholders after data loads', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.queryByTestId('kanban-loading')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // STORY CARD - COLLAPSED STATE
  // ==========================================================================
  describe('story card collapsed state', () => {
    it('shows story title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('Pending Story')).toBeInTheDocument();
        expect(screen.getByText('In Progress Story')).toBeInTheDocument();
        expect(screen.getByText('Completed Story')).toBeInTheDocument();
      });
    });

    it('shows epic tag badge when story has an epic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('First Epic')).toBeInTheDocument();
        expect(screen.getByText('Second Epic')).toBeInTheDocument();
      });
    });

    it('does not show epic tag when story has no epic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [pendingStory],
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('Pending Story')).toBeInTheDocument();
      });

      // pendingStory has no epic, so no badge should be rendered
      const card = screen.getByTestId('story-card-story-pending');
      expect(card.querySelector('[data-testid="epic-badge"]')).not.toBeInTheDocument();
    });

    it('shows compact progress bar with task count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        // In Progress Story: 1/3 completed
        const inProgressCard = screen.getByTestId('story-card-story-in-progress');
        expect(inProgressCard).toHaveTextContent('1/3');
      });
    });

    it('shows pulsing dot when session is running for the story', async () => {
      // Mock fetch for stories and sessions
      mockFetch.mockImplementation((url: RequestInfo | URL) => {
        const urlString = url.toString();
        if (urlString.includes('/api/sessions')) {
          return Promise.resolve({
            ok: true,
            json: async () => [runningSession],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => allStories,
        });
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        const card = screen.getByTestId('story-card-story-in-progress');
        expect(card.querySelector('[data-testid="running-indicator"]')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // STORY CARD - EXPANDED STATE
  // ==========================================================================
  describe('story card expanded state', () => {
    it('expands card when chevron is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('In Progress Story')).toBeInTheDocument();
      });

      // Click the expand trigger for the in-progress story
      const trigger = screen.getByTestId('story-card-trigger-story-in-progress');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('story-card-content-story-in-progress')).toBeInTheDocument();
      });
    });

    it('shows task list with status icons when expanded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('In Progress Story')).toBeInTheDocument();
      });

      const trigger = screen.getByTestId('story-card-trigger-story-in-progress');
      fireEvent.click(trigger);

      await waitFor(() => {
        const content = screen.getByTestId('story-card-content-story-in-progress');
        // Check task subjects are shown
        expect(content).toHaveTextContent('Implement API');
        expect(content).toHaveTextContent('Implement UI');
        expect(content).toHaveTextContent('Write docs');
      });
    });

    it('shows blocked-by info for blocked tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('In Progress Story')).toBeInTheDocument();
      });

      const trigger = screen.getByTestId('story-card-trigger-story-in-progress');
      fireEvent.click(trigger);

      await waitFor(() => {
        const content = screen.getByTestId('story-card-content-story-in-progress');
        // t3 is blocked by t2
        expect(content).toHaveTextContent('blocked by t2');
      });
    });

    it('shows "Open story" link pointing to /story/:id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('In Progress Story')).toBeInTheDocument();
      });

      const trigger = screen.getByTestId('story-card-trigger-story-in-progress');
      fireEvent.click(trigger);

      await waitFor(() => {
        const content = screen.getByTestId('story-card-content-story-in-progress');
        const link = content.querySelector('a[href="/story/story-in-progress"]');
        expect(link).toBeInTheDocument();
      });
    });

    it('shows progress bar with done/total count when expanded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('In Progress Story')).toBeInTheDocument();
      });

      const trigger = screen.getByTestId('story-card-trigger-story-in-progress');
      fireEvent.click(trigger);

      await waitFor(() => {
        const content = screen.getByTestId('story-card-content-story-in-progress');
        // 1 of 3 tasks completed
        expect(content).toHaveTextContent('1/3');
      });
    });
  });

  // ==========================================================================
  // API CALL
  // ==========================================================================
  describe('API call', () => {
    it('fetches all stories from /api/stories?all=true on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/stories?all=true');
      });
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('error handling', () => {
    it('shows error state when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('kanban-error')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // REAL-TIME UPDATES (via dashboard context)
  // ==========================================================================
  describe('real-time updates', () => {
    it('updates board when story data changes in context', async () => {
      // Initial load with one pending story
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [pendingStory],
      });

      // Capture actor ref via test helper component
      let actorRef: ReturnType<typeof useDashboardActorRef>;
      function TestController() {
        actorRef = useDashboardActorRef();
        return null;
      }

      render(
        <DashboardProvider>
          <MemoryRouter>
            <TestController />
            <KanbanBoard />
          </MemoryRouter>
        </DashboardProvider>,
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Pending Story')).toBeInTheDocument();
      });

      // Simulate context update (as if from WebSocket stories:updated)
      const updatedStories: StoryDetail[] = [
        {
          ...pendingStory,
          status: 'completed',
          tasks: [
            { ...pendingStory.tasks[0], status: 'completed' },
            { ...pendingStory.tasks[1], status: 'completed' },
          ],
        },
        inProgressStory,
      ];

      act(() => {
        actorRef?.send({ type: 'ALL_STORIES_LOADED', stories: updatedStories });
      });

      // Board should update: pendingStory moved to Completed column
      await waitFor(() => {
        const completedCol = screen.getByTestId('column-completed');
        expect(completedCol).toHaveTextContent('Pending Story');

        const inProgressCol = screen.getByTestId('column-inProgress');
        expect(inProgressCol).toHaveTextContent('In Progress Story');
      });
    });

    it('updates session indicators when session data changes in context', async () => {
      // Initial load with stories but no running sessions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allStories,
      });

      let actorRef: ReturnType<typeof useDashboardActorRef>;
      function TestController() {
        actorRef = useDashboardActorRef();
        return null;
      }

      render(
        <DashboardProvider>
          <MemoryRouter>
            <TestController />
            <KanbanBoard />
          </MemoryRouter>
        </DashboardProvider>,
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('In Progress Story')).toBeInTheDocument();
      });

      // Initially no running indicators
      const card = screen.getByTestId('story-card-story-in-progress');
      expect(card.querySelector('[data-testid="running-indicator"]')).not.toBeInTheDocument();

      // Simulate session data update (as if from WebSocket sessions:updated)
      act(() => {
        actorRef?.send({
          type: 'SESSIONS_LOADED',
          sessions: [runningSession],
        });
      });

      // Running indicator should appear
      await waitFor(() => {
        const updatedCard = screen.getByTestId('story-card-story-in-progress');
        expect(updatedCard.querySelector('[data-testid="running-indicator"]')).toBeInTheDocument();
      });
    });
  });
});
