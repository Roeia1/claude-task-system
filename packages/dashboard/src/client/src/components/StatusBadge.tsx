import { Badge } from '@/components/ui/badge';
import type { StoryStatus } from '@/types/dashboard';

/** Color variants for each status type */
const statusVariants: Record<StoryStatus, string> = {
  pending: 'bg-text-muted/20 text-text-muted',
  inProgress: 'bg-primary/20 text-primary',
  completed: 'bg-success/20 text-success',
};

/** Human-readable labels for each status type */
const statusLabels: Record<StoryStatus, string> = {
  pending: 'Pending',
  inProgress: 'In Progress',
  completed: 'Completed',
};

/** Status badge with appropriate color based on story status */
export function StatusBadge({ status }: { status: StoryStatus }) {
  return <Badge className={statusVariants[status]}>{statusLabels[status]}</Badge>;
}

/** Status badge with count - used in EpicList to show story counts per status */
export function StatusBadgeWithCount({ status, count }: { status: StoryStatus; count: number }) {
  return (
    <Badge className={statusVariants[status]}>
      {statusLabels[status]}: {count}
    </Badge>
  );
}
