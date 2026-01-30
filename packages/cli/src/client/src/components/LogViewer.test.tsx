import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { LogViewer } from './LogViewer';

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
});
