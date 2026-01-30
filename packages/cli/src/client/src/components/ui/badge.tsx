import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';
import { badgeVariants } from './badge-variants';

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div class={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
export type { BadgeProps };
