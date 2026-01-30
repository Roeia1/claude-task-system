import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { LogViewer } from './LogViewer';

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
    toJSON: () => {},
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
});

describe('LogViewer', () => {
  afterEach(() => {
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
        />
      );

      const container = screen.getByTestId('log-viewer');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('font-mono');
      expect(container).toHaveClass('bg-bg-dark');
    });

    it('displays log content with correct text styling', () => {
      const content = 'Log line 1\nLog line 2';
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />
      );

      expect(screen.getByText('Log line 1')).toBeInTheDocument();
      expect(screen.getByText('Log line 2')).toBeInTheDocument();
    });

    it('renders with fixed height container', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Hello"
        />
      );

      const container = screen.getByTestId('log-viewer');
      // Should have a defined height for scrolling
      expect(container).toHaveClass('h-96');
    });
  });

  describe('outputAvailable prop', () => {
    it('shows "Output unavailable" when outputAvailable is false', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={false}
        />
      );

      expect(screen.getByText(/output unavailable/i)).toBeInTheDocument();
    });

    it('does not show unavailable message when outputAvailable is true', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Some content"
        />
      );

      expect(screen.queryByText(/output unavailable/i)).not.toBeInTheDocument();
    });
  });

  describe('empty content', () => {
    it('renders empty log viewer when no initialContent provided', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
        />
      );

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
        />
      );

      const container = screen.getByTestId('log-viewer');
      expect(container).toBeInTheDocument();
    });
  });

  describe('props interface', () => {
    it('accepts sessionName prop', () => {
      const { rerender } = render(
        <LogViewer
          sessionName="session-a"
          status="running"
          outputAvailable={true}
        />
      );

      // Should render without error
      expect(screen.getByTestId('log-viewer')).toBeInTheDocument();

      // Re-render with different session name
      rerender(
        <LogViewer
          sessionName="session-b"
          status="completed"
          outputAvailable={true}
        />
      );

      expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
    });

    it('accepts status prop with running value', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
        />
      );

      expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
    });

    it('accepts status prop with completed value', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="completed"
          outputAvailable={true}
        />
      );

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
        />
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
        />
      );

      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });
  });

  describe('virtual scrolling', () => {
    it('uses virtualization for large content', () => {
      // Generate 1000 lines of content
      const lines = Array.from({ length: 1000 }, (_, i) => `Log line ${i + 1}`);
      const content = lines.join('\n');

      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />
      );

      const container = screen.getByTestId('log-viewer');
      expect(container).toBeInTheDocument();

      // With virtualization, not all 1000 lines should be rendered
      // Only visible items should be in the DOM
      const renderedLines = container.querySelectorAll('[data-testid="log-line"]');
      expect(renderedLines.length).toBeLessThan(1000);
    });

    it('renders visible lines correctly', () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent={content}
        />
      );

      // At minimum, some lines should be visible
      const container = screen.getByTestId('log-viewer');
      const renderedLines = container.querySelectorAll('[data-testid="log-line"]');
      expect(renderedLines.length).toBeGreaterThan(0);
    });

    it('sets up proper scroll container', () => {
      render(
        <LogViewer
          sessionName="test-session"
          status="running"
          outputAvailable={true}
          initialContent="Test content"
        />
      );

      const container = screen.getByTestId('log-viewer');
      // Should have overflow-auto for scrolling
      expect(container).toHaveClass('overflow-auto');
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
        />
      );

      const container = screen.getByTestId('log-viewer');

      // Check that lines are rendered
      const renderedItems = container.querySelectorAll('[data-testid="log-line"]');
      expect(renderedItems.length).toBeGreaterThan(0);

      // Check the total height reflects content (5 lines * 24px = 120px)
      const heightContainer = container.querySelector('[class*="relative"]');
      expect(heightContainer).toHaveStyle({ height: '120px' });
    });
  });
});
