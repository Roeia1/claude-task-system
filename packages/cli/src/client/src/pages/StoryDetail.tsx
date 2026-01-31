import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboard } from '@/context/dashboard-context';
import { showApiErrorToast } from '@/lib/toast-utils';
import type {
  JournalEntry,
  JournalEntryType,
  StoryDetail as StoryDetailType,
  StoryStatus,
  TaskStatus,
} from '@/types/dashboard';

/** HTTP 404 Not Found status code */
const HTTP_NOT_FOUND = 404;

/** Skeleton loading component for the story header */
function HeaderSkeleton() {
  return (
    <div class="animate-pulse space-y-4" data-testid="story-header-skeleton">
      <div class="h-8 w-64 bg-bg-light rounded" />
      <div class="flex items-center gap-4">
        <div class="h-6 w-24 bg-bg-light rounded-full" />
        <div class="h-4 w-32 bg-bg-light rounded" />
      </div>
    </div>
  );
}

/** Skeleton loading component for content sections */
function ContentSkeleton() {
  return (
    <div class="animate-pulse space-y-4" data-testid="story-content-skeleton">
      <div class="h-6 w-48 bg-bg-light rounded" />
      <div class="space-y-2">
        <div class="h-4 w-full bg-bg-light rounded" />
        <div class="h-4 w-3/4 bg-bg-light rounded" />
        <div class="h-4 w-5/6 bg-bg-light rounded" />
      </div>
    </div>
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

  return <Badge class={variants[status]}>{labels[status]}</Badge>;
}

/** Task status icon (visual only, not interactive) */
function TaskStatusIcon({ status }: { status: TaskStatus }) {
  const iconProps = { className: 'w-5 h-5 pointer-events-none cursor-default' };

  switch (status) {
    case 'completed':
      return (
        <CheckCircle
          {...iconProps}
          class={`${iconProps.className} text-success`}
          data-testid="icon-check-circle"
        />
      );
    case 'inProgress':
      return (
        <Circle
          {...iconProps}
          class={`${iconProps.className} text-primary fill-primary/20`}
          data-testid="icon-circle-in-progress"
        />
      );
    default:
      return (
        <Circle
          {...iconProps}
          class={`${iconProps.className} text-text-muted`}
          data-testid="icon-circle-pending"
        />
      );
  }
}

/** Task status badge styles */
const taskBadgeStyles: Record<TaskStatus, string> = {
  pending: 'bg-text-muted/20 text-text-muted',
  inProgress: 'bg-primary/20 text-primary',
  completed: 'bg-success/20 text-success',
};

/** Task status labels */
const taskStatusLabels: Record<TaskStatus, string> = {
  pending: 'pending',
  inProgress: 'in progress',
  completed: 'completed',
};

/** Get badge class based on task status */
function getTaskBadgeClass(status: TaskStatus): string {
  return taskBadgeStyles[status] || taskBadgeStyles.pending;
}

/** Single task item display */
function TaskItem({ task }: { task: StoryDetailType['tasks'][0] }) {
  const badgeClass = getTaskBadgeClass(task.status);

  return (
    <div class="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-bg-light/50">
      <TaskStatusIcon status={task.status} />
      <span class={task.status === 'completed' ? 'text-text-muted line-through' : 'text-text'}>
        {task.title}
      </span>
      <Badge class={`ml-auto text-xs ${badgeClass}`}>{taskStatusLabels[task.status]}</Badge>
    </div>
  );
}

/** Get color/style for journal entry type */
function getEntryTypeStyle(type: JournalEntryType): { bg: string; text: string; border: string } {
  switch (type) {
    case 'blocker':
      return { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/30' };
    case 'resolution':
      return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' };
    default:
      return { bg: 'bg-bg-light', text: 'text-text', border: 'border-border-muted' };
  }
}

/** Single journal entry with collapsible content */
function JournalEntryItem({
  entry,
  defaultOpen = false,
}: {
  entry: JournalEntry;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const style = getEntryTypeStyle(entry.type);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card class={`${style.bg} border ${style.border}`}>
        <CollapsibleTrigger asChild={true}>
          <CardHeader class="cursor-pointer hover:bg-bg-light/50 transition-colors py-3">
            <div class="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown class="w-4 h-4 text-text-muted" data-testid="icon-chevron-down" />
              ) : (
                <ChevronRight class="w-4 h-4 text-text-muted" data-testid="icon-chevron-right" />
              )}
              <Badge class={`${style.bg} ${style.text} border ${style.border}`}>{entry.type}</Badge>
              <CardTitle class={`text-sm font-medium ${style.text}`}>{entry.title}</CardTitle>
              {entry.type === 'blocker' && (
                <AlertCircle class="w-4 h-4 text-danger ml-auto" data-testid="icon-alert-circle" />
              )}
              {entry.timestamp && (
                <span class="text-xs text-text-muted ml-auto">{entry.timestamp}</span>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent class="pt-0 pb-4">
            <div class="prose prose-sm prose-invert max-w-none">
              <pre class="whitespace-pre-wrap text-sm text-text-muted font-mono bg-bg-dark p-3 rounded-md overflow-x-auto">
                {entry.content}
              </pre>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/** Calculate task completion progress */
function calculateTaskProgress(story: StoryDetailType | null) {
  if (!story) {
    return { completed: 0, total: 0 };
  }
  return {
    completed: story.tasks.filter((t) => t.status === 'completed').length,
    total: story.tasks.length,
  };
}

/** Group journal entries by type */
function groupJournalEntries(journal: JournalEntry[]) {
  return {
    blockers: journal.filter((e) => e.type === 'blocker'),
    sessions: journal.filter((e) => e.type === 'session'),
    resolutions: journal.filter((e) => e.type === 'resolution'),
  };
}

/** Story not found state */
function StoryNotFoundState({ epicSlug, storySlug }: { epicSlug: string; storySlug: string }) {
  return (
    <div class="text-center py-12">
      <h1 class="text-2xl font-bold text-text mb-2">Story not found</h1>
      <p class="text-text-muted mb-4">
        The story &quot;{storySlug}&quot; does not exist in epic &quot;{epicSlug}&quot;.
      </p>
      <Link to={`/epic/${epicSlug}`} class="text-primary hover:underline">
        ← Back to epic
      </Link>
    </div>
  );
}

/** Story error state */
function StoryErrorState({ epicSlug, error }: { epicSlug: string; error: string }) {
  return (
    <div class="text-center py-12">
      <h1 class="text-2xl font-bold text-danger mb-2">Error</h1>
      <p class="text-text-muted mb-4">{error}</p>
      <Link to={`/epic/${epicSlug}`} class="text-primary hover:underline">
        ← Back to epic
      </Link>
    </div>
  );
}

/** Story loading state */
function StoryLoadingState() {
  return (
    <div class="space-y-6">
      <HeaderSkeleton />
      <ContentSkeleton />
    </div>
  );
}

/** Story header with breadcrumb, title, and status */
function StoryHeader({
  story,
  epicSlug,
  storySlug,
}: {
  story: StoryDetailType;
  epicSlug: string;
  storySlug: string;
}) {
  const taskProgress = calculateTaskProgress(story);

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-2 text-sm text-text-muted">
        <Link to={`/epic/${epicSlug}`} class="hover:text-primary">
          {epicSlug}
        </Link>
        <span>/</span>
        <span class="text-text">{storySlug}</span>
      </div>
      <h1 class="text-2xl font-bold text-text">{story.title}</h1>
      <div class="flex items-center gap-4">
        <StatusBadge status={story.status} />
        <span class="text-sm text-text-muted">
          {taskProgress.completed}/{taskProgress.total} tasks completed
        </span>
      </div>
    </div>
  );
}

/** Tasks tab content */
function TasksTabContent({ tasks }: { tasks: StoryDetailType['tasks'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p class="text-text-muted text-center py-4">No tasks defined for this story.</p>
        ) : (
          <div class="divide-y divide-border-muted">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Story content tab */
function ContentTabContent({ content }: { content: string | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Story Content</CardTitle>
      </CardHeader>
      <CardContent>
        {content ? (
          <div class="prose prose-sm prose-invert max-w-none prose-headings:text-text prose-p:text-text-muted prose-strong:text-text prose-code:text-primary prose-code:bg-bg-dark prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-bg-dark prose-pre:border prose-pre:border-border-muted prose-a:text-primary prose-a:no-underline prose-a:hover:underline prose-li:text-text-muted prose-table:border prose-table:border-border-muted prose-th:bg-bg-dark prose-th:px-3 prose-th:py-2 prose-th:text-text prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-border-muted">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <p class="text-text-muted text-center py-4">No story content available.</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Get color class for journal section type */
function getJournalSectionColor(type: string): string {
  if (type === 'Blockers') {
    return 'text-danger';
  }
  if (type === 'Resolutions') {
    return 'text-success';
  }
  return 'text-text';
}

/** Journal entries section */
function JournalSection({
  entries,
  type,
  icon: Icon,
}: {
  entries: JournalEntry[];
  type: string;
  icon: typeof AlertCircle;
}) {
  if (entries.length === 0) {
    return null;
  }

  const colorClass = getJournalSectionColor(type);

  return (
    <div class="space-y-3">
      <h3 class={`text-sm font-semibold ${colorClass} flex items-center gap-2`}>
        <Icon class="w-4 h-4" />
        {type} ({entries.length})
      </h3>
      {entries.map((entry) => (
        <JournalEntryItem
          key={`${type.toLowerCase()}-${entry.title}-${entry.timestamp ?? ''}`}
          entry={entry}
          defaultOpen={type === 'Blockers'}
        />
      ))}
    </div>
  );
}

/** Journal tab content */
function JournalTabContent({ journal }: { journal: JournalEntry[] }) {
  if (journal.length === 0) {
    return (
      <Card>
        <CardContent class="py-8">
          <p class="text-text-muted text-center">No journal entries yet.</p>
        </CardContent>
      </Card>
    );
  }

  const { blockers, sessions, resolutions } = groupJournalEntries(journal);

  return (
    <div class="space-y-4">
      <JournalSection entries={blockers} type="Blockers" icon={AlertCircle} />
      <JournalSection entries={resolutions} type="Resolutions" icon={CheckCircle} />
      <JournalSection entries={sessions} type="Sessions" icon={Circle} />
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
  setError('Failed to load story');
  showApiErrorToast(url, err instanceof Error ? err.message : 'Unknown error');
}

/** Custom hook for fetching story data */
function useStoryFetch(epicSlug: string | undefined, storySlug: string | undefined) {
  const {
    currentStory,
    setCurrentStory,
    clearCurrentStory,
    subscribeToStory,
    unsubscribeFromStory,
    isConnected,
  } = useDashboard();
  const [isFetching, setIsFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSlugs = Boolean(epicSlug && storySlug);

  // Fetch story data on mount
  useEffect(() => {
    if (!hasSlugs) {
      return clearCurrentStory;
    }

    const fetchStory = async () => {
      setIsFetching(true);
      setNotFound(false);
      setError(null);

      try {
        const response = await fetch(`/api/stories/${epicSlug}/${storySlug}`);
        const result = await processFetchResponse(response);

        if (result.type === 'notFound') {
          setNotFound(true);
        } else if (result.type === 'error') {
          setError('Failed to load story');
        } else {
          setCurrentStory(result.data);
        }
      } catch (err) {
        handleFetchError(`/api/stories/${epicSlug}/${storySlug}`, err, setError);
      } finally {
        setIsFetching(false);
      }
    };

    fetchStory();

    return clearCurrentStory;
  }, [epicSlug, storySlug, hasSlugs, setCurrentStory, clearCurrentStory]);

  // Subscribe to story updates when WebSocket is connected
  useEffect(() => {
    if (!(hasSlugs && isConnected)) {
      return;
    }

    subscribeToStory(epicSlug as string, storySlug as string);

    return () => {
      unsubscribeFromStory(epicSlug as string, storySlug as string);
    };
  }, [epicSlug, storySlug, hasSlugs, isConnected, subscribeToStory, unsubscribeFromStory]);

  return { currentStory, loading: isFetching, notFound, error };
}

function StoryDetail() {
  const { epicSlug, storySlug } = useParams<{ epicSlug: string; storySlug: string }>();
  const { currentStory, loading, notFound, error } = useStoryFetch(epicSlug, storySlug);

  if (notFound) {
    return <StoryNotFoundState epicSlug={epicSlug ?? ''} storySlug={storySlug ?? ''} />;
  }
  if (error && !loading) {
    return <StoryErrorState epicSlug={epicSlug ?? ''} error={error} />;
  }
  if (loading || !currentStory) {
    return <StoryLoadingState />;
  }

  const { blockers } = groupJournalEntries(currentStory.journal);

  return (
    <div class="space-y-6">
      <StoryHeader story={currentStory} epicSlug={epicSlug ?? ''} storySlug={storySlug ?? ''} />
      <Tabs defaultValue="tasks" class="w-full">
        <TabsList class="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">
            Journal
            {blockers.length > 0 && (
              <Badge class="ml-2 bg-danger/20 text-danger text-xs">{blockers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" class="space-y-4">
          <TasksTabContent tasks={currentStory.tasks} />
        </TabsContent>
        <TabsContent value="content" class="space-y-4">
          <ContentTabContent content={currentStory.content} />
        </TabsContent>
        <TabsContent value="journal" class="space-y-4">
          <JournalTabContent journal={currentStory.journal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export {
  HeaderSkeleton,
  ContentSkeleton,
  StatusBadge,
  TaskStatusIcon,
  TaskItem,
  JournalEntryItem,
  StoryDetail,
};
