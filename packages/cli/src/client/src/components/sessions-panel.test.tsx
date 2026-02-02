import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardProvider } from '@/context/dashboard-context';
import type { SessionInfo } from '@/types/dashboard';
import { SessionsPanel, SessionsPanelSkeleton } from './SessionsPanel.tsx';

// Regex patterns (defined at top level for performance per biome lint rules)
const NEWER_SESSION_PATTERN = /newer/;
const RETRY_BUTTON_PATTERN = /retry/i;

// API endpoint for sessions
// biome-ignore lint/security/noSecrets: this is a test API endpoint, not a secret
const SESSIONS_API_ENDPOINT = '/api/sessions?epicSlug=my-epic&storySlug=my-story';

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

describe('SessionsPanel', () => {
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

      renderWithProviders(<SessionsPanel epicSlug="test-epic" storySlug="test-story" />);

      expect(screen.getByTestId('sessions-panel-skeleton')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no sessions exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderWithProviders(<SessionsPanel epicSlug="test-epic" storySlug="test-story" />);

      await waitFor(() => {
        expect(screen.queryByTestId('sessions-panel-skeleton')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('sessions-panel-empty')).toBeInTheDocument();
      expect(screen.getByText('No sessions found for this story')).toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    const mockSessions: SessionInfo[] = [
      {
        name: 'saga__test-epic__test-story__12345',
        epicSlug: 'test-epic',
        storySlug: 'test-story',
        status: 'running',
        outputFile: '/tmp/saga/output1.txt',
        outputAvailable: true,
        startTime: '2026-01-30T01:00:00Z',
        outputPreview: 'Running tests...',
      },
      {
        name: 'saga__test-epic__test-story__67890',
        epicSlug: 'test-epic',
        storySlug: 'test-story',
        status: 'completed',
        outputFile: '/tmp/saga/output2.txt',
        outputAvailable: true,
        startTime: '2026-01-30T00:30:00Z',
        endTime: '2026-01-30T01:30:00Z',
        outputPreview: 'All tests passed.',
      },
    ];

    it('renders sessions panel with session cards', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });

      renderWithProviders(<SessionsPanel epicSlug="test-epic" storySlug="test-story" />);

      await waitFor(() => {
        expect(screen.getByTestId('sessions-panel')).toBeInTheDocument();
      });

      // Should have session cards
      const sessionCards = screen.getAllByTestId('session-detail-card');
      expect(sessionCards).toHaveLength(2);
    });

    it('orders sessions by startTime descending (most recent first)', async () => {
      const sessionsOutOfOrder: SessionInfo[] = [
        {
          name: 'saga__test-epic__test-story__older',
          epicSlug: 'test-epic',
          storySlug: 'test-story',
          status: 'completed',
          outputFile: '/tmp/older.txt',
          outputAvailable: true,
          startTime: '2026-01-30T00:00:00Z',
          endTime: '2026-01-30T00:30:00Z',
        },
        {
          name: 'saga__test-epic__test-story__newer',
          epicSlug: 'test-epic',
          storySlug: 'test-story',
          status: 'running',
          outputFile: '/tmp/newer.txt',
          outputAvailable: true,
          startTime: '2026-01-30T02:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sessionsOutOfOrder,
      });

      renderWithProviders(<SessionsPanel epicSlug="test-epic" storySlug="test-story" />);

      await waitFor(() => {
        const sessionCards = screen.getAllByTestId('session-detail-card');
        expect(sessionCards).toHaveLength(2);
      });

      // Check that the newer session appears first (contains "newer" in name)
      const sessionCards = screen.getAllByTestId('session-detail-card');
      expect(sessionCards[0]).toHaveTextContent(NEWER_SESSION_PATTERN);
    });

    it('displays both running and completed sessions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });

      renderWithProviders(<SessionsPanel epicSlug="test-epic" storySlug="test-story" />);

      await waitFor(() => {
        // Should have both running and completed badges
        expect(screen.getByText('Running')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });
  });

  describe('API call', () => {
    it('fetches sessions with epicSlug and storySlug query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      renderWithProviders(<SessionsPanel epicSlug="my-epic" storySlug="my-story" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(SESSIONS_API_ENDPOINT);
      });
    });
  });

  describe('error handling', () => {
    it('shows error state when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderWithProviders(<SessionsPanel epicSlug="test-epic" storySlug="test-story" />);

      await waitFor(() => {
        expect(screen.queryByTestId('sessions-panel-skeleton')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('sessions-panel-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: RETRY_BUTTON_PATTERN })).toBeInTheDocument();
    });

    it('shows error state when fetch throws error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<SessionsPanel epicSlug="test-epic" storySlug="test-story" />);

      await waitFor(() => {
        expect(screen.queryByTestId('sessions-panel-skeleton')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('sessions-panel-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load sessions')).toBeInTheDocument();
    });

    it('retries fetching when retry button is clicked', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderWithProviders(<SessionsPanel epicSlug="test-epic" storySlug="test-story" />);

      await waitFor(() => {
        expect(screen.getByTestId('sessions-panel-error')).toBeInTheDocument();
      });

      // Set up successful response for retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: RETRY_BUTTON_PATTERN });
      retryButton.click();

      // Should show loading, then empty state on success
      await waitFor(() => {
        expect(screen.getByTestId('sessions-panel-empty')).toBeInTheDocument();
      });

      // Should have called fetch twice
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('SessionsPanelSkeleton', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders skeleton with placeholder cards', () => {
    render(<SessionsPanelSkeleton />);

    expect(screen.getByTestId('sessions-panel-skeleton')).toBeInTheDocument();
    const skeletonCards = screen.getAllByTestId('session-card-skeleton');
    expect(skeletonCards.length).toBeGreaterThanOrEqual(2);
  });
});
