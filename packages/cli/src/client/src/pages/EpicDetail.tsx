import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { EpicContent } from '@/components/EpicContent';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDashboard } from '@/context/dashboard-context';
import { showApiErrorToast } from '@/lib/toast-utils';
import type { StoryDetail, StoryStatus } from '@/types/dashboard';

/** HTTP 404 Not Found status code */
const HTTP_NOT_FOUND = 404;

/** Percentage conversion multiplier */
const PERCENTAGE_MULTIPLIER = 100;

/** Status priority for sorting (lower = higher priority) */
const statusPriority: Record<StoryStatus, number> = {
  blocked: 0,
  inProgress: 1,
  ready: 2,
  completed: 3,
};

/** Skeleton loading component for the epic header */
function HeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-4" data-testid="epic-header-skeleton">
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
    <Card className="animate-pulse" data-testid="story-card-skeleton">
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
    inProgress: 'bg-primary/20 text-primary',
    blocked: 'bg-danger/20 text-danger',
    completed: 'bg-success/20 text-success',
  };

  const labels: Record<StoryStatus, string> = {
    ready: 'Ready',
    inProgress: 'In Progress',
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

/** Render 404 not found state */
function NotFoundState({ slug }: { slug: string | undefined }) {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-text mb-2">Epic not found</h1>
      <p className="text-text-muted mb-4">The epic &quot;{slug}&quot; does not exist.</p>
      <Link to="/" className="text-primary hover:underline">
        ← Back to epic list
      </Link>
    </div>
  );
}

/** Render error state */
function ErrorState({ error }: { error: string }) {
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

/** Render loading state with skeletons */
function LoadingState() {
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

/** Epic header with title and progress */
function EpicHeader({
  title,
  completed,
  total,
}: {
  title: string;
  completed: number;
  total: number;
}) {
  const completionPercentage =
    total > 0 ? Math.round((completed / total) * PERCENTAGE_MULTIPLIER) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text">{title}</h1>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Progress</span>
          <span className="text-text-muted">
            {completed}/{total} stories completed
          </span>
        </div>
        <Progress value={completionPercentage} />
      </div>
    </div>
  );
}

/** Empty stories state */
function EmptyStoriesState() {
  return (
    <div className="text-center py-12">
      <p className="text-text-muted text-lg">No stories in this epic.</p>
      <p className="text-text-muted">
        Run <code className="text-primary">/generate-stories</code> to create stories.
      </p>
    </div>
  );
}

/** Stories list grid */
function StoriesList({ stories, epicSlug }: { stories: StoryDetail[]; epicSlug: string }) {
  const sortedStories = [...stories].sort(
    (a, b) => statusPriority[a.status] - statusPriority[b.status],
  );

  if (sortedStories.length === 0) {
    return <EmptyStoriesState />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-text">Stories</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedStories.map((story) => (
          <StoryCard key={story.slug} story={story} epicSlug={epicSlug} />
        ))}
      </div>
    </div>
  );
}

/** Result type for fetch response processing */
type FetchResult = { type: 'notFound' } | { type: 'error' } | { type: 'success'; data: unknown };

/** Process fetch response into a result type */
async function processFetchResponse(response: Response): Promise<FetchResult> {
  if (response.status === HTTP_NOT_FOUND) {
    return { type: 'notFound' };
  }
  if (!response.ok) {
    return { type: 'error' };
  }
  return { type: 'success', data: await response.json() };
}

/** Handle fetch error with toast notification */
function handleFetchError(url: string, err: unknown, setError: (e: string) => void): void {
  setError('Failed to load epic');
  showApiErrorToast(url, err instanceof Error ? err.message : 'Unknown error');
}

/** Custom hook for fetching epic data */
function useEpicFetch(slug: string | undefined) {
  const { currentEpic, setCurrentEpic, clearCurrentEpic } = useDashboard();
  const [isFetching, setIsFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      return clearCurrentEpic;
    }

    const fetchEpic = async () => {
      setIsFetching(true);
      setNotFound(false);
      setError(null);

      try {
        const response = await fetch(`/api/epics/${slug}`);
        const result = await processFetchResponse(response);

        if (result.type === 'notFound') {
          setNotFound(true);
        } else if (result.type === 'error') {
          setError('Failed to load epic');
        } else {
          setCurrentEpic(result.data);
        }
      } catch (err) {
        handleFetchError(`/api/epics/${slug}`, err, setError);
      } finally {
        setIsFetching(false);
      }
    };

    fetchEpic();
    return clearCurrentEpic;
  }, [slug, setCurrentEpic, clearCurrentEpic]);

  return { currentEpic, loading: isFetching, notFound, error };
}

function EpicDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { currentEpic, loading, notFound, error } = useEpicFetch(slug);

  if (notFound) {
    return <NotFoundState slug={slug} />;
  }
  if (error && !loading) {
    return <ErrorState error={error} />;
  }
  if (loading || !currentEpic) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <EpicHeader
        title={currentEpic.title}
        completed={currentEpic.storyCounts.completed}
        total={currentEpic.storyCounts.total}
      />
      <EpicContent content={currentEpic.content} />
      <StoriesList stories={currentEpic.stories} epicSlug={slug ?? ''} />
    </div>
  );
}

export { HeaderSkeleton, StoryCardSkeleton, StatusBadge, StoryCard, EpicDetail };
