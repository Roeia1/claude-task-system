import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, CheckCircle, Loader2, Lock, Unlock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getWebSocketSend,
  subscribeToLogData,
  unsubscribeFromLogData,
} from '@/machines/dashboardMachine';

interface LogViewerProps {
  /** The name of the session to display logs for */
  sessionName: string;
  /** The status of the session: running or completed */
  status: 'running' | 'completed';
  /** Whether the output file is available */
  outputAvailable: boolean;
  /** Initial log content to display */
  initialContent?: string;
}

// Estimated height in pixels for a single log line with monospace font
const ESTIMATED_LINE_HEIGHT = 24;

/** Number of items to render above/below visible area */
const VIRTUALIZER_OVERSCAN = 5;

/** Threshold in pixels for detecting if user is at bottom of scroll container */
const SCROLL_BOTTOM_THRESHOLD = 50;

/**
 * Status indicator component showing streaming or complete state
 */
function StatusIndicator({ status }: { status: 'running' | 'completed' }) {
  if (status === 'running') {
    return (
      <div
        data-testid="status-indicator-streaming"
        className="flex items-center gap-1.5 text-primary text-sm"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" data-testid="status-icon-loader" />
        <span>Streaming</span>
      </div>
    );
  }

  return (
    <div
      data-testid="status-indicator-complete"
      className="flex items-center gap-1.5 text-success text-sm"
    >
      <CheckCircle className="h-3.5 w-3.5" data-testid="status-icon-complete" />
      <span>Complete</span>
    </div>
  );
}

/**
 * Loading skeleton shown while waiting for log data
 */
function LogViewerSkeleton() {
  return (
    <div data-testid="log-viewer-skeleton" className="p-4 space-y-2">
      <div className="h-4 bg-bg-light rounded animate-pulse w-3/4" />
      <div className="h-4 bg-bg-light rounded animate-pulse w-1/2" />
      <div className="h-4 bg-bg-light rounded animate-pulse w-5/6" />
      <div className="h-4 bg-bg-light rounded animate-pulse w-2/3" />
    </div>
  );
}

/**
 * Header component with status indicator and auto-scroll toggle
 */
function LogViewerHeader({
  status,
  autoScroll,
  onToggleAutoScroll,
}: {
  status: 'running' | 'completed';
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-bg-light">
      <StatusIndicator status={status} />
      <button
        type="button"
        data-testid="auto-scroll-toggle"
        onClick={onToggleAutoScroll}
        aria-pressed={autoScroll}
        title={autoScroll ? 'Autoscroll locked to bottom' : 'Autoscroll unlocked'}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors ${
          autoScroll
            ? 'bg-success/20 text-success hover:bg-success/30'
            : 'bg-bg-light text-text-muted hover:bg-bg-lighter'
        }`}
      >
        {autoScroll ? (
          <Lock className="h-3.5 w-3.5" data-testid="autoscroll-icon-enabled" />
        ) : (
          <Unlock className="h-3.5 w-3.5" data-testid="autoscroll-icon-disabled" />
        )}
        <span>Autoscroll</span>
      </button>
    </div>
  );
}

/**
 * Virtualized log content displaying log lines efficiently
 */
function VirtualizedLogContent({
  virtualizer,
  virtualItems,
  lines,
}: {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  virtualItems: VirtualItem[];
  lines: string[];
}) {
  return (
    <div
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
      data-testid="log-height-container"
    >
      <div
        className="absolute top-0 left-0 w-full px-4"
        style={{ transform: `translateY(${virtualItems[0]?.start ?? 0}px)` }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-testid="log-line"
            data-index={virtualItem.index}
            className="text-text leading-relaxed"
            style={{ height: `${ESTIMATED_LINE_HEIGHT}px` }}
          >
            {lines[virtualItem.index] || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state when output is not available
 */
function LogViewerUnavailable() {
  return (
    <div
      data-testid="log-viewer"
      className="h-full bg-bg-dark rounded-md font-mono flex items-center justify-center"
    >
      <span className="text-text-muted">Output unavailable</span>
    </div>
  );
}

/**
 * Error state when log subscription fails
 */
function LogViewerError({ error }: { error: string }) {
  return (
    <div
      data-testid="log-viewer-error"
      className="h-full bg-bg-dark rounded-md font-mono flex flex-col items-center justify-center gap-2"
    >
      <AlertCircle className="h-6 w-6 text-danger" />
      <span className="text-danger text-sm">Failed to load logs</span>
      <span className="text-text-muted text-xs max-w-xs text-center">{error}</span>
    </div>
  );
}

/**
 * Custom hook for managing WebSocket log subscription
 * Subscribes to logs on mount, unsubscribes on unmount or sessionName change
 */
function useLogSubscription(sessionName: string, outputAvailable: boolean) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [streamComplete, setStreamComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!outputAvailable) {
      setIsLoading(false);
      return;
    }

    const send = getWebSocketSend();
    if (!send) {
      setIsLoading(false);
      return;
    }

    // Register callback to receive log data for this session
    subscribeToLogData(
      sessionName,
      (data: string, isInitial: boolean, isComplete: boolean) => {
        if (isInitial) {
          setContent(data);
          setIsLoading(false);
        } else {
          setContent((prev) => prev + data);
        }
        // Mark stream as complete when server signals session finished
        if (isComplete) {
          setStreamComplete(true);
        }
      },
      (errorMessage: string) => {
        setError(errorMessage);
        setIsLoading(false);
      },
    );

    // Send subscription request to server
    send({ event: 'subscribe:logs', data: { sessionName } });

    return () => {
      // Unregister callback
      unsubscribeFromLogData(sessionName);

      // Send unsubscription request to server
      const currentSend = getWebSocketSend();
      if (currentSend) {
        currentSend({ event: 'unsubscribe:logs', data: { sessionName } });
      }
    };
  }, [sessionName, outputAvailable]);

  return { content, isLoading, streamComplete, error };
}

/**
 * Custom hook for managing auto-scroll behavior
 * Uses requestAnimationFrame to ensure DOM has updated before scrolling
 */
function useAutoScroll(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  virtualizerRef: React.MutableRefObject<Virtualizer<HTMLDivElement, Element> | null>,
  status: 'running' | 'completed',
  lineCount: number,
) {
  const [autoScroll, setAutoScroll] = useState(status === 'running');
  const prevLineCountRef = useRef<number>(0);

  useEffect(() => {
    if (autoScroll && lineCount > prevLineCountRef.current) {
      // Use requestAnimationFrame to ensure virtualizer has updated the DOM
      requestAnimationFrame(() => {
        if (virtualizerRef.current && scrollContainerRef.current) {
          // Get the total size from virtualizer and scroll to it
          const totalSize = virtualizerRef.current.getTotalSize();
          scrollContainerRef.current.scrollTop = totalSize;
        }
      });
    }
    prevLineCountRef.current = lineCount;
  }, [lineCount, autoScroll, virtualizerRef, scrollContainerRef]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    // Check if user has scrolled away from the bottom
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      SCROLL_BOTTOM_THRESHOLD;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  }, [autoScroll, scrollContainerRef]);

  const toggleAutoScroll = useCallback(() => {
    setAutoScroll((prev) => {
      if (!prev) {
        // Scroll to bottom when re-enabling auto-scroll
        requestAnimationFrame(() => {
          if (virtualizerRef.current && scrollContainerRef.current) {
            const totalSize = virtualizerRef.current.getTotalSize();
            scrollContainerRef.current.scrollTop = totalSize;
          }
        });
      }
      return !prev;
    });
  }, [virtualizerRef, scrollContainerRef]);

  return { autoScroll, handleScroll, toggleAutoScroll };
}

/** Parse content into lines for virtualization */
function useLines(displayContent: string) {
  return useMemo(() => {
    if (!displayContent) {
      return [];
    }
    return displayContent.split('\n');
  }, [displayContent]);
}

/**
 * LogViewer component displays streaming logs in a terminal-style interface.
 * Uses monospace font and SAGA theme colors for a familiar terminal experience.
 * Implements virtual scrolling for performance with large log files.
 */
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: component has clear structure with hooks and conditional rendering
export function LogViewer({
  sessionName,
  status,
  outputAvailable,
  initialContent = '',
}: LogViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);
  const {
    content: wsContent,
    isLoading,
    streamComplete,
    error,
  } = useLogSubscription(sessionName, outputAvailable);
  const displayContent = initialContent || wsContent;
  const lines = useLines(displayContent);

  // Use server's completion signal to override status prop (more authoritative)
  const effectiveStatus = streamComplete ? 'completed' : status;

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_LINE_HEIGHT,
    overscan: VIRTUALIZER_OVERSCAN,
  });

  // Keep virtualizerRef updated for use in auto-scroll hook
  virtualizerRef.current = virtualizer;

  const { autoScroll, handleScroll, toggleAutoScroll } = useAutoScroll(
    scrollContainerRef,
    virtualizerRef,
    effectiveStatus,
    lines.length,
  );

  if (!outputAvailable) {
    return <LogViewerUnavailable />;
  }

  if (error) {
    return <LogViewerError error={error} />;
  }

  const showLoading = isLoading && !initialContent;
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div data-testid="log-viewer" className="flex flex-col h-full bg-bg-dark rounded-md">
      <LogViewerHeader
        status={effectiveStatus}
        autoScroll={autoScroll}
        onToggleAutoScroll={toggleAutoScroll}
      />
      <div
        data-testid="log-content"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 font-mono overflow-auto"
      >
        {showLoading ? (
          <LogViewerSkeleton />
        ) : (
          <VirtualizedLogContent
            virtualizer={virtualizer}
            virtualItems={virtualItems}
            lines={lines}
          />
        )}
      </div>
    </div>
  );
}
