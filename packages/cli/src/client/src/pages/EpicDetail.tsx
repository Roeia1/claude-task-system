import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { EpicContent } from '@/components/EpicContent';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDashboard } from '@/context/dashboard-context';
import { showApiErrorToast } from '@/lib/toast-utils';
import type { Epic, StoryDetail, StoryStatus } from '@/types/dashboard';

/** HTTP 404 Not Found status code */
const HTTP_NOT_FOUND = 404;

/** Percentage conversion multiplier */
const PERCENTAGE_MULTIPLIER = 100;

/** Status priority for sorting (lower = higher priority) */
const statusPriority: Record<StoryStatus, number> = {
  blocked: 0,
  // biome-ignore lint/style/useNamingConvention: StoryStatus type uses snake_case
  in_progress: 1,
  ready: 2,
  completed: 3,
};

/** Skeleton loading component for the epic header */
function HeaderSkeleton() {
  return (
    <div class="animate-pulse space-y-4" data-testid="epic-header-skeleton">
      <div class="h-8 w-64 bg-bg-light rounded" />
      <div class="space-y-2">
        <div class="flex justify-between">
          <div class="h-4 w-24 bg-bg-light rounded" />
          <div class="h-4 w-32 bg-bg-light rounded" />
        </div>
        <div class="h-4 w-full bg-bg-light rounded" />
      </div>
    </div>
  );
}

/** Skeleton loading component for story cards */
function StoryCardSkeleton() {
  return (
    <Card class="animate-pulse" data-testid="story-card-skeleton">
      <CardHeader>
        <div class="h-5 w-48 bg-bg-light rounded" />
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="h-6 w-24 bg-bg-light rounded-full" />
        <div class="h-4 w-32 bg-bg-light rounded" />
      </CardContent>
    </Card>
  );
}

/** Status badge with appropriate color based on story status */
function StatusBadge({ status }: { status: StoryStatus }) {
  const variants: Record<StoryStatus, string> = {
    ready: 'bg-text-muted/20 text-text-muted',
    // biome-ignore lint/style/useNamingConvention: StoryStatus type uses snake_case
    in_progress: 'bg-primary/20 text-primary',
    blocked: 'bg-danger/20 text-danger',
    completed: 'bg-success/20 text-success',
  };

  const labels: Record<StoryStatus, string> = {
    ready: 'Ready',
    // biome-ignore lint/style/useNamingConvention: StoryStatus type uses snake_case
    in_progress: 'In Progress',
    blocked: 'Blocked',
    completed: 'Completed',
  };

  return <Badge class={variants[status]}>{labels[status]}</Badge>;
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
    <Link to={`/epic/${epicSlug}/story/${story.slug}`} class="block">
      <Card class="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader class="pb-2">
          <CardTitle class="text-base">{story.title}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <StatusBadge status={story.status} />
          <p class="text-sm text-text-muted">
            {taskProgress.completed}/{taskProgress.total} tasks completed
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function EpicDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { currentEpic, setCurrentEpic, clearCurrentEpic, isLoading } = useDashboard();
  const [isFetching, setIsFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpic = async () => {
      if (!slug) {
        return;
      }

      setIsFetching(true);
      setNotFound(false);
      setError(null);

      try {
        const response = await fetch(`/api/epics/${slug}`);
        if (response.status === HTTP_NOT_FOUND) {
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
      ? Math.round(
          (currentEpic.storyCounts.completed / currentEpic.storyCounts.total) *
            PERCENTAGE_MULTIPLIER,
        )
      : 0;

  // Sort stories by status priority: blocked first, then in_progress, then ready, then completed
  const sortedStories = currentEpic
    ? [...currentEpic.stories].sort((a, b) => statusPriority[a.status] - statusPriority[b.status])
    : [];

  // 404 state
  if (notFound) {
    return (
      <div class="text-center py-12">
        <h1 class="text-2xl font-bold text-text mb-2">Epic not found</h1>
        <p class="text-text-muted mb-4">The epic &quot;{slug}&quot; does not exist.</p>
        <Link to="/" class="text-primary hover:underline">
          ← Back to epic list
        </Link>
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div class="text-center py-12">
        <h1 class="text-2xl font-bold text-danger mb-2">Error</h1>
        <p class="text-text-muted mb-4">{error}</p>
        <Link to="/" class="text-primary hover:underline">
          ← Back to epic list
        </Link>
      </div>
    );
  }

  // Loading state
  if (loading || !currentEpic) {
    return (
      <div class="space-y-6">
        <HeaderSkeleton />
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StoryCardSkeleton />
          <StoryCardSkeleton />
          <StoryCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* Epic header */}
      <div class="space-y-4">
        <h1 class="text-2xl font-bold text-text">{currentEpic.title}</h1>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-text-muted">Progress</span>
            <span class="text-text-muted">
              {currentEpic.storyCounts.completed}/{currentEpic.storyCounts.total} stories completed
            </span>
          </div>
          <Progress value={completionPercentage} />
        </div>
      </div>

      {/* Epic content (markdown from epic.md) */}
      <EpicContent content={currentEpic.content} />

      {/* Stories list */}
      {sortedStories.length === 0 ? (
        <div class="text-center py-12">
          <p class="text-text-muted text-lg">No stories in this epic.</p>
          <p class="text-text-muted">
            Run <code class="text-primary">/generate-stories</code> to create stories.
          </p>
        </div>
      ) : (
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-text">Stories</h2>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedStories.map((story) => (
              <StoryCard key={story.slug} story={story} epicSlug={slug ?? ''} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { HeaderSkeleton, StoryCardSkeleton, StatusBadge, StoryCard, EpicDetail };
