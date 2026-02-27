/**
 * KanbanBoard page component
 *
 * Displays all stories in a 3-column Kanban board layout:
 * Pending | In Progress | Completed
 *
 * Fetches all stories via GET /api/stories?all=true and groups them
 * by derived status into columns.
 */
import { useEffect, useState } from 'react';
import { StoryCard } from '@/components/StoryCard.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useDashboard } from '@/context/dashboard-context.tsx';
import type { StoryDetail } from '@/types/dashboard';

/** Column configuration */
const COLUMNS = [
  { key: 'pending', label: 'Pending' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
] as const;

/** Skeleton keys for loading placeholders (avoids index-based keys) */
const SKELETON_KEYS = ['skeleton-1', 'skeleton-2', 'skeleton-3'];

type ColumnKey = (typeof COLUMNS)[number]['key'];

/**
 * Group stories by status into columns
 */
function groupByStatus(stories: StoryDetail[]): Record<ColumnKey, StoryDetail[]> {
  const groups: Record<ColumnKey, StoryDetail[]> = {
    pending: [],
    inProgress: [],
    completed: [],
  };

  for (const story of stories) {
    const key = story.status as ColumnKey;
    if (groups[key]) {
      groups[key].push(story);
    } else {
      groups.pending.push(story);
    }
  }

  return groups;
}

/**
 * Loading skeleton for Kanban columns
 */
function KanbanSkeleton() {
  return (
    <div data-testid="kanban-loading" className="flex h-full gap-4 p-4">
      {COLUMNS.map((col) => (
        <div key={col.key} className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-px w-full" />
          {SKELETON_KEYS.map((skKey) => (
            <Skeleton key={skKey} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Error state display
 */
function KanbanError() {
  return (
    <div data-testid="kanban-error" className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <p className="text-lg font-medium text-text">Failed to load stories</p>
        <p className="mt-1 text-sm text-text-muted">Please try refreshing the page.</p>
      </div>
    </div>
  );
}

/**
 * Single Kanban column with header, separator, and story cards
 */
function KanbanColumn({
  label,
  columnKey,
  stories,
  runningStoryIds,
}: {
  label: string;
  columnKey: string;
  stories: StoryDetail[];
  runningStoryIds: Set<string>;
}) {
  return (
    <div
      data-testid={`column-${columnKey}`}
      className="flex flex-1 flex-col rounded-lg bg-bg-dark/50"
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <h2 className="text-sm font-semibold text-text">{label}</h2>
        <span className="rounded-full bg-bg-light px-2 py-0.5 text-xs text-text-muted">
          {stories.length}
        </span>
      </div>
      <Separator className="mx-3" />

      {/* Story cards */}
      <ScrollArea className="flex-1 px-3 py-2">
        {stories.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No stories</p>
        ) : (
          <div className="space-y-2">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isSessionRunning={runningStoryIds.has(story.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

/**
 * Custom hook for fetching all stories and sessions.
 * Uses dashboard context for state so WebSocket updates are reflected in real-time.
 */
function useKanbanData() {
  const { allStories, sessions, setAllStories, setSessions } = useDashboard();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch('/api/stories?all=true');
        if (!res.ok) {
          setHasError(true);
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setAllStories(data);
        setIsLoading(false);
      } catch {
        setHasError(true);
        setIsLoading(false);
      }
    }
    fetchStories();
  }, [setAllStories]);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/sessions?status=running');
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch {
        // Sessions are optional, don't error the board
      }
    }
    fetchSessions();
  }, [setSessions]);

  return { stories: allStories, sessions, isLoading, hasError };
}

function KanbanBoardContent() {
  const { stories, sessions, isLoading, hasError } = useKanbanData();

  if (isLoading) {
    return <KanbanSkeleton />;
  }

  if (hasError) {
    return <KanbanError />;
  }

  const grouped = groupByStatus(stories);
  const runningStoryIds = new Set(
    sessions.filter((s) => s.status === 'running').map((s) => s.storyId),
  );

  return (
    <div data-testid="kanban-board" className="flex h-full gap-4 p-4">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.key}
          label={col.label}
          columnKey={col.key}
          stories={grouped[col.key]}
          runningStoryIds={runningStoryIds}
        />
      ))}
    </div>
  );
}

export { KanbanBoardContent as KanbanBoard };
