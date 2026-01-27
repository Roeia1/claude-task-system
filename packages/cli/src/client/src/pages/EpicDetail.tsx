import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDashboard } from '@/context/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { showApiErrorToast } from '@/lib/toast-utils';
import type { Epic, StoryDetail, StoryStatus } from '@/types/dashboard';

/** Status priority for sorting (lower = higher priority) */
const statusPriority: Record<StoryStatus, number> = {
  blocked: 0,
  in_progress: 1,
  ready: 2,
  completed: 3,
};

/** Skeleton loading component for the epic header */
function HeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-bg-light rounded" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-bg-light rounded" />
          <div className="h-4 w-32 bg-bg-light rounded" />
        </div>
        <div className="h-4 w-full bg-bg-light rounded" />
      </div>
    </div>
  );
}

/** Skeleton loading component for story cards */
function StoryCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 w-48 bg-bg-light rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-6 w-24 bg-bg-light rounded-full" />
        <div className="h-4 w-32 bg-bg-light rounded" />
      </CardContent>
    </Card>
  );
}

/** Status badge with appropriate color based on story status */
function StatusBadge({ status }: { status: StoryStatus }) {
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

  return <Badge className={variants[status]}>{labels[status]}</Badge>;
}

/** Calculate task progress for a story */
function getTaskProgress(tasks: StoryDetail['tasks']) {
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  return { completed: completedTasks, total: tasks.length };
}

/** Card component for displaying a single story */
function StoryCard({ story, epicSlug }: { story: StoryDetail; epicSlug: string }) {
  const taskProgress = getTaskProgress(story.tasks);

  return (
    <Link to={`/epic/${epicSlug}/story/${story.slug}`} className="block">
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{story.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusBadge status={story.status} />
          <p className="text-sm text-text-muted">
            {taskProgress.completed}/{taskProgress.total} tasks completed
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function EpicDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { currentEpic, setCurrentEpic, clearCurrentEpic, isLoading } = useDashboard();
  const [isFetching, setIsFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpic = async () => {
      if (!slug) return;

      setIsFetching(true);
      setNotFound(false);
      setError(null);

      try {
        const response = await fetch(`/api/epics/${slug}`);
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) {
          setError('Failed to load epic');
          return;
        }
        const data: Epic = await response.json();
        setCurrentEpic(data);
      } catch (err) {
        setError('Failed to load epic');
        const message = err instanceof Error ? err.message : 'Unknown error';
        showApiErrorToast(`/api/epics/${slug}`, message);
      } finally {
        setIsFetching(false);
      }
    };

    fetchEpic();

    return () => {
      clearCurrentEpic();
    };
  }, [slug, setCurrentEpic, clearCurrentEpic]);

  const loading = isLoading || isFetching;

  // Calculate completion percentage
  const completionPercentage =
    currentEpic && currentEpic.storyCounts.total > 0
      ? Math.round((currentEpic.storyCounts.completed / currentEpic.storyCounts.total) * 100)
      : 0;

  // Sort stories by status priority: blocked first, then in_progress, then ready, then completed
  const sortedStories = currentEpic
    ? [...currentEpic.stories].sort((a, b) => statusPriority[a.status] - statusPriority[b.status])
    : [];

  // 404 state
  if (notFound) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-text mb-2">Epic not found</h1>
        <p className="text-text-muted mb-4">
          The epic &quot;{slug}&quot; does not exist.
        </p>
        <Link to="/" className="text-primary hover:underline">
          ← Back to epic list
        </Link>
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-danger mb-2">Error</h1>
        <p className="text-text-muted mb-4">{error}</p>
        <Link to="/" className="text-primary hover:underline">
          ← Back to epic list
        </Link>
      </div>
    );
  }

  // Loading state
  if (loading || !currentEpic) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StoryCardSkeleton />
          <StoryCardSkeleton />
          <StoryCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Epic header */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text">{currentEpic.title}</h1>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Progress</span>
            <span className="text-text-muted">
              {currentEpic.storyCounts.completed}/{currentEpic.storyCounts.total} stories completed
            </span>
          </div>
          <Progress value={completionPercentage} />
        </div>
      </div>

      {/* Stories list */}
      {sortedStories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted text-lg">No stories in this epic.</p>
          <p className="text-text-muted">
            Run <code className="text-primary">/generate-stories</code> to create stories.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Stories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedStories.map((story) => (
              <StoryCard key={story.slug} story={story} epicSlug={slug!} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EpicDetail;
