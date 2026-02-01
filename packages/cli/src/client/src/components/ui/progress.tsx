import { Indicator as ProgressIndicator, Root as ProgressRoot } from '@radix-ui/react-progress';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react';

import { cn } from '@/lib/utils';

/** Full progress percentage value */
const FULL_PROGRESS_PERCENTAGE = 100;

const Progress = forwardRef<
  ElementRef<typeof ProgressRoot>,
  ComponentPropsWithoutRef<typeof ProgressRoot>
>(({ className, value, ...props }, ref) => (
  <ProgressRoot
    ref={ref}
    className={cn('relative h-4 w-full overflow-hidden rounded-full bg-bg-light', className)}
    {...props}
  >
    <ProgressIndicator
      className="h-full w-full flex-1 bg-secondary transition-all"
      style={{ transform: `translateX(-${FULL_PROGRESS_PERCENTAGE - (value || 0)}%)` }}
    />
  </ProgressRoot>
));
Progress.displayName = 'Progress';

export { Progress };
