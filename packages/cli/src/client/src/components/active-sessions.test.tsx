import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardProvider } from '@/context/dashboard-context';
import type { SessionInfo } from '@/types/dashboard';
import { ActiveSessions, ActiveSessionsSkeleton } from './active-sessions.tsx';

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

// Regex patterns for output preview matching
const BUILDING_COMPONENTS_PATTERN = /Building components/;
const IMPLEMENTING_LOGIN_PATTERN = /Implementing login/;

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ActiveSessions', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  describe('loading state', () => {
    it('shows skeleton while fetching sessions', () => {
      // Never resolve the fetch to keep loading state
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            // Intentionally never resolves to test loading state
          }),
      );

      renderWithProviders(<ActiveSessions />);

      expect(screen.getByTestId('active-sessions-skeleton')).toBeInTheDocument();
    });
  });

  describe('empty state (hidden)', () => {
    it('renders nothing when no running sessions exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(screen.queryByTestId('active-sessions-skeleton')).not.toBeInTheDocument();
      });

      // Entire section should be hidden
      expect(screen.queryByTestId('active-sessions')).not.toBeInTheDocument();
    });

    it('renders nothing when API returns only completed sessions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            name: 'saga__epic1__story1__12345',
            epicSlug: 'epic1',
            storySlug: 'story1',
            status: 'completed',
            outputFile: '/tmp/output.txt',
            outputAvailable: true,
            startTime: '2026-01-30T01:00:00Z',
            endTime: '2026-01-30T01:30:00Z',
          },
        ],
      });

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(screen.queryByTestId('active-sessions-skeleton')).not.toBeInTheDocument();
      });

      expect(screen.queryByTestId('active-sessions')).not.toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    const runningSessions: SessionInfo[] = [
      {
        name: 'saga__dashboard__api-routes__12345',
        epicSlug: 'dashboard',
        storySlug: 'api-routes',
        status: 'running',
        outputFile: '/tmp/saga/output1.txt',
        outputAvailable: true,
        startTime: '2026-01-30T01:00:00Z',
        outputPreview: 'Building components...\nRunning tests...\nAll tests passed.',
      },
      {
        name: 'saga__auth__login-flow__67890',
        epicSlug: 'auth',
        storySlug: 'login-flow',
        status: 'running',
        outputFile: '/tmp/saga/output2.txt',
        outputAvailable: true,
        startTime: '2026-01-30T00:30:00Z',
        outputPreview: 'Implementing login...',
      },
    ];

    it('renders section with "Active Sessions" heading', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runningSessions,
      });

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(screen.getByText('Active Sessions')).toBeInTheDocument();
      });

      expect(screen.getByTestId('active-sessions')).toBeInTheDocument();
    });

    it('renders session cards for each running session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runningSessions,
      });

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(screen.getByText('api-routes')).toBeInTheDocument();
        expect(screen.getByText('login-flow')).toBeInTheDocument();
      });

      // Verify epic names are shown
      expect(screen.getByText('dashboard')).toBeInTheDocument();
      expect(screen.getByText('auth')).toBeInTheDocument();
    });

    it('renders output preview for sessions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => runningSessions,
      });

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(screen.getByText(BUILDING_COMPONENTS_PATTERN)).toBeInTheDocument();
        expect(screen.getByText(IMPLEMENTING_LOGIN_PATTERN)).toBeInTheDocument();
      });
    });

    it('filters out completed sessions and only shows running ones', async () => {
      const mixedSessions: SessionInfo[] = [
        {
          name: 'saga__epic1__running-story__111',
          epicSlug: 'epic1',
          storySlug: 'running-story',
          status: 'running',
          outputFile: '/tmp/output.txt',
          outputAvailable: true,
          startTime: '2026-01-30T01:00:00Z',
          outputPreview: 'Running...',
        },
        {
          name: 'saga__epic1__completed-story__222',
          epicSlug: 'epic1',
          storySlug: 'completed-story',
          status: 'completed',
          outputFile: '/tmp/output2.txt',
          outputAvailable: true,
          startTime: '2026-01-30T00:00:00Z',
          endTime: '2026-01-30T00:30:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mixedSessions,
      });

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(screen.getByText('running-story')).toBeInTheDocument();
      });

      expect(screen.queryByText('completed-story')).not.toBeInTheDocument();
    });
  });

  describe('session card navigation', () => {
    it('renders cards as links to story detail with sessions tab', async () => {
      const sessions: SessionInfo[] = [
        {
          name: 'saga__my-epic__my-story__12345',
          epicSlug: 'my-epic',
          storySlug: 'my-story',
          status: 'running',
          outputFile: '/tmp/output.txt',
          outputAvailable: true,
          startTime: '2026-01-30T01:00:00Z',
          outputPreview: 'Working...',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sessions,
      });

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(screen.getByText('my-story')).toBeInTheDocument();
      });

      // Check that the card is wrapped in a link with correct href
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/epic/my-epic/story/my-story?tab=sessions');
    });
  });

  describe('API error handling', () => {
    it('hides section when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(screen.queryByTestId('active-sessions-skeleton')).not.toBeInTheDocument();
      });

      expect(screen.queryByTestId('active-sessions')).not.toBeInTheDocument();
    });

    it('hides section when fetch throws error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(screen.queryByTestId('active-sessions-skeleton')).not.toBeInTheDocument();
      });

      expect(screen.queryByTestId('active-sessions')).not.toBeInTheDocument();
    });
  });

  describe('API call', () => {
    it('fetches sessions from /api/sessions?status=running on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderWithProviders(<ActiveSessions />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/sessions?status=running');
      });
    });
  });
});

describe('ActiveSessionsSkeleton', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders skeleton with heading', () => {
    render(<ActiveSessionsSkeleton />);

    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.getByTestId('active-sessions-skeleton')).toBeInTheDocument();
  });

  it('renders placeholder skeleton cards', () => {
    render(<ActiveSessionsSkeleton />);

    const skeletonCards = screen.getAllByTestId('session-card-skeleton');
    expect(skeletonCards.length).toBeGreaterThanOrEqual(2);
  });
});
