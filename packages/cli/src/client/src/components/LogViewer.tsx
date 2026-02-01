import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDownToLine, CheckCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getWebSocketSend } from '@/machines/dashboardMachine';

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

/**
 * Status indicator component showing streaming or complete state
 */
function StatusIndicator({ status }: { status: 'running' | 'completed' }) {
  if (status === 'running') {
    return (
      <div
        data-testid="status-indicator-streaming"
        className="flex items-center gap-1.5 text-success text-sm"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" data-testid="status-icon-loader" />
        <span>Streaming</span>
      </div>
    );
  }

  return (
    <div
      data-testid="status-indicator-complete"
      className="flex items-center gap-1.5 text-text-muted text-sm"
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
  const title = autoScroll
    ? 'Auto-scroll enabled (click to disable)'
    : 'Auto-scroll disabled (click to enable)';

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-bg-light">
      <StatusIndicator status={status} />
      <button
        type="button"
        data-testid="auto-scroll-toggle"
        onClick={onToggleAutoScroll}
        aria-pressed={autoScroll}
        className={`p-1.5 rounded-md transition-colors ${
          autoScroll
            ? 'bg-bg-light hover:bg-bg-lighter text-success'
            : 'bg-bg-light hover:bg-bg-lighter text-text-muted'
        }`}
        title={title}
      >
        <ArrowDownToLine
          className="h-4 w-4"
          data-testid={autoScroll ? 'autoscroll-icon-enabled' : 'autoscroll-icon-disabled'}
        />
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
 * Custom hook for managing WebSocket log subscription
 * Subscribes to logs on mount, unsubscribes on unmount or sessionName change
 */
function useLogSubscription(sessionName: string, outputAvailable: boolean) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Handle incoming log data
  const handleLogData = useCallback((data: string, isInitial: boolean) => {
    if (isInitial) {
      setContent(data);
      setIsLoading(false);
    } else {
      setContent((prev) => prev + data);
    }
  }, []);

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

    send({ event: 'subscribe:logs', data: { sessionName } });

    return () => {
      const currentSend = getWebSocketSend();
      if (currentSend) {
        currentSend({ event: 'unsubscribe:logs', data: { sessionName } });
      }
    };
  }, [sessionName, outputAvailable]);

  return { content, isLoading, handleLogData };
}

/**
 * Custom hook for managing auto-scroll behavior
 */
function useAutoScroll(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  status: 'running' | 'completed',
  lineCount: number,
) {
  const [autoScroll, setAutoScroll] = useState(status === 'running');
  const prevLineCountRef = useRef<number>(0);

  useEffect(() => {
    if (autoScroll && lineCount > prevLineCountRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    prevLineCountRef.current = lineCount;
  }, [lineCount, autoScroll, scrollContainerRef]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  }, [autoScroll, scrollContainerRef]);

  const toggleAutoScroll = useCallback(() => {
    setAutoScroll((prev) => {
      if (!prev && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
      return !prev;
    });
  }, [scrollContainerRef]);

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
export function LogViewer({
  sessionName,
  status,
  outputAvailable,
  initialContent = '',
}: LogViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { content: wsContent, isLoading } = useLogSubscription(sessionName, outputAvailable);
  const displayContent = initialContent || wsContent;
  const lines = useLines(displayContent);
  const { autoScroll, handleScroll, toggleAutoScroll } = useAutoScroll(
    scrollContainerRef,
    status,
    lines.length,
  );

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_LINE_HEIGHT,
    overscan: VIRTUALIZER_OVERSCAN,
  });

  if (!outputAvailable) {
    return <LogViewerUnavailable />;
  }

  const showLoading = isLoading && !initialContent;
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div data-testid="log-viewer" className="flex flex-col h-full bg-bg-dark rounded-md">
      <LogViewerHeader
        status={status}
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
