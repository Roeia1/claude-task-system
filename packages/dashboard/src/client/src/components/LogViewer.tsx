import type { VirtualItem, Virtualizer } from '@tanstack/react-virtual';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, CheckCircle, Loader2, Lock, Unlock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getWebSocketSend,
  subscribeToLogData,
  unsubscribeFromLogData,
} from '@/machines/dashboardMachine';
import type { AssistantMessage, SagaWorkerMessage, WorkerMessage } from '@/types/dashboard';

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

/** Format a saga_worker message for display */
function formatWorkerMessage(msg: SagaWorkerMessage): string {
  switch (msg.subtype) {
    case 'pipeline_start':
      return `[Pipeline] Starting execution for story: ${msg.storyId}`;
    case 'pipeline_step':
      return `[Pipeline] Step ${msg.step}: ${msg.message}`;
    case 'pipeline_end': {
      const status = msg.status === 'completed' ? 'Completed' : 'Incomplete';
      return `[Pipeline] ${status} - ${msg.cycles} cycles, ${msg.elapsedMinutes}min (exit: ${msg.exitCode})`;
    }
    case 'cycle_start':
      return `[Cycle ${msg.cycle}/${msg.maxCycles}] Starting`;
    case 'cycle_end':
      return `[Cycle ${msg.cycle}] Ended${msg.exitCode != null ? ` (exit: ${msg.exitCode})` : ''}`;
    default:
      return JSON.stringify(msg);
  }
}

/** Format an assistant SDK message for display */
function formatAssistantMessage(msg: AssistantMessage): string | null {
  const content =
    typeof msg.message === 'object' && msg.message !== null ? msg.message.content : msg.content;
  return typeof content === 'string' ? content : null;
}

/**
 * Format a WorkerMessage for display
 */
function formatMessage(msg: WorkerMessage): string {
  if (msg.type === 'text') {
    return (msg.content as string) || '';
  }

  if (msg.type === 'saga_worker') {
    return formatWorkerMessage(msg);
  }

  if (msg.type === 'assistant') {
    return formatAssistantMessage(msg) ?? JSON.stringify(msg);
  }

  if (msg.type === 'result' && typeof msg.result === 'string') {
    return `[Result] ${msg.result}`;
  }

  return JSON.stringify(msg);
}

/**
 * Get CSS class for a message based on its type
 */
function getMessageClass(msg: WorkerMessage): string {
  if (msg.type === 'saga_worker') {
    if (msg.subtype === 'pipeline_end') {
      return msg.status === 'completed' ? 'text-success' : 'text-danger';
    }
    return 'text-primary';
  }
  return 'text-text';
}

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
 * Virtualized log content displaying structured JSONL messages efficiently
 */
function VirtualizedLogContent({
  virtualizer,
  virtualItems,
  messages,
}: {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  virtualItems: VirtualItem[];
  messages: WorkerMessage[];
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
        {virtualItems.map((virtualItem) => {
          const msg = messages[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-testid="log-line"
              data-index={virtualItem.index}
              className={`leading-relaxed ${msg ? getMessageClass(msg) : 'text-text'}`}
              style={{ height: `${ESTIMATED_LINE_HEIGHT}px` }}
            >
              {msg ? formatMessage(msg) : '\u00A0'}
            </div>
          );
        })}
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
      data-testid="log-viewer"
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
 * Subscribes to logs on mount, unsubscribes on unmount or sessionName change.
 * Accumulates WorkerMessage[] arrays from the server.
 */
function useLogSubscription(sessionName: string, outputAvailable: boolean) {
  const [messages, setMessages] = useState<WorkerMessage[]>([]);
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

    subscribeToLogData(
      sessionName,
      (newMessages: WorkerMessage[], isInitial: boolean, isComplete: boolean) => {
        if (isInitial) {
          setMessages(newMessages);
          setIsLoading(false);
        } else {
          setMessages((prev) => [...prev, ...newMessages]);
        }
        if (isComplete) {
          setStreamComplete(true);
        }
      },
      (errorMessage: string) => {
        setError(errorMessage);
        setIsLoading(false);
      },
    );

    send({ event: 'subscribe:logs', data: { sessionName } });

    return () => {
      unsubscribeFromLogData(sessionName);

      const currentSend = getWebSocketSend();
      if (currentSend) {
        currentSend({ event: 'unsubscribe:logs', data: { sessionName } });
      }
    };
  }, [sessionName, outputAvailable]);

  return { messages, isLoading, streamComplete, error };
}

/**
 * Custom hook for managing auto-scroll behavior
 */
function useAutoScroll(
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  virtualizerRef: React.MutableRefObject<Virtualizer<HTMLDivElement, Element> | null>,
  status: 'running' | 'completed',
  messageCount: number,
) {
  const [autoScroll, setAutoScroll] = useState(status === 'running');
  const prevMessageCountRef = useRef<number>(0);

  useEffect(() => {
    if (autoScroll && messageCount > prevMessageCountRef.current) {
      requestAnimationFrame(() => {
        if (virtualizerRef.current && scrollContainerRef.current) {
          const totalSize = virtualizerRef.current.getTotalSize();
          scrollContainerRef.current.scrollTop = totalSize;
        }
      });
    }
    prevMessageCountRef.current = messageCount;
  }, [messageCount, autoScroll, virtualizerRef, scrollContainerRef]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

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

/**
 * Parse initial content string into WorkerMessage array.
 * Supports both JSONL content (each line is valid JSON) and plain text (each line becomes a text message).
 */
function parseInitialContent(initialContent: string): WorkerMessage[] {
  if (!initialContent) {
    return [];
  }
  const lines = initialContent.split('\n');
  const messages: WorkerMessage[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Preserve empty lines as empty text messages for display
      messages.push({ type: 'text', content: '' });
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      // Only treat as JSON if it parsed to an object with a type field
      if (typeof parsed === 'object' && parsed !== null && parsed.type) {
        messages.push(parsed);
      } else {
        messages.push({ type: 'text', content: trimmed });
      }
    } catch {
      // Not valid JSON - treat as raw text line
      messages.push({ type: 'text', content: trimmed });
    }
  }
  return messages;
}

/**
 * Custom hook that sets up log viewer state: subscription, virtualizer, and auto-scroll
 */
function useLogViewerState(
  sessionName: string,
  status: 'running' | 'completed',
  outputAvailable: boolean,
  initialContent: string,
) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);
  const {
    messages: wsMessages,
    isLoading,
    streamComplete,
    error,
  } = useLogSubscription(sessionName, outputAvailable);

  const initialMessages = useMemo(() => parseInitialContent(initialContent), [initialContent]);
  const displayMessages = initialMessages.length > 0 ? initialMessages : wsMessages;

  const effectiveStatus = streamComplete ? 'completed' : status;

  const virtualizer = useVirtualizer({
    count: displayMessages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_LINE_HEIGHT,
    overscan: VIRTUALIZER_OVERSCAN,
  });

  virtualizerRef.current = virtualizer;

  const { autoScroll, handleScroll, toggleAutoScroll } = useAutoScroll(
    scrollContainerRef,
    virtualizerRef,
    effectiveStatus,
    displayMessages.length,
  );

  return {
    scrollContainerRef,
    isLoading,
    error,
    effectiveStatus,
    virtualizer,
    autoScroll,
    handleScroll,
    toggleAutoScroll,
    messages: displayMessages,
  };
}

/**
 * LogViewer component displays streaming logs in a terminal-style interface.
 * Uses monospace font and SAGA theme colors for a familiar terminal experience.
 * Renders structured JSONL messages with different styling for worker events vs SDK messages.
 * Implements virtual scrolling for performance with large log files.
 */
export function LogViewer({
  sessionName,
  status,
  outputAvailable,
  initialContent = '',
}: LogViewerProps) {
  const {
    scrollContainerRef,
    isLoading,
    error,
    effectiveStatus,
    virtualizer,
    autoScroll,
    handleScroll,
    toggleAutoScroll,
    messages,
  } = useLogViewerState(sessionName, status, outputAvailable, initialContent);

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
            messages={messages}
          />
        )}
      </div>
    </div>
  );
}
