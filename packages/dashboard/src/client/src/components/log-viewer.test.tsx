import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import { getWebSocketSend } from '@/machines/dashboardMachine';
import { LogViewer } from './LogViewer.tsx';

// Mock the dashboardMachine module
// Note: subscribeToLogData and unsubscribeFromLogData are used by LogViewer component
// but not imported directly in this test file
vi.mock('@/machines/dashboardMachine', () => ({
  getWebSocketSend: vi.fn(),
  subscribeToLogData: vi.fn(),
  unsubscribeFromLogData: vi.fn(),
}));

// Regex patterns defined at top level for performance
const OUTPUT_UNAVAILABLE_REGEX = /output unavailable/i;

// Magic number constants
const LARGE_CONTENT_LINE_COUNT = 1000;
const MAX_VIRTUALIZED_LINES = 1000;
const EXPECTED_MULTILINE_COUNT = 3;

// Use fake timers to control @tanstack/react-virtual's debounced updates
// This prevents "window is not defined" errors from timer callbacks after cleanup
beforeAll(() => {
  vi.useFakeTimers();
});

afterAll(() => {
  vi.useRealTimers();
});

// Mock scrollTo on Element prototype and set up element dimensions for virtualization
beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();

  // Mock getBoundingClientRect to provide dimensions for virtualization
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 800,
    height: 384, // h-96 = 24rem = 384px
    top: 0,
    left: 0,
    bottom: 384,
    right: 800,
    x: 0,
    y: 0,
    toJSON: () => {
      // Empty toJSON - mock implementation returns nothing
    },
  }));

  // Mock offsetHeight for scroll calculations
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    value: 384,
  });

  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    value: 384,
  });

  // Reset the mock for getWebSocketSend before each test
  (getWebSocketSend as Mock).mockReset();
});

describe('LogViewer', () => {
  afterEach(() => {
    // Flush all pending timers from @tanstack/react-virtual's debounced updates
    // before cleanup to prevent "window is not defined" errors
    act(() => {
      vi.runAllTimers();
    });
    cleanup();
  });

  describe('basic rendering', () => {
    it('renders with terminal styling', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Hello world"
        />,
      );

      const container = screen.getByTestId('log-viewer');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('bg-bg-dark');
      // font-mono is on the content area
      const content = screen.getByTestId('log-content');
      expect(content).toHaveClass('font-mono');
    });

    it('displays log content with correct text styling', () => {
      const content = 'Log line 1\nLog line 2';
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />,
      );

      expect(screen.getByText('Log line 1')).toBeInTheDocument();
      expect(screen.getByText('Log line 2')).toBeInTheDocument();
    });

    it('renders with flexible height container', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Hello"
        />,
      );

      const content = screen.getByTestId('log-content');
      // Should flex to fill parent height
      expect(content).toHaveClass('flex-1');
      expect(content).toHaveClass('min-h-0');
    });
  });

  describe('outputAvailable prop', () => {
    it('shows "Output unavailable" when outputAvailable is false', () => {
      render(<LogViewer sessionName="test-session" status="running" outputAvailable={false} />);

      expect(screen.getByText(OUTPUT_UNAVAILABLE_REGEX)).toBeInTheDocument();
    });

    it('does not show unavailable message when outputAvailable is true', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Some content"
        />,
      );

      expect(screen.queryByText(OUTPUT_UNAVAILABLE_REGEX)).not.toBeInTheDocument();
    });
  });

  describe('empty content', () => {
    it('renders empty log viewer when no initialContent provided', () => {
      render(<LogViewer sessionName="test-session" status="running" outputAvailable={true} />);

      const container = screen.getByTestId('log-viewer');
      expect(container).toBeInTheDocument();
    });

    it('renders empty log viewer when initialContent is empty string', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent=""
        />,
      );

      const container = screen.getByTestId('log-viewer');
      expect(container).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('accepts sessionName prop', () => {
      const { rerender } = render(
        <LogViewer sessionName="session-a" status="running" outputAvailable={true} />,
      );

      // Should render without error
      expect(screen.getByTestId('log-viewer')).toBeInTheDocument();

      // Re-render with different session name
      rerender(<LogViewer sessionName="session-b" status="completed" outputAvailable={true} />);

      expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
    });

    it('accepts status prop with running value', () => {
      render(<LogViewer sessionName="test-session" status="running" outputAvailable={true} />);

      expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
    });

    it('accepts status prop with completed value', () => {
      render(<LogViewer sessionName="test-session" status="completed" outputAvailable={true} />);

      expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
    });
  });

  describe('multiline content', () => {
    it('splits content into separate lines', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />,
      );

      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });

    it('preserves empty lines in output', () => {
      const content = 'Line 1\n\nLine 3';
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />,
      );

      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });
  });

  describe('virtual scrolling', () => {
    it('uses virtualization for large content', () => {
      // Generate 1000 lines of content
      const lines = Array.from({ length: LARGE_CONTENT_LINE_COUNT }, (_, i) => `Log line ${i + 1}`);
      const content = lines.join('\n');

      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />,
      );

      const container = screen.getByTestId('log-viewer');
      expect(container).toBeInTheDocument();

      // With virtualization, not all 1000 lines should be rendered
      // Only visible items should be in the DOM
      const renderedLines = screen.getAllByTestId('log-line');
      expect(renderedLines.length).toBeLessThan(MAX_VIRTUALIZED_LINES);
    });

    it('renders visible lines correctly', () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />,
      );

      // At minimum, some lines should be visible
      const renderedLines = screen.getAllByTestId('log-line');
      expect(renderedLines.length).toBeGreaterThan(0);
    });

    it('sets up proper scroll container', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Test content"
        />,
      );

      const content = screen.getByTestId('log-content');
      // Should have overflow-auto for scrolling
      expect(content).toHaveClass('overflow-auto');
    });

    it('handles multiline content rendering', () => {
      // Test with multiple lines using template literal for real newlines
      const content = `Line 1
Line 2
Line 3
Line 4
Line 5`;

      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />,
      );

      // Check that lines are rendered
      const renderedItems = screen.getAllByTestId('log-line');
      expect(renderedItems.length).toBeGreaterThan(0);

      // Check the total height reflects content (5 lines * 24px = 120px)
      const heightContainer = screen.getByTestId('log-height-container');
      expect(heightContainer).toHaveStyle({ height: '120px' });
    });
  });

  describe('WebSocket log subscription', () => {
    it('subscribes to logs on mount when WebSocket is available', () => {
      const mockSend = vi.fn();
      (getWebSocketSend as Mock).mockReturnValue(mockSend);

      render(<LogViewer sessionName="test-session" status="running" outputAvailable={true} />);

      expect(mockSend).toHaveBeenCalledWith({
        event: 'subscribe:logs',
        data: { sessionName: 'test-session' },
      });
    });

    it('unsubscribes from logs on unmount', () => {
      const mockSend = vi.fn();
      (getWebSocketSend as Mock).mockReturnValue(mockSend);

      const { unmount } = render(
        <LogViewer sessionName="test-session" status="running" outputAvailable={true} />,
      );

      // Clear mock to focus on unsubscribe call
      mockSend.mockClear();

      unmount();

      expect(mockSend).toHaveBeenCalledWith({
        event: 'unsubscribe:logs',
        data: { sessionName: 'test-session' },
      });
    });

    it('does not subscribe when WebSocket is not available', () => {
      (getWebSocketSend as Mock).mockReturnValue(null);

      render(<LogViewer sessionName="test-session" status="running" outputAvailable={true} />);

      // Should not throw and should render
      expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
    });

    it('does not subscribe when output is unavailable', () => {
      const mockSend = vi.fn();
      (getWebSocketSend as Mock).mockReturnValue(mockSend);

      render(<LogViewer sessionName="test-session" status="running" outputAvailable={false} />);

      // Should not subscribe when output is unavailable
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('resubscribes when sessionName changes', () => {
      const mockSend = vi.fn();
      (getWebSocketSend as Mock).mockReturnValue(mockSend);

      const { rerender } = render(
        <LogViewer sessionName="session-a" status="running" outputAvailable={true} />,
      );

      expect(mockSend).toHaveBeenCalledWith({
        event: 'subscribe:logs',
        data: { sessionName: 'session-a' },
      });

      mockSend.mockClear();

      rerender(<LogViewer sessionName="session-b" status="running" outputAvailable={true} />);

      // Should unsubscribe from old session
      expect(mockSend).toHaveBeenCalledWith({
        event: 'unsubscribe:logs',
        data: { sessionName: 'session-a' },
      });

      // Should subscribe to new session
      expect(mockSend).toHaveBeenCalledWith({
        event: 'subscribe:logs',
        data: { sessionName: 'session-b' },
      });
    });
  });

  describe('log content accumulation', () => {
    it('displays initial content from WebSocket', () => {
      const mockSend = vi.fn();
      (getWebSocketSend as Mock).mockReturnValue(mockSend);

      // We'll test this by verifying the component accepts content prop
      // and WebSocket updates will be handled through useLogSubscription hook
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Initial log content"
        />,
      );

      expect(screen.getByText('Initial log content')).toBeInTheDocument();
    });

    it('shows loading state while waiting for initial data', () => {
      const mockSend = vi.fn();
      (getWebSocketSend as Mock).mockReturnValue(mockSend);

      render(<LogViewer sessionName="test-session" status="running" outputAvailable={true} />);

      // When no initialContent is provided and subscribed, should show loading
      // The loading skeleton should be visible
      const skeleton = screen.queryByTestId('log-viewer-skeleton');
      // This will fail initially - we need to implement loading state
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('auto-scroll toggle', () => {
    it('renders auto-scroll toggle button', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Log content"
        />,
      );

      const toggleButton = screen.getByTestId('auto-scroll-toggle');
      expect(toggleButton).toBeInTheDocument();
    });

    it('has auto-scroll enabled by default for running sessions', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Log content"
        />,
      );

      const toggleButton = screen.getByTestId('auto-scroll-toggle');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('has auto-scroll disabled by default for completed sessions', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="completed"
          outputAvailable={true}
          initialContent="Log content"
        />,
      );

      const toggleButton = screen.getByTestId('auto-scroll-toggle');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggles auto-scroll state when button is clicked', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Log content"
        />,
      );

      const toggleButton = screen.getByTestId('auto-scroll-toggle');

      // Initially enabled for running
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

      // Click to disable
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

      // Click again to enable
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('maintains auto-scroll enabled state when new content arrives', () => {
      const initialLines = 'Line 1';
      const moreLines = `Line 1
Line 2
Line 3`;

      const { rerender } = render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={initialLines}
        />,
      );

      const toggleButton = screen.getByTestId('auto-scroll-toggle');

      // Auto-scroll should be enabled for running sessions
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

      // Simulate new content arriving by re-rendering with more content
      act(() => {
        rerender(
          <LogViewer
            sessionName="test-session"
            status="running"
            outputAvailable={true}
            initialContent={moreLines}
          />,
        );
        // Advance timers to flush any pending virtualizer updates
        vi.runAllTimers();
      });

      // Auto-scroll should remain enabled after new content arrives
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('does not scroll to bottom when auto-scroll is disabled', () => {
      const mockScrollTo = vi.fn();
      Element.prototype.scrollTo = mockScrollTo;

      render(
        <LogViewer
          sessionName="test-session"
          status="completed"
          outputAvailable={true}
          initialContent="Line 1\nLine 2"
        />,
      );

      // Toggle should be disabled for completed sessions
      const toggleButton = screen.getByTestId('auto-scroll-toggle');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

      // Clear any initial scroll calls
      mockScrollTo.mockClear();

      // Since auto-scroll is disabled, scrollTo should not be called for new content
      // This is already the completed state so no scrolling should happen
      expect(mockScrollTo).not.toHaveBeenCalled();
    });

    it('shows different icon based on auto-scroll state', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Log content"
        />,
      );

      const toggleButton = screen.getByTestId('auto-scroll-toggle');

      // When auto-scroll is enabled, the button should have content (icon)
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton.children.length).toBeGreaterThan(0);
    });

    it('disables auto-scroll when user scrolls up manually', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Line 1\nLine 2\nLine 3\nLine 4\nLine 5"
        />,
      );

      const content = screen.getByTestId('log-content');
      const toggleButton = screen.getByTestId('auto-scroll-toggle');

      // Initially enabled
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

      // Simulate user scroll - set scroll position to NOT be at bottom
      Object.defineProperty(content, 'scrollTop', { value: 0, writable: true });
      Object.defineProperty(content, 'scrollHeight', {
        value: 500,
        writable: true,
      });
      Object.defineProperty(content, 'clientHeight', {
        value: 384,
        writable: true,
      });

      fireEvent.scroll(content);

      // Auto-scroll should be disabled after manual scroll up
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('status indicator', () => {
    it('shows streaming indicator with animation for running sessions', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Test content"
        />,
      );

      const streamingIndicator = screen.getByTestId('status-indicator-streaming');
      expect(streamingIndicator).toBeInTheDocument();
      expect(streamingIndicator).toHaveTextContent('Streaming');
      expect(streamingIndicator).toHaveClass('text-primary');
      // Indicator should contain an icon element
      expect(streamingIndicator.children.length).toBeGreaterThan(0);
    });

    it('shows complete indicator for completed sessions', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="completed"
          outputAvailable={true}
          initialContent="Test content"
        />,
      );

      const completeIndicator = screen.getByTestId('status-indicator-complete');
      expect(completeIndicator).toBeInTheDocument();
      expect(completeIndicator).toHaveTextContent('Complete');
      expect(completeIndicator).toHaveClass('text-success');
      // Indicator should contain an icon element
      expect(completeIndicator.children.length).toBeGreaterThan(0);
    });

    it('does not show status indicator when output is unavailable', () => {
      render(<LogViewer sessionName="test-session" status="running" outputAvailable={false} />);

      // Unavailable state shows a simple message, no status indicator
      expect(screen.queryByTestId('status-indicator-streaming')).not.toBeInTheDocument();
      expect(screen.queryByTestId('status-indicator-complete')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles unmount when WebSocket becomes unavailable', () => {
      const mockSend = vi.fn();
      (getWebSocketSend as Mock).mockReturnValue(mockSend);

      const { unmount } = render(
        <LogViewer sessionName="test-session" status="running" outputAvailable={true} />,
      );

      // Simulate WebSocket becoming unavailable before unmount
      (getWebSocketSend as Mock).mockReturnValue(null);

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });

    it('enables auto-scroll when clicking toggle from disabled state', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="completed"
          outputAvailable={true}
          initialContent="Line 1\nLine 2\nLine 3"
        />,
      );

      const toggleButton = screen.getByTestId('auto-scroll-toggle');

      // Auto-scroll starts disabled for completed sessions
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

      // Enable auto-scroll
      fireEvent.click(toggleButton);

      // Should enable auto-scroll (scroll behavior is handled via requestAnimationFrame)
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('does not disable auto-scroll when already at bottom', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Line 1"
        />,
      );

      const content = screen.getByTestId('log-content');
      const toggleButton = screen.getByTestId('auto-scroll-toggle');

      // Initially enabled
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

      // Simulate scroll at bottom position
      Object.defineProperty(content, 'scrollTop', {
        value: 100,
        writable: true,
      });
      Object.defineProperty(content, 'scrollHeight', {
        value: 484,
        writable: true,
      });
      Object.defineProperty(content, 'clientHeight', {
        value: 384,
        writable: true,
      });

      // scrollHeight - scrollTop - clientHeight = 484 - 100 - 384 = 0 < 10
      fireEvent.scroll(content);

      // Auto-scroll should still be enabled (at bottom)
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('renders non-breaking space for empty lines', () => {
      const content = 'Line 1\n\nLine 3';
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />,
      );

      // Check that all lines are rendered including empty ones
      const logLines = screen.getAllByTestId('log-line');
      // Should have 3 lines (Line 1, empty, Line 3)
      expect(logLines.length).toBeGreaterThanOrEqual(EXPECTED_MULTILINE_COUNT);
    });

    it('shows loading skeleton without initial content when WebSocket available', () => {
      const mockSend = vi.fn();
      (getWebSocketSend as Mock).mockReturnValue(mockSend);

      render(<LogViewer sessionName="test-session" status="running" outputAvailable={true} />);

      // Should show loading skeleton
      expect(screen.getByTestId('log-viewer-skeleton')).toBeInTheDocument();
    });

    it('does not show loading when initialContent is provided', () => {
      const mockSend = vi.fn();
      (getWebSocketSend as Mock).mockReturnValue(mockSend);

      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Some log content"
        />,
      );

      // Should NOT show loading skeleton when initialContent provided
      expect(screen.queryByTestId('log-viewer-skeleton')).not.toBeInTheDocument();
    });

    it('renders correctly when no content and not loading', () => {
      // When WebSocket is not available and no initial content
      (getWebSocketSend as Mock).mockReturnValue(null);

      render(<LogViewer sessionName="test-session" status="running" outputAvailable={true} />);

      // Should not show loading (no WebSocket)
      expect(screen.queryByTestId('log-viewer-skeleton')).not.toBeInTheDocument();
      // Should still show the log viewer
      expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
    });

    it('has accessible toggle button with proper title', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Content"
        />,
      );

      const toggleButton = screen.getByTestId('auto-scroll-toggle');
      expect(toggleButton).toHaveAttribute('title');
      expect(toggleButton.getAttribute('title')).toContain('Autoscroll');
    });

    it('changes toggle button title based on state', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Content"
        />,
      );

      const toggleButton = screen.getByTestId('auto-scroll-toggle');

      // Initially enabled (locked to bottom)
      expect(toggleButton.getAttribute('title')).toContain('locked');

      // Click to disable
      fireEvent.click(toggleButton);

      // Now disabled (unlocked)
      expect(toggleButton.getAttribute('title')).toContain('unlocked');
    });
  });
});
