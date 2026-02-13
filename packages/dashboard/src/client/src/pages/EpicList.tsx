import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ActiveSessions } from '@/components/active-sessions';
import { StatusBadgeWithCount } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDashboard } from '@/context/dashboard-context';
import { showApiErrorToast } from '@/lib/toast-utils';
import type { EpicSummary } from '@/types/dashboard';

/** Percentage conversion multiplier */
const PERCENTAGE_MULTIPLIER = 100;

/** Skeleton loading component for epic cards */
export function EpicCardSkeleton() {
  return (
    <Card className="animate-pulse" data-testid="epic-card-skeleton">
      <CardHeader>
        <div className="h-6 w-48 bg-bg-light rounded" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-4 w-full bg-bg-light rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-bg-light rounded-full" />
          <div className="h-6 w-16 bg-bg-light rounded-full" />
          <div className="h-6 w-16 bg-bg-light rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Card component for displaying a single epic */
export function EpicCard({ epic }: { epic: EpicSummary }) {
  const { storyCounts } = epic;
  const completionPercentage =
    storyCounts.total > 0
      ? Math.round((storyCounts.completed / storyCounts.total) * PERCENTAGE_MULTIPLIER)
      : 0;

  return (
    <Link to={`/epic/${epic.id}`} className="block">
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg">{epic.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Progress</span>
              <span className="text-text-muted">
                {storyCounts.completed}/{storyCounts.total} stories
              </span>
            </div>
            <Progress value={completionPercentage} />
          </div>
          <div className="flex flex-wrap gap-2">
            {storyCounts.pending > 0 && (
              <StatusBadgeWithCount status="pending" count={storyCounts.pending} />
            )}
            {storyCounts.inProgress > 0 && (
              <StatusBadgeWithCount status="inProgress" count={storyCounts.inProgress} />
            )}
            {storyCounts.completed > 0 && (
              <StatusBadgeWithCount status="completed" count={storyCounts.completed} />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function EpicList() {
  const { epics, setEpics } = useDashboard();
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchEpics = async () => {
      try {
        const response = await fetch('/api/epics');
        if (response.ok) {
          const data: EpicSummary[] = await response.json();
          setEpics(data);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        showApiErrorToast('/api/epics', message);
      } finally {
        setIsFetching(false);
      }
    };

    fetchEpics();
  }, [setEpics]);

  const loading = isFetching;

  return (
    <div className="space-y-6">
      <ActiveSessions />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Epics</h1>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <EpicCardSkeleton />
          <EpicCardSkeleton />
          <EpicCardSkeleton />
        </div>
      )}
      {!loading && epics.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-muted text-lg">No epics found.</p>
          <p className="text-text-muted">
            Run <code className="text-primary">/create-epic</code> to get started.
          </p>
        </div>
      )}
      {!loading && epics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {epics.map((epic) => (
            <EpicCard key={epic.id} epic={epic} />
          ))}
        </div>
      )}
    </div>
  );
}
