import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getWebSocketSend } from '@/machines/dashboardMachine';

export interface LogViewerProps {
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
    // Don't subscribe if output is not available
    if (!outputAvailable) {
      setIsLoading(false);
      return;
    }

    const send = getWebSocketSend();
    if (!send) {
      setIsLoading(false);
      return;
    }

    // Subscribe to logs
    send({
      event: 'subscribe:logs',
      data: { sessionName },
    });

    // Cleanup: unsubscribe on unmount or sessionName change
    return () => {
      const currentSend = getWebSocketSend();
      if (currentSend) {
        currentSend({
          event: 'unsubscribe:logs',
          data: { sessionName },
        });
      }
    };
  }, [sessionName, outputAvailable]);

  return { content, isLoading, handleLogData };
}

/**
 * LogViewer component displays streaming logs in a terminal-style interface.
 * Uses monospace font and SAGA theme colors for a familiar terminal experience.
 * Implements virtual scrolling for performance with large log files.
 */
export function LogViewer({
  sessionName,
  status: _status,
  outputAvailable,
  initialContent = '',
}: LogViewerProps) {
  // Ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // WebSocket log subscription hook
  const { content: wsContent, isLoading } = useLogSubscription(sessionName, outputAvailable);

  // Use initialContent if provided, otherwise use content from WebSocket
  const displayContent = initialContent || wsContent;

  // Split content into lines for virtualization - memoize to avoid recalculating
  const lines = useMemo(() => {
    if (!displayContent) return [];
    return displayContent.split('\n');
  }, [displayContent]);

  // Set up the virtualizer
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_LINE_HEIGHT,
    overscan: 5, // Number of items to render above/below visible area
  });

  // Handle unavailable output state
  if (!outputAvailable) {
    return (
      <div
        data-testid="log-viewer"
        className="h-96 bg-bg-dark rounded-md font-mono flex items-center justify-center"
      >
        <span className="text-text-muted">Output unavailable</span>
      </div>
    );
  }

  // Show loading state when waiting for initial data (no initialContent and isLoading)
  const showLoading = isLoading && !initialContent;

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      data-testid="log-viewer"
      ref={scrollContainerRef}
      className="h-96 bg-bg-dark rounded-md font-mono overflow-auto"
    >
      {showLoading ? (
        <div data-testid="log-viewer-skeleton" className="p-4 space-y-2">
          <div className="h-4 bg-bg-light rounded animate-pulse w-3/4" />
          <div className="h-4 bg-bg-light rounded animate-pulse w-1/2" />
          <div className="h-4 bg-bg-light rounded animate-pulse w-5/6" />
          <div className="h-4 bg-bg-light rounded animate-pulse w-2/3" />
        </div>
      ) : (
        /* Container with total height for proper scroll area */
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {/* Position items absolutely within the container */}
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
      )}
    </div>
  );
}

export default LogViewer;
