/**
 * StoryCard component for the Kanban board
 *
 * Displays a collapsible story card with:
 * - Collapsed: title, epic badge, progress bar, session indicator
 * - Expanded: full description (markdown), task list, session info, "Open story" link
 */
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge.tsx';
import { Card } from '@/components/ui/card.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import type { StoryDetail } from '@/types/dashboard';

/** Full percentage for progress calculation */
const FULL_PERCENTAGE = 100;

interface StoryCardProps {
  story: StoryDetail;
  isSessionRunning: boolean;
  sessionInfo?: string;
}

/**
 * Task status icon component
 */
function TaskStatusIcon({ status }: { status: string }) {
  if (status === 'completed') {
    return <span className="text-success">✓</span>;
  }
  if (status === 'inProgress') {
    return <span className="text-warning">●</span>;
  }
  return <span className="text-text-muted">○</span>;
}

function StoryCard({ story, isSessionRunning, sessionInfo }: StoryCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const completedTasks = story.tasks.filter((t) => t.status === 'completed').length;
  const totalTasks = story.tasks.length;
  const progressValue = totalTasks > 0 ? (completedTasks / totalTasks) * FULL_PERCENTAGE : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card
        data-testid={`story-card-${story.id}`}
        className={`transition-all ${isSessionRunning ? 'animate-glow' : ''}`}
      >
        <CollapsibleTrigger
          data-testid={`story-card-trigger-${story.id}`}
          className="w-full cursor-pointer p-3 text-left"
        >
          <div className="flex items-center gap-2">
            {/* Chevron */}
            <span className="text-text-muted shrink-0 text-xs">{isOpen ? '▼' : '▶'}</span>

            {/* Title + session indicator */}
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
              {story.title}
            </span>

            {isSessionRunning && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild={true}>
                    <span
                      data-testid="running-indicator"
                      className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-success"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{sessionInfo || 'Session running'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Epic badge */}
          {story.epicName && (
            <div className="mt-1 ml-5">
              <Badge data-testid="epic-badge" variant="secondary" className="text-xs">
                {story.epicName}
              </Badge>
            </div>
          )}

          {/* Compact progress */}
          {totalTasks > 0 && (
            <div className="mt-2 ml-5 flex items-center gap-2">
              <Progress value={progressValue} className="h-1.5 flex-1" />
              <span className="shrink-0 text-xs text-text-muted">
                {completedTasks}/{totalTasks}
              </span>
            </div>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent data-testid={`story-card-content-${story.id}`}>
          <div className="border-t border-text-muted/20 px-3 pb-3 pt-2">
            {/* Full description */}
            {story.description && (
              <div className="prose prose-sm prose-invert max-w-none mb-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{story.description}</ReactMarkdown>
              </div>
            )}

            {/* Task list */}
            {story.tasks.length > 0 && (
              <div className="mb-3 space-y-1">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                  Tasks
                </h4>
                {story.tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2 text-sm">
                    <TaskStatusIcon status={task.status} />
                    <span
                      className={
                        task.status === 'completed' ? 'text-text-muted line-through' : 'text-text'
                      }
                    >
                      {task.subject}
                    </span>
                    {task.blockedBy.length > 0 && (
                      <span className="text-xs text-danger">
                        (blocked by {task.blockedBy.join(', ')})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Progress bar */}
            {totalTasks > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <Progress value={progressValue} className="h-2 flex-1" />
                <span className="text-xs text-text-muted">
                  {completedTasks}/{totalTasks} tasks done
                </span>
              </div>
            )}

            {/* Session indicator */}
            {isSessionRunning && (
              <div className="mb-3 flex items-center gap-2 text-xs text-success">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
                Session running
              </div>
            )}

            {/* Open story link */}
            <Link to={`/story/${story.id}`} className="text-sm text-primary hover:underline">
              Open story →
            </Link>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export { StoryCard };
