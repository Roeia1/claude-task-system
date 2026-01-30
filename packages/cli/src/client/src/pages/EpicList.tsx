import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '@/context/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ActiveSessions } from '@/components/ActiveSessions';
import { showApiErrorToast } from '@/lib/toast-utils';
import type { EpicSummary, StoryStatus } from '@/types/dashboard';

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

/** Status badge with appropriate color based on story status */
export function StatusBadge({ status, count }: { status: StoryStatus; count: number }) {
  const variants: Record<StoryStatus, string> = {
    ready: 'bg-text-muted/20 text-text-muted',
    in_progress: 'bg-primary/20 text-primary',
    blocked: 'bg-danger/20 text-danger',
    completed: 'bg-success/20 text-success',
  };

  const labels: Record<StoryStatus, string> = {
    ready: 'Ready',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    completed: 'Completed',
  };

  return (
    <Badge className={variants[status]}>
      {labels[status]}: {count}
    </Badge>
  );
}

/** Card component for displaying a single epic */
export function EpicCard({ epic }: { epic: EpicSummary }) {
  const { storyCounts } = epic;
  const completionPercentage =
    storyCounts.total > 0
      ? Math.round((storyCounts.completed / storyCounts.total) * 100)
      : 0;

  return (
    <Link to={`/epic/${epic.slug}`} className="block">
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
            {storyCounts.ready > 0 && (
              <StatusBadge status="ready" count={storyCounts.ready} />
            )}
            {storyCounts.inProgress > 0 && (
              <StatusBadge status="in_progress" count={storyCounts.inProgress} />
            )}
            {storyCounts.blocked > 0 && (
              <StatusBadge status="blocked" count={storyCounts.blocked} />
            )}
            {storyCounts.completed > 0 && (
              <StatusBadge status="completed" count={storyCounts.completed} />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function EpicList() {
  const { epics, setEpics, isLoading } = useDashboard();
  const [showArchived, setShowArchived] = useState(false);
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

  const loading = isLoading || isFetching;

  // Filter epics based on archived toggle
  const filteredEpics = epics.filter((epic) => {
    if (showArchived) {
      return true;
    }
    return !epic.isArchived;
  });

  // Check if there are any archived epics to show the toggle
  const hasArchivedEpics = epics.some((epic) => epic.isArchived);

  return (
    <div className="space-y-6">
      <ActiveSessions />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Epics</h1>
        {hasArchivedEpics && (
          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-border"
            />
            Show archived
          </label>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <EpicCardSkeleton />
          <EpicCardSkeleton />
          <EpicCardSkeleton />
        </div>
      ) : filteredEpics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted text-lg">No epics found.</p>
          <p className="text-text-muted">
            Run <code className="text-primary">/create-epic</code> to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEpics.map((epic) => (
            <EpicCard key={epic.slug} epic={epic} />
          ))}
        </div>
      )}
    </div>
  );
}

export default EpicList;
