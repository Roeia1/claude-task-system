/**
 * StoryCard component for the Kanban board
 *
 * Displays a collapsible story card with:
 * - Collapsed: title, epic badge, progress bar, session indicator
 * - Expanded: full description (markdown), task list, session info, "Open story" link
 */
import { useState } from 'react';
import { Link } from 'react-router';
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
import type { StoryDetail, Task } from '@/types/dashboard';

/** Full percentage for progress calculation */
const FULL_PERCENTAGE = 100;

function topoSort(tasks: Task[]): Task[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const result: Task[] = [];

  function visit(task: Task) {
    if (visited.has(task.id)) {
      return;
    }
    visited.add(task.id);
    for (const depId of task.blockedBy) {
      const dep = taskMap.get(depId);
      if (dep) {
        visit(dep);
      }
    }
    result.push(task);
  }

  for (const task of tasks) {
    visit(task);
  }
  return result;
}

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
            {/* Task list */}
            {story.tasks.length > 0 && (
              <div className="mb-3">
                <div className="mb-1 flex items-center text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <span className="flex-1">Tasks</span>
                  {story.tasks.some((t) => t.blockedBy.length > 0) && (
                    <span className="shrink-0">Deps</span>
                  )}
                </div>
                {(() => {
                  const sorted = topoSort(story.tasks);
                  const indexMap = new Map(sorted.map((t, i) => [t.id, i + 1]));
                  return sorted.map((task, index) => {
                    const deps = task.blockedBy.map((id) => indexMap.get(id)).filter(Boolean);
                    return (
                      <div key={task.id} className="flex items-start gap-2 text-sm">
                        <TaskStatusIcon status={task.status} />
                        <span className="shrink-0 w-4 text-text-muted">{index + 1}.</span>
                        <span
                          className={`flex-1 ${task.status === 'completed' ? 'text-text-muted' : 'text-text'}`}
                        >
                          {task.subject}
                        </span>
                        {deps.length > 0 && (
                          <span className="shrink-0 text-xs text-text-muted">
                            {deps.join(', ')}
                          </span>
                        )}
                      </div>
                    );
                  });
                })()}
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
