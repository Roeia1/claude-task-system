import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useDashboard } from '@/context/dashboard-context';
import type { SessionInfo } from '@/types/dashboard';
import { SessionCard } from './session-card.tsx';

/**
 * Skeleton for a single session card
 */
function SessionCardSkeleton() {
  return (
    <Card className="animate-pulse min-w-[300px] flex-shrink-0" data-testid="session-card-skeleton">
      <CardHeader className="pb-2">
        <div className="h-5 w-32 bg-bg-light rounded" />
        <div className="h-4 w-20 bg-bg-light rounded mt-1" />
      </CardHeader>
      <CardContent>
        <div className="h-16 w-full bg-bg-light rounded" />
      </CardContent>
    </Card>
  );
}

/**
 * Displays active (running) sessions at the top of the home page.
 * Uses WebSocket for real-time updates via the dashboard context.
 * Falls back to initial REST fetch, then receives updates via WebSocket.
 * Hidden when no running sessions exist.
 */
export function ActiveSessions() {
  const { sessions: contextSessions, setSessions } = useDashboard();
  const [isLoading, setIsLoading] = useState(true);

  // Initial fetch of sessions (WebSocket will provide subsequent updates)
  useEffect(() => {
    const fetchInitialSessions = async () => {
      try {
        const response = await fetch('/api/sessions?status=running');
        if (response.ok) {
          const data: SessionInfo[] = await response.json();
          setSessions(data);
        }
      } catch {
        // On error, set empty sessions
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialSessions();
  }, [setSessions]);

  // Filter to only show running sessions
  const runningSessions = contextSessions.filter((s) => s.status === 'running');

  // Show loading skeleton
  if (isLoading) {
    return <ActiveSessionsSkeleton />;
  }

  // Hide section when no running sessions
  if (runningSessions.length === 0) {
    return null;
  }

  return (
    <section data-testid="active-sessions" className="space-y-4">
      <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {runningSessions.map((session) => (
          <div key={session.name} className="min-w-[300px] flex-shrink-0">
            <SessionCard session={session} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Skeleton loading component for the ActiveSessions section
 */
export function ActiveSessionsSkeleton() {
  return (
    <section data-testid="active-sessions-skeleton" className="space-y-4">
      <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <SessionCardSkeleton />
        <SessionCardSkeleton />
        <SessionCardSkeleton />
      </div>
    </section>
  );
}
