/**
 * SessionsPanel - Displays sessions for a specific story in the story detail page.
 * Fetches sessions from the API and displays them with real-time WebSocket updates.
 */
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Play,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDashboard } from '@/context/dashboard-context';
import type { SessionInfo, SessionStatus } from '@/types/dashboard';
import { formatDuration } from '@/utils/formatDuration';
import { LogViewer } from './LogViewer.tsx';

// Time constants
const MS_PER_SECOND = 1000;
const DURATION_UPDATE_INTERVAL = 1000;

interface SessionsPanelProps {
  epicSlug: string;
  storySlug: string;
}

interface SessionDetailCardProps {
  session: SessionInfo;
  defaultExpanded?: boolean;
}

/**
 * Skeleton for a single session card in the panel
 */
function SessionCardSkeleton() {
  return (
    <Card className="animate-pulse" data-testid="session-card-skeleton">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 bg-bg-light rounded" />
          <div className="h-5 w-48 bg-bg-light rounded" />
          <div className="h-5 w-16 bg-bg-light rounded-full ml-auto" />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="h-4 w-32 bg-bg-light rounded" />
          <div className="h-4 w-20 bg-bg-light rounded" />
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * Loading skeleton for the SessionsPanel
 */
function SessionsPanelSkeleton() {
  return (
    <div data-testid="sessions-panel-skeleton" className="space-y-4">
      <SessionCardSkeleton />
      <SessionCardSkeleton />
      <SessionCardSkeleton />
    </div>
  );
}

/**
 * Status badge with appropriate color based on session status
 */
function SessionStatusBadge({ status }: { status: SessionStatus }) {
  if (status === 'running') {
    return (
      <Badge className="bg-primary/20 text-primary flex items-center gap-1">
        <Play className="w-3 h-3" />
        Running
      </Badge>
    );
  }

  return (
    <Badge className="bg-success/20 text-success flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      Completed
    </Badge>
  );
}

/**
 * Format start time for display
 */
function formatStartTime(startTime: string): string {
  const date = new Date(startTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Calculate duration in seconds
 */
function calculateDuration(startTime: string, endTime?: string): number {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  return Math.floor((end - start) / MS_PER_SECOND);
}

/**
 * Hook to manage live duration updates for running sessions
 */
function useLiveDuration(startTime: string, endTime?: string, isRunning?: boolean): number {
  const [duration, setDuration] = useState(() => calculateDuration(startTime, endTime));

  useEffect(() => {
    if (!isRunning) {
      setDuration(calculateDuration(startTime, endTime));
      return;
    }

    const interval = setInterval(() => {
      setDuration(calculateDuration(startTime, endTime));
    }, DURATION_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [startTime, endTime, isRunning]);

  return duration;
}

/**
 * Session detail card with collapsible log viewer
 */
function SessionDetailCard({ session, defaultExpanded = false }: SessionDetailCardProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const isRunning = session.status === 'running';
  const duration = useLiveDuration(session.startTime, session.endTime, isRunning);

  const canExpand = session.outputAvailable;

  if (!canExpand) {
    return (
      <Card data-testid="session-detail-card" className="opacity-60">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-text-muted" />
            <span className="font-medium text-text truncate">{session.name}</span>
            <SessionStatusBadge status={session.status} />
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
            <span>Started at {formatStartTime(session.startTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
          <div className="mt-2 text-sm text-text-muted italic">Output unavailable</div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="session-detail-card">
        <CollapsibleTrigger asChild={true}>
          <CardHeader
            data-testid="session-card-trigger"
            className="cursor-pointer hover:bg-bg-light/50 transition-colors py-3"
          >
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
              <Terminal className="w-4 h-4 text-text-muted" />
              <span className="font-medium text-text truncate">{session.name}</span>
              <SessionStatusBadge status={session.status} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-text-muted pl-8">
              <span>Started at {formatStartTime(session.startTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="h-64">
              <LogViewer
                sessionName={session.name}
                status={session.status}
                outputAvailable={session.outputAvailable}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Empty state when no sessions exist for the story
 */
function SessionsPanelEmpty() {
  return (
    <div data-testid="sessions-panel-empty" className="text-center py-8">
      <Terminal className="w-8 h-8 text-text-muted mx-auto mb-2" />
      <p className="text-text-muted">No sessions found for this story</p>
    </div>
  );
}

/**
 * Error state when session loading fails
 */
function SessionsPanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div data-testid="sessions-panel-error" className="text-center py-8">
      <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
      <p className="text-danger font-medium mb-1">Failed to load sessions</p>
      <p className="text-text-muted text-sm mb-4">Something went wrong while fetching sessions.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}

/**
 * Determine which session should be auto-expanded:
 * 1. Most recent running session
 * 2. If no running sessions, most recent completed session
 */
function getAutoExpandSessionName(sessions: SessionInfo[]): string | null {
  if (sessions.length === 0) {
    return null;
  }

  // Find the most recent running session
  const runningSessions = sessions.filter((s) => s.status === 'running');
  if (runningSessions.length > 0) {
    // Sessions are already sorted by startTime descending, so first running is most recent
    return runningSessions[0].name;
  }

  // No running sessions, return the most recent completed (first in list)
  return sessions[0].name;
}

/**
 * SessionsPanel displays all sessions for a specific story
 */
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: component has clear structure with hooks and conditional rendering
function SessionsPanel({ epicSlug, storySlug }: SessionsPanelProps) {
  // Read sessions from context for WebSocket updates (don't write to avoid conflicts)
  const { sessions: contextSessions } = useDashboard();
  const [localSessions, setLocalSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  // Track if initial auto-expand has been determined (only calculate once)
  const autoExpandSessionNameRef = useRef<string | null | undefined>(undefined);

  // Filter context sessions for this story (WebSocket updates contain all sessions)
  const storyContextSessions = useMemo(() => {
    return contextSessions.filter((s) => s.epicSlug === epicSlug && s.storySlug === storySlug);
  }, [contextSessions, epicSlug, storySlug]);

  // Use context sessions if available (for real-time updates), otherwise use local fetch
  const sessions = storyContextSessions.length > 0 ? storyContextSessions : localSessions;

  // Sort sessions by startTime descending (most recent first)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  }, [sessions]);

  // Determine auto-expand session only on initial load (not on subsequent updates)
  if (autoExpandSessionNameRef.current === undefined && sortedSessions.length > 0) {
    autoExpandSessionNameRef.current = getAutoExpandSessionName(sortedSessions);
  }
  const autoExpandSessionName = autoExpandSessionNameRef.current ?? null;

  // Fetch sessions function (reusable for retry)
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/sessions?epicSlug=${epicSlug}&storySlug=${storySlug}`);
      if (response.ok) {
        const data: SessionInfo[] = await response.json();
        setLocalSessions(data);
      } else {
        setError(true);
        setLocalSessions([]);
      }
    } catch {
      setError(true);
      setLocalSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [epicSlug, storySlug]);

  // Fetch sessions on mount and when slugs change
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  if (isLoading) {
    return <SessionsPanelSkeleton />;
  }

  if (error) {
    return (
      <div data-testid="sessions-panel">
        <SessionsPanelError onRetry={fetchSessions} />
      </div>
    );
  }

  if (sortedSessions.length === 0) {
    return (
      <div data-testid="sessions-panel">
        <SessionsPanelEmpty />
      </div>
    );
  }

  return (
    <div data-testid="sessions-panel" className="space-y-4">
      {sortedSessions.map((session) => (
        <SessionDetailCard
          key={session.name}
          session={session}
          defaultExpanded={session.name === autoExpandSessionName}
        />
      ))}
    </div>
  );
}

export {
  SessionsPanel,
  SessionsPanelSkeleton,
  SessionDetailCard,
  SessionsPanelEmpty,
  SessionsPanelError,
  SessionStatusBadge,
};
