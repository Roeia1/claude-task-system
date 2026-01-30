import { render, screen, cleanup, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SessionCard, formatDuration } from './SessionCard';
import type { SessionInfo } from '@/types/dashboard';

describe('SessionCard', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const createSession = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
    name: 'saga__my-epic__my-story__12345',
    epicSlug: 'my-epic',
    storySlug: 'my-story',
    status: 'running',
    outputFile: '/tmp/saga/output.txt',
    outputAvailable: true,
    startTime: '2026-01-30T01:00:00Z',
    outputPreview: 'Building components...\nRunning tests...',
    ...overrides,
  });

  describe('data display', () => {
    it('displays story title', () => {
      const session = createSession({ storySlug: 'api-implementation' });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      expect(screen.getByText('api-implementation')).toBeInTheDocument();
    });

    it('displays epic title', () => {
      const session = createSession({ epicSlug: 'dashboard-epic' });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      expect(screen.getByText('dashboard-epic')).toBeInTheDocument();
    });

    it('displays output preview', () => {
      const session = createSession({
        outputPreview: 'Installing dependencies...\nCompiling TypeScript...',
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      expect(screen.getByText(/Installing dependencies/)).toBeInTheDocument();
      expect(screen.getByText(/Compiling TypeScript/)).toBeInTheDocument();
    });

    it('displays output preview in monospace font with dark background', () => {
      const session = createSession({
        outputPreview: 'Test output',
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      const preElement = screen.getByText('Test output').closest('pre');
      expect(preElement).toHaveClass('font-mono');
      expect(preElement).toHaveClass('bg-bg-dark');
    });
  });

  describe('duration formatting', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('displays duration in seconds format for recent sessions', () => {
      // Session started 30 seconds ago
      const now = new Date('2026-01-30T01:00:30Z');
      vi.setSystemTime(now);

      const session = createSession({
        startTime: '2026-01-30T01:00:00Z',
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      expect(screen.getByText('30s')).toBeInTheDocument();
    });

    it('displays duration in minutes and seconds format', () => {
      // Session started 2 minutes 34 seconds ago
      const now = new Date('2026-01-30T01:02:34Z');
      vi.setSystemTime(now);

      const session = createSession({
        startTime: '2026-01-30T01:00:00Z',
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      expect(screen.getByText('2m 34s')).toBeInTheDocument();
    });

    it('displays duration in hours and minutes format', () => {
      // Session started 1 hour 15 minutes ago
      const now = new Date('2026-01-30T02:15:00Z');
      vi.setSystemTime(now);

      const session = createSession({
        startTime: '2026-01-30T01:00:00Z',
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      expect(screen.getByText('1h 15m')).toBeInTheDocument();
    });

    it('updates duration every second', () => {
      const now = new Date('2026-01-30T01:00:10Z');
      vi.setSystemTime(now);

      const session = createSession({
        startTime: '2026-01-30T01:00:00Z',
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      expect(screen.getByText('10s')).toBeInTheDocument();

      // Advance time by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText('15s')).toBeInTheDocument();
    });
  });

  describe('output preview truncation', () => {
    it('truncates output to last 5 lines', () => {
      const longOutput = [
        'Line 1: First line',
        'Line 2: Second line',
        'Line 3: Third line',
        'Line 4: Fourth line',
        'Line 5: Fifth line',
        'Line 6: Sixth line',
        'Line 7: Seventh line',
      ].join('\n');

      const session = createSession({
        outputPreview: longOutput,
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      // Should show last 5 lines
      expect(screen.getByText(/Line 3: Third line/)).toBeInTheDocument();
      expect(screen.getByText(/Line 7: Seventh line/)).toBeInTheDocument();

      // Should not show first 2 lines
      expect(screen.queryByText(/Line 1: First line/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Line 2: Second line/)).not.toBeInTheDocument();
    });

    it('truncates output to max 500 characters', () => {
      // Create a string longer than 500 characters
      const longLine = 'A'.repeat(600);

      const session = createSession({
        outputPreview: longLine,
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      const preElement = screen.getByRole('presentation');
      expect(preElement.textContent!.length).toBeLessThanOrEqual(500);
    });
  });

  describe('navigation', () => {
    it('renders as a link to story detail with sessions tab', () => {
      const session = createSession({
        epicSlug: 'test-epic',
        storySlug: 'test-story',
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/epic/test-epic/story/test-story?tab=sessions');
    });

    it('has hover styling for interactivity', () => {
      const session = createSession();

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      const card = screen.getByRole('link').querySelector('[class*="hover"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('output unavailable state', () => {
    it('shows "Output unavailable" message when outputAvailable is false', () => {
      const session = createSession({
        outputAvailable: false,
        outputPreview: undefined,
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      expect(screen.getByText('Output unavailable')).toBeInTheDocument();
    });

    it('applies dimmed styling when output is unavailable', () => {
      const session = createSession({
        outputAvailable: false,
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      const unavailableText = screen.getByText('Output unavailable');
      expect(unavailableText).toHaveClass('text-text-muted');
    });
  });

  describe('edge cases', () => {
    it('handles missing outputPreview gracefully', () => {
      const session = createSession({
        outputPreview: undefined,
        outputAvailable: true,
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      // Should render without crashing
      expect(screen.getByText('my-story')).toBeInTheDocument();
    });

    it('handles empty outputPreview gracefully', () => {
      const session = createSession({
        outputPreview: '',
        outputAvailable: true,
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>
      );

      // Should render without crashing
      expect(screen.getByText('my-story')).toBeInTheDocument();
    });
  });
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(59)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(60)).toBe('1m 0s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(154)).toBe('2m 34s');
    expect(formatDuration(3599)).toBe('59m 59s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(4500)).toBe('1h 15m');
    expect(formatDuration(7200)).toBe('2h 0m');
    expect(formatDuration(7325)).toBe('2h 2m');
  });

  it('formats days, hours, and minutes for very long sessions', () => {
    expect(formatDuration(86400)).toBe('1d 0h');
    expect(formatDuration(90000)).toBe('1d 1h');
    expect(formatDuration(172800)).toBe('2d 0h');
  });
});
