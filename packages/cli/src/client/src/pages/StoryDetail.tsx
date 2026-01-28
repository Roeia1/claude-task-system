import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDashboard } from '@/context/DashboardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { showApiErrorToast } from '@/lib/toast-utils';
import type { StoryDetail as StoryDetailType, StoryStatus, TaskStatus, JournalEntry, JournalEntryType } from '@/types/dashboard';
import { ChevronDown, ChevronRight, CheckCircle, Circle, AlertCircle } from 'lucide-react';

/** Skeleton loading component for the story header */
export function HeaderSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-64 bg-bg-light rounded" />
      <div className="flex items-center gap-4">
        <div className="h-6 w-24 bg-bg-light rounded-full" />
        <div className="h-4 w-32 bg-bg-light rounded" />
      </div>
    </div>
  );
}

/** Skeleton loading component for content sections */
export function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
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
export function StatusBadge({ status }: { status: StoryStatus }) {
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

/** Task status icon (visual only, not interactive) */
export function TaskStatusIcon({ status }: { status: TaskStatus }) {
  const iconProps = { className: 'w-5 h-5 pointer-events-none cursor-default' };

  switch (status) {
    case 'completed':
      return <CheckCircle {...iconProps} className={`${iconProps.className} text-success`} />;
    case 'in_progress':
      return <Circle {...iconProps} className={`${iconProps.className} text-primary fill-primary/20`} />;
    case 'pending':
    default:
      return <Circle {...iconProps} className={`${iconProps.className} text-text-muted`} />;
  }
}

/** Single task item display */
export function TaskItem({ task }: { task: StoryDetailType['tasks'][0] }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-bg-light/50">
      <TaskStatusIcon status={task.status} />
      <span className={task.status === 'completed' ? 'text-text-muted line-through' : 'text-text'}>
        {task.title}
      </span>
      <Badge
        className={`ml-auto text-xs ${
          task.status === 'completed'
            ? 'bg-success/20 text-success'
            : task.status === 'in_progress'
            ? 'bg-primary/20 text-primary'
            : 'bg-text-muted/20 text-text-muted'
        }`}
      >
        {task.status.replace('_', ' ')}
      </Badge>
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
    case 'session':
    default:
      return { bg: 'bg-bg-light', text: 'text-text', border: 'border-border-muted' };
  }
}

/** Single journal entry with collapsible content */
export function JournalEntryItem({ entry, defaultOpen = false }: { entry: JournalEntry; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const style = getEntryTypeStyle(entry.type);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`${style.bg} border ${style.border}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-bg-light/50 transition-colors py-3">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
              <Badge className={`${style.bg} ${style.text} border ${style.border}`}>
                {entry.type}
              </Badge>
              <CardTitle className={`text-sm font-medium ${style.text}`}>
                {entry.title}
              </CardTitle>
              {entry.type === 'blocker' && (
                <AlertCircle className="w-4 h-4 text-danger ml-auto" />
              )}
              {entry.timestamp && (
                <span className="text-xs text-text-muted ml-auto">
                  {entry.timestamp}
                </span>
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
      if (!epicSlug || !storySlug) return;

      setIsFetching(true);
      setNotFound(false);
      setError(null);

      try {
        const response = await fetch(`/api/stories/${epicSlug}/${storySlug}`);
        if (response.status === 404) {
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
  }, [epicSlug, storySlug, setCurrentStory, clearCurrentStory, subscribeToStory, unsubscribeFromStory]);

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
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-text mb-2">Story not found</h1>
        <p className="text-text-muted mb-4">
          The story &quot;{storySlug}&quot; does not exist in epic &quot;{epicSlug}&quot;.
        </p>
        <Link to={`/epic/${epicSlug}`} className="text-primary hover:underline">
          ← Back to epic
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
        <Link to={`/epic/${epicSlug}`} className="text-primary hover:underline">
          ← Back to epic
        </Link>
      </div>
    );
  }

  // Loading state
  if (loading || !currentStory) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <ContentSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Story header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Link to={`/epic/${epicSlug}`} className="hover:text-primary">
            {epicSlug}
          </Link>
          <span>/</span>
          <span className="text-text">{storySlug}</span>
        </div>
        <h1 className="text-2xl font-bold text-text">{currentStory.title}</h1>
        <div className="flex items-center gap-4">
          <StatusBadge status={currentStory.status} />
          <span className="text-sm text-text-muted">
            {taskProgress.completed}/{taskProgress.total} tasks completed
          </span>
        </div>
      </div>

      {/* Tabs for Story Content and Journal */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">
            Journal
            {blockerEntries.length > 0 && (
              <Badge className="ml-2 bg-danger/20 text-danger text-xs">
                {blockerEntries.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tasks tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStory.tasks.length === 0 ? (
                <p className="text-text-muted text-center py-4">No tasks defined for this story.</p>
              ) : (
                <div className="divide-y divide-border-muted">
                  {currentStory.tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Story Content tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Story Content</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStory.content ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-text font-mono bg-bg-dark p-4 rounded-md overflow-x-auto">
                    {currentStory.content}
                  </pre>
                </div>
              ) : (
                <p className="text-text-muted text-center py-4">No story content available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal tab */}
        <TabsContent value="journal" className="space-y-4">
          {currentStory.journal.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-text-muted text-center">No journal entries yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Blockers section - highlighted prominently */}
              {blockerEntries.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-danger flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Blockers ({blockerEntries.length})
                  </h3>
                  {blockerEntries.map((entry, index) => (
                    <JournalEntryItem
                      key={`blocker-${index}`}
                      entry={entry}
                      defaultOpen={true}
                    />
                  ))}
                </div>
              )}

              {/* Resolutions section */}
              {resolutionEntries.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-success flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Resolutions ({resolutionEntries.length})
                  </h3>
                  {resolutionEntries.map((entry, index) => (
                    <JournalEntryItem
                      key={`resolution-${index}`}
                      entry={entry}
                      defaultOpen={false}
                    />
                  ))}
                </div>
              )}

              {/* Sessions section */}
              {sessionEntries.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                    Sessions ({sessionEntries.length})
                  </h3>
                  {sessionEntries.map((entry, index) => (
                    <JournalEntryItem
                      key={`session-${index}`}
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

export default StoryDetail;
