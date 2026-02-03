import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionInfo } from '@/types/dashboard';
import { formatDuration } from '@/utils/formatDuration';
import { SessionCard } from './session-card.tsx';

// Time constants
const MS_FIVE_SECONDS = 5000;

// Length constants
const LONG_LINE_LENGTH = 600;
const MAX_OUTPUT_LENGTH = 500;

// Regex patterns for tests
const INSTALLING_DEPENDENCIES_PATTERN = /Installing dependencies/;
const COMPILING_TYPESCRIPT_PATTERN = /Compiling TypeScript/;
const LINE_1_PATTERN = /Line 1: First line/;
const LINE_2_PATTERN = /Line 2: Second line/;
const LINE_3_PATTERN = /Line 3: Third line/;
const LINE_7_PATTERN = /Line 7: Seventh line/;

// Duration test constants (in seconds)
const DURATION_0S = 0;
const DURATION_30S = 30;
const DURATION_59S = 59;
const DURATION_1M = 60;
const DURATION_1M_30S = 90;
const DURATION_2M_34S = 154;
const DURATION_59M_59S = 3599;
const DURATION_1H = 3600;
const DURATION_1H_15M = 4500;
const DURATION_2H = 7200;
const DURATION_2H_2M = 7325;
const DURATION_1D = 86_400;
const DURATION_1D_1H = 90_000;
const DURATION_2D = 172_800;

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
        </MemoryRouter>,
      );

      expect(screen.getByText('api-implementation')).toBeInTheDocument();
    });

    it('displays epic title', () => {
      const session = createSession({ epicSlug: 'dashboard-epic' });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>,
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
        </MemoryRouter>,
      );

      expect(screen.getByText(INSTALLING_DEPENDENCIES_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(COMPILING_TYPESCRIPT_PATTERN)).toBeInTheDocument();
    });

    it('displays output preview in monospace font with dark background', () => {
      const session = createSession({
        outputPreview: 'Test output',
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>,
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
        </MemoryRouter>,
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
        </MemoryRouter>,
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
        </MemoryRouter>,
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
        </MemoryRouter>,
      );

      expect(screen.getByText('10s')).toBeInTheDocument();

      // Advance time by 5 seconds
      act(() => {
        vi.advanceTimersByTime(MS_FIVE_SECONDS);
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
        </MemoryRouter>,
      );

      // Should show last 5 lines
      expect(screen.getByText(LINE_3_PATTERN)).toBeInTheDocument();
      expect(screen.getByText(LINE_7_PATTERN)).toBeInTheDocument();

      // Should not show first 2 lines
      expect(screen.queryByText(LINE_1_PATTERN)).not.toBeInTheDocument();
      expect(screen.queryByText(LINE_2_PATTERN)).not.toBeInTheDocument();
    });

    it('truncates output to max 500 characters', () => {
      // Create a string longer than 500 characters
      const longLine = 'A'.repeat(LONG_LINE_LENGTH);

      const session = createSession({
        outputPreview: longLine,
      });

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>,
      );

      const preElement = screen.getByRole('presentation');
      expect(preElement.textContent?.length).toBeLessThanOrEqual(MAX_OUTPUT_LENGTH);
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
        </MemoryRouter>,
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/epic/test-epic/story/test-story?tab=sessions');
    });

    it('has hover styling for interactivity', () => {
      const session = createSession();

      render(
        <MemoryRouter>
          <SessionCard session={session} />
        </MemoryRouter>,
      );

      // Check that the card has hover transition styling
      const link = screen.getByRole('link');
      const card = link.firstElementChild;
      expect(card).toHaveClass('transition-colors');
      expect(card).toHaveClass('cursor-pointer');
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
        </MemoryRouter>,
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
        </MemoryRouter>,
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
        </MemoryRouter>,
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
        </MemoryRouter>,
      );

      // Should render without crashing
      expect(screen.getByText('my-story')).toBeInTheDocument();
    });
  });
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(DURATION_0S)).toBe('0s');
    expect(formatDuration(DURATION_30S)).toBe('30s');
    expect(formatDuration(DURATION_59S)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(DURATION_1M)).toBe('1m 0s');
    expect(formatDuration(DURATION_1M_30S)).toBe('1m 30s');
    expect(formatDuration(DURATION_2M_34S)).toBe('2m 34s');
    expect(formatDuration(DURATION_59M_59S)).toBe('59m 59s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(DURATION_1H)).toBe('1h 0m');
    expect(formatDuration(DURATION_1H_15M)).toBe('1h 15m');
    expect(formatDuration(DURATION_2H)).toBe('2h 0m');
    expect(formatDuration(DURATION_2H_2M)).toBe('2h 2m');
  });

  it('formats days, hours, and minutes for very long sessions', () => {
    expect(formatDuration(DURATION_1D)).toBe('1d 0h');
    expect(formatDuration(DURATION_1D_1H)).toBe('1d 1h');
    expect(formatDuration(DURATION_2D)).toBe('2d 0h');
  });
});
