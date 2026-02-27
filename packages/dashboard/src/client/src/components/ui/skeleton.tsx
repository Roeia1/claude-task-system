import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-bg-light', className)} {...props} />;
}

export { Skeleton };
