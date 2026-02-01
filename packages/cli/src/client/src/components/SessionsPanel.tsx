/**
 * SessionsPanel - Displays sessions for a specific story in the story detail page.
 * Fetches sessions from the API and displays them with real-time WebSocket updates.
 */
import { ChevronDown, ChevronRight, Play, Square, Terminal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
      <Badge className="bg-success/20 text-success flex items-center gap-1">
        <Play className="w-3 h-3" />
        Running
      </Badge>
    );
  }

  return (
    <Badge className="bg-text-muted/20 text-text-muted flex items-center gap-1">
      <Square className="w-3 h-3" />
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
          <CardHeader className="cursor-pointer hover:bg-bg-light/50 transition-colors py-3">
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
function SessionsPanel({ epicSlug, storySlug }: SessionsPanelProps) {
  const { setSessions } = useDashboard();
  const [sessions, setLocalSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sort sessions by startTime descending (most recent first)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  }, [sessions]);

  // Determine auto-expand session (only on initial load)
  const autoExpandSessionName = useMemo(() => {
    return getAutoExpandSessionName(sortedSessions);
  }, [sortedSessions]);

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/sessions?epicSlug=${epicSlug}&storySlug=${storySlug}`);
        if (response.ok) {
          const data: SessionInfo[] = await response.json();
          setLocalSessions(data);
          setSessions(data);
        } else {
          setLocalSessions([]);
        }
      } catch {
        setLocalSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [epicSlug, storySlug, setSessions]);

  if (isLoading) {
    return <SessionsPanelSkeleton />;
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

export { SessionsPanel, SessionsPanelSkeleton };
