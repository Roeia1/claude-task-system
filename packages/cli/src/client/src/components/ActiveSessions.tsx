import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SessionInfo } from '@/types/dashboard';

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

/**
 * Skeleton for a single session card
 */
function SessionCardSkeleton() {
  return (
    <Card
      className="animate-pulse min-w-[300px] flex-shrink-0"
      data-testid="session-card-skeleton"
    >
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
 * Component to display a single session card
 */
function SessionCard({ session }: { session: SessionInfo }) {
  return (
    <Link
      to={`/epic/${session.epicSlug}/story/${session.storySlug}?tab=sessions`}
      className="block min-w-[300px] flex-shrink-0"
    >
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{session.storySlug}</CardTitle>
          <div className="text-sm text-text-muted">{session.epicSlug}</div>
        </CardHeader>
        <CardContent>
          {session.outputPreview && (
            <pre className="text-xs font-mono bg-bg-dark p-2 rounded overflow-hidden text-text-muted whitespace-pre-wrap">
              {session.outputPreview}
            </pre>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Displays active (running) sessions at the top of the home page.
 * Fetches from /api/sessions?status=running and shows session cards.
 * Hidden when no running sessions exist.
 */
export function ActiveSessions() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/sessions?status=running');
        if (response.ok) {
          const data: SessionInfo[] = await response.json();
          // Filter to only show running sessions (in case API returns mixed)
          setSessions(data.filter((s) => s.status === 'running'));
        }
      } catch {
        // On error, hide the section (empty sessions array)
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Show loading skeleton
  if (isLoading) {
    return <ActiveSessionsSkeleton />;
  }

  // Hide section when no running sessions
  if (sessions.length === 0) {
    return null;
  }

  return (
    <section data-testid="active-sessions" className="space-y-4">
      <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {sessions.map((session) => (
          <SessionCard key={session.name} session={session} />
        ))}
      </div>
    </section>
  );
}
