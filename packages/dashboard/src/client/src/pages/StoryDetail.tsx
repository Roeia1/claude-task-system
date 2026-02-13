import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams, useSearchParams } from 'react-router';
import remarkGfm from 'remark-gfm';
import { SessionsPanel } from '@/components/SessionsPanel';
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

/** Valid tab values for URL query parameter */
const VALID_TABS = ['tasks', 'content', 'journal', 'sessions'] as const;
type ValidTab = (typeof VALID_TABS)[number];

/** Get the initial tab value from URL query parameter */
function getInitialTabFromQuery(searchParams: URLSearchParams): ValidTab {
  const tabParam = searchParams.get('tab');
  if (tabParam && VALID_TABS.includes(tabParam as ValidTab)) {
    return tabParam as ValidTab;
  }
  return 'tasks';
}

/** Skeleton loading component for the story header */
function HeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-4" data-testid="story-header-skeleton">
      <div className="h-8 w-64 bg-bg-light rounded" />
      <div className="flex items-center gap-4">
        <div className="h-6 w-24 bg-bg-light rounded-full" />
        <div className="h-4 w-32 bg-bg-light rounded" />
      </div>
    </div>
  );
}

/** Skeleton loading component for content sections */
function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4" data-testid="story-content-skeleton">
      <div className="h-6 w-48 bg-bg-light rounded" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-bg-light rounded" />
        <div className="h-4 w-3/4 bg-bg-light rounded" />
        <div className="h-4 w-5/6 bg-bg-light rounded" />
      </div>
    </div>
  );
}

/** Status badge with appropriate color based on story status */
function StatusBadge({ status }: { status: StoryStatus }) {
  const variants: Record<StoryStatus, string> = {
    pending: 'bg-text-muted/20 text-text-muted',
    inProgress: 'bg-primary/20 text-primary',
    completed: 'bg-success/20 text-success',
  };

  const labels: Record<StoryStatus, string> = {
    pending: 'Pending',
    inProgress: 'In Progress',
    completed: 'Completed',
  };

  return <Badge className={variants[status]}>{labels[status]}</Badge>;
}

/** Task status icon (visual only, not interactive) */
function TaskStatusIcon({ status }: { status: TaskStatus }) {
  const iconProps = { className: 'w-5 h-5 pointer-events-none cursor-default' };

  switch (status) {
    case 'completed':
      return (
        <CheckCircle
          {...iconProps}
          className={`${iconProps.className} text-success`}
          data-testid="icon-check-circle"
        />
      );
    case 'inProgress':
      return (
        <Circle
          {...iconProps}
          className={`${iconProps.className} text-primary fill-primary/20`}
          data-testid="icon-circle-in-progress"
        />
      );
    default:
      return (
        <Circle
          {...iconProps}
          className={`${iconProps.className} text-text-muted`}
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
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-bg-light/50">
      <TaskStatusIcon status={task.status} />
      <span className={task.status === 'completed' ? 'text-text-muted line-through' : 'text-text'}>
        {task.subject}
      </span>
      <Badge className={`ml-auto text-xs ${badgeClass}`}>{taskStatusLabels[task.status]}</Badge>
    </div>
  );
}

/** Get color/style for journal entry type */
function getEntryTypeStyle(type: JournalEntryType): {
  bg: string;
  text: string;
  border: string;
} {
  switch (type) {
    case 'blocker':
      return {
        bg: 'bg-danger/10',
        text: 'text-danger',
        border: 'border-danger/30',
      };
    case 'resolution':
      return {
        bg: 'bg-success/10',
        text: 'text-success',
        border: 'border-success/30',
      };
    default:
      return {
        bg: 'bg-bg-light',
        text: 'text-text',
        border: 'border-border-muted',
      };
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
      <Card className={`${style.bg} border ${style.border}`}>
        <CollapsibleTrigger asChild={true}>
          <CardHeader className="cursor-pointer hover:bg-bg-light/50 transition-colors py-3">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-text-muted" data-testid="icon-chevron-down" />
              ) : (
                <ChevronRight
                  className="w-4 h-4 text-text-muted"
                  data-testid="icon-chevron-right"
                />
              )}
              <Badge className={`${style.bg} ${style.text} border ${style.border}`}>
                {entry.type}
              </Badge>
              <CardTitle className={`text-sm font-medium ${style.text}`}>{entry.title}</CardTitle>
              {entry.type === 'blocker' && (
                <AlertCircle
                  className="w-4 h-4 text-danger ml-auto"
                  data-testid="icon-alert-circle"
                />
              )}
              {entry.timestamp && (
                <span className="text-xs text-text-muted ml-auto">{entry.timestamp}</span>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="prose prose-sm prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-text-muted font-mono bg-bg-dark p-3 rounded-md overflow-x-auto">
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
function StoryNotFoundState({ storyId }: { storyId: string }) {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-text mb-2">Story not found</h1>
      <p className="text-text-muted mb-4">The story &quot;{storyId}&quot; does not exist.</p>
      <Link to="/" className="text-primary hover:underline">
        ← Back to epics
      </Link>
    </div>
  );
}

/** Story error state */
function StoryErrorState({ error }: { error: string }) {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-danger mb-2">Error</h1>
      <p className="text-text-muted mb-4">{error}</p>
      <Link to="/" className="text-primary hover:underline">
        ← Back to epics
      </Link>
    </div>
  );
}

/** Story loading state */
function StoryLoadingState() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <ContentSkeleton />
    </div>
  );
}

/** Story header with title and status */
function StoryHeader({ story, storyId }: { story: StoryDetailType; storyId: string }) {
  const taskProgress = calculateTaskProgress(story);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        {story.epic && (
          <>
            <Link to={`/epic/${story.epic}`} className="hover:text-primary">
              {story.epic}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-text">{storyId}</span>
      </div>
      <h1 className="text-2xl font-bold text-text">{story.title}</h1>
      <div className="flex items-center gap-4">
        <StatusBadge status={story.status} />
        <span className="text-sm text-text-muted">
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
        <CardTitle className="text-lg">Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-text-muted text-center py-4">No tasks defined for this story.</p>
        ) : (
          <div className="divide-y divide-border-muted">
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
        <CardTitle className="text-lg">Story Content</CardTitle>
      </CardHeader>
      <CardContent>
        {content ? (
          <div className="prose prose-sm prose-invert max-w-none prose-headings:text-text prose-p:text-text-muted prose-strong:text-text prose-code:text-primary prose-code:bg-bg-dark prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-bg-dark prose-pre:border prose-pre:border-border-muted prose-a:text-primary prose-a:no-underline prose-a:hover:underline prose-li:text-text-muted prose-table:border prose-table:border-border-muted prose-th:bg-bg-dark prose-th:px-3 prose-th:py-2 prose-th:text-text prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-border-muted">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-text-muted text-center py-4">No story content available.</p>
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
    <div className="space-y-3">
      <h3 className={`text-sm font-semibold ${colorClass} flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
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
        <CardContent className="py-8">
          <p className="text-text-muted text-center">No journal entries yet.</p>
        </CardContent>
      </Card>
    );
  }

  const { blockers, sessions, resolutions } = groupJournalEntries(journal);

  return (
    <div className="space-y-4">
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

/** Handle the fetch result and update state accordingly */
function applyFetchResult(
  result: FetchResult,
  setNotFound: (v: boolean) => void,
  setError: (v: string | null) => void,
  setCurrentStory: (data: unknown) => void,
): void {
  if (result.type === 'notFound') {
    setNotFound(true);
  } else if (result.type === 'error') {
    setError('Failed to load story');
  } else {
    setCurrentStory(result.data);
  }
}

/** Effect hook to subscribe to story updates via WebSocket */
function useStorySubscription(
  storyId: string | undefined,
  hasId: boolean,
  isConnected: boolean,
  subscribeToStory: (storyId: string) => void,
  unsubscribeFromStory: (storyId: string) => void,
) {
  useEffect(() => {
    if (!(hasId && isConnected)) {
      return;
    }

    subscribeToStory(storyId as string);

    return () => {
      unsubscribeFromStory(storyId as string);
    };
  }, [storyId, hasId, isConnected, subscribeToStory, unsubscribeFromStory]);
}

/** Custom hook for fetching story data */
function useStoryFetch(storyId: string | undefined) {
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
  const hasId = Boolean(storyId);

  // Fetch story data on mount
  useEffect(() => {
    if (!hasId) {
      return clearCurrentStory;
    }

    const fetchStory = async () => {
      setIsFetching(true);
      setNotFound(false);
      setError(null);

      try {
        const response = await fetch(`/api/stories/${storyId}`);
        const result = await processFetchResponse(response);
        applyFetchResult(result, setNotFound, setError, setCurrentStory);
      } catch (err) {
        handleFetchError(`/api/stories/${storyId}`, err, setError);
      } finally {
        setIsFetching(false);
      }
    };

    fetchStory();

    return clearCurrentStory;
  }, [storyId, hasId, setCurrentStory, clearCurrentStory]);

  // Subscribe to story updates when WebSocket is connected
  useStorySubscription(storyId, hasId, isConnected, subscribeToStory, unsubscribeFromStory);

  return { currentStory, loading: isFetching, notFound, error };
}

function StoryDetail() {
  const { storyId } = useParams<{
    storyId: string;
  }>();
  const [searchParams] = useSearchParams();
  const { currentStory, loading, notFound, error } = useStoryFetch(storyId);
  const initialTab = getInitialTabFromQuery(searchParams);

  if (notFound) {
    return <StoryNotFoundState storyId={storyId ?? ''} />;
  }
  if (error && !loading) {
    return <StoryErrorState error={error} />;
  }
  if (loading || !currentStory) {
    return <StoryLoadingState />;
  }

  const { blockers } = groupJournalEntries(currentStory.journal ?? []);

  return (
    <div className="space-y-6">
      <StoryHeader story={currentStory} storyId={storyId ?? ''} />
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">
            Journal
            {blockers.length > 0 && (
              <Badge className="ml-2 bg-danger/20 text-danger text-xs">{blockers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="space-y-4">
          <TasksTabContent tasks={currentStory.tasks} />
        </TabsContent>
        <TabsContent value="content" className="space-y-4">
          <ContentTabContent content={currentStory.description} />
        </TabsContent>
        <TabsContent value="journal" className="space-y-4">
          <JournalTabContent journal={currentStory.journal ?? []} />
        </TabsContent>
        <TabsContent value="sessions" className="space-y-4">
          <SessionsPanel storyId={storyId ?? ''} />
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
