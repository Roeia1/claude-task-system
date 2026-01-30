import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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
 * LogViewer component displays streaming logs in a terminal-style interface.
 * Uses monospace font and SAGA theme colors for a familiar terminal experience.
 * Implements virtual scrolling for performance with large log files.
 */
export function LogViewer({
  sessionName: _sessionName,
  status: _status,
  outputAvailable,
  initialContent = '',
}: LogViewerProps) {
  // Ref for the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Split content into lines for virtualization - memoize to avoid recalculating
  const lines = useMemo(() => {
    if (!initialContent) return [];
    return initialContent.split('\n');
  }, [initialContent]);

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

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      data-testid="log-viewer"
      ref={scrollContainerRef}
      className="h-96 bg-bg-dark rounded-md font-mono overflow-auto"
    >
      {/* Container with total height for proper scroll area */}
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
    </div>
  );
}

export default LogViewer;
