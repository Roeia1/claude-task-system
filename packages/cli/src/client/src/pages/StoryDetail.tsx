import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboard } from '@/context/DashboardContext';
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
export function HeaderSkeleton() {
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
export function ContentSkeleton() {
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
export function StatusBadge({ status }: { status: StoryStatus }) {
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

/** Task status icon (visual only, not interactive) */
export function TaskStatusIcon({ status }: { status: TaskStatus }) {
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
    case 'in_progress':
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

/** Get badge class based on task status */
function getTaskBadgeClass(status: TaskStatus): string {
  if (status === 'completed') {
    return 'bg-success/20 text-success';
  }
  if (status === 'in_progress') {
    return 'bg-primary/20 text-primary';
  }
  return 'bg-text-muted/20 text-text-muted';
}

/** Single task item display */
export function TaskItem({ task }: { task: StoryDetailType['tasks'][0] }) {
  const badgeClass = getTaskBadgeClass(task.status);

  return (
    <div class="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-bg-light/50">
      <TaskStatusIcon status={task.status} />
      <span class={task.status === 'completed' ? 'text-text-muted line-through' : 'text-text'}>
        {task.title}
      </span>
      <Badge class={`ml-auto text-xs ${badgeClass}`}>{task.status.replace('_', ' ')}</Badge>
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
export function JournalEntryItem({
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

export function StoryDetail() {
  const { epicSlug, storySlug } = useParams<{
    epicSlug: string;
    storySlug: string;
  }>();
  const {
    currentStory,
    setCurrentStory,
    clearCurrentStory,
    isLoading,
    subscribeToStory,
    unsubscribeFromStory,
  } = useDashboard();
  const [isFetching, setIsFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStory = async () => {
      if (!(epicSlug && storySlug)) {
        return;
      }

      setIsFetching(true);
      setNotFound(false);
      setError(null);

      try {
        const response = await fetch(`/api/stories/${epicSlug}/${storySlug}`);
        if (response.status === HTTP_NOT_FOUND) {
          setNotFound(true);
          return;
        }
        if (!response.ok) {
          setError('Failed to load story');
          return;
        }
        const data: StoryDetailType = await response.json();
        setCurrentStory(data);
      } catch (err) {
        setError('Failed to load story');
        const message = err instanceof Error ? err.message : 'Unknown error';
        showApiErrorToast(`/api/stories/${epicSlug}/${storySlug}`, message);
      } finally {
        setIsFetching(false);
      }
    };

    fetchStory();

    // Subscribe to real-time story updates
    if (epicSlug && storySlug) {
      subscribeToStory(epicSlug, storySlug);
    }

    return () => {
      clearCurrentStory();
      if (epicSlug && storySlug) {
        unsubscribeFromStory(epicSlug, storySlug);
      }
    };
  }, [
    epicSlug,
    storySlug,
    setCurrentStory,
    clearCurrentStory,
    subscribeToStory,
    unsubscribeFromStory,
  ]);

  const loading = isLoading || isFetching;

  // Calculate task progress
  const taskProgress = currentStory
    ? {
        completed: currentStory.tasks.filter((t) => t.status === 'completed').length,
        total: currentStory.tasks.length,
      }
    : { completed: 0, total: 0 };

  // Group journal entries by type
  const blockerEntries = currentStory?.journal.filter((e) => e.type === 'blocker') || [];
  const sessionEntries = currentStory?.journal.filter((e) => e.type === 'session') || [];
  const resolutionEntries = currentStory?.journal.filter((e) => e.type === 'resolution') || [];

  // 404 state
  if (notFound) {
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

  // Error state
  if (error && !loading) {
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

  // Loading state
  if (loading || !currentStory) {
    return (
      <div class="space-y-6">
        <HeaderSkeleton />
        <ContentSkeleton />
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* Story header */}
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm text-text-muted">
          <Link to={`/epic/${epicSlug}`} class="hover:text-primary">
            {epicSlug}
          </Link>
          <span>/</span>
          <span class="text-text">{storySlug}</span>
        </div>
        <h1 class="text-2xl font-bold text-text">{currentStory.title}</h1>
        <div class="flex items-center gap-4">
          <StatusBadge status={currentStory.status} />
          <span class="text-sm text-text-muted">
            {taskProgress.completed}/{taskProgress.total} tasks completed
          </span>
        </div>
      </div>

      {/* Tabs for Story Content and Journal */}
      <Tabs defaultValue="tasks" class="w-full">
        <TabsList class="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">
            Journal
            {blockerEntries.length > 0 && (
              <Badge class="ml-2 bg-danger/20 text-danger text-xs">{blockerEntries.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tasks tab */}
        <TabsContent value="tasks" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStory.tasks.length === 0 ? (
                <p class="text-text-muted text-center py-4">No tasks defined for this story.</p>
              ) : (
                <div class="divide-y divide-border-muted">
                  {currentStory.tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Story Content tab */}
        <TabsContent value="content" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Story Content</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStory.content ? (
                <div class="prose prose-sm prose-invert max-w-none prose-headings:text-text prose-p:text-text-muted prose-strong:text-text prose-code:text-primary prose-code:bg-bg-dark prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-bg-dark prose-pre:border prose-pre:border-border-muted prose-a:text-primary prose-a:no-underline prose-a:hover:underline prose-li:text-text-muted prose-table:border prose-table:border-border-muted prose-th:bg-bg-dark prose-th:px-3 prose-th:py-2 prose-th:text-text prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-border-muted">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentStory.content}</ReactMarkdown>
                </div>
              ) : (
                <p class="text-text-muted text-center py-4">No story content available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal tab */}
        <TabsContent value="journal" class="space-y-4">
          {currentStory.journal.length === 0 ? (
            <Card>
              <CardContent class="py-8">
                <p class="text-text-muted text-center">No journal entries yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div class="space-y-4">
              {/* Blockers section - highlighted prominently */}
              {blockerEntries.length > 0 && (
                <div class="space-y-3">
                  <h3 class="text-sm font-semibold text-danger flex items-center gap-2">
                    <AlertCircle class="w-4 h-4" />
                    Blockers ({blockerEntries.length})
                  </h3>
                  {blockerEntries.map((entry) => (
                    <JournalEntryItem
                      key={`blocker-${entry.title}-${entry.timestamp ?? ''}`}
                      entry={entry}
                      defaultOpen={true}
                    />
                  ))}
                </div>
              )}

              {/* Resolutions section */}
              {resolutionEntries.length > 0 && (
                <div class="space-y-3">
                  <h3 class="text-sm font-semibold text-success flex items-center gap-2">
                    <CheckCircle class="w-4 h-4" />
                    Resolutions ({resolutionEntries.length})
                  </h3>
                  {resolutionEntries.map((entry) => (
                    <JournalEntryItem
                      key={`resolution-${entry.title}-${entry.timestamp ?? ''}`}
                      entry={entry}
                      defaultOpen={false}
                    />
                  ))}
                </div>
              )}

              {/* Sessions section */}
              {sessionEntries.length > 0 && (
                <div class="space-y-3">
                  <h3 class="text-sm font-semibold text-text flex items-center gap-2">
                    Sessions ({sessionEntries.length})
                  </h3>
                  {sessionEntries.map((entry) => (
                    <JournalEntryItem
                      key={`session-${entry.title}-${entry.timestamp ?? ''}`}
                      entry={entry}
                      defaultOpen={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
