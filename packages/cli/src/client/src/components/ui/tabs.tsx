import {
  Content as TabsPrimitiveContent,
  List as TabsPrimitiveList,
  Root as TabsPrimitiveRoot,
  Trigger as TabsPrimitiveTrigger,
} from '@radix-ui/react-tabs';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react';

import { cn } from '@/lib/utils';

const Tabs = forwardRef<
  ElementRef<typeof TabsPrimitiveRoot>,
  ComponentPropsWithoutRef<typeof TabsPrimitiveRoot>
>(({ ...props }, ref) => <TabsPrimitiveRoot ref={ref} {...props} />);
Tabs.displayName = 'Tabs';

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitiveList>,
  ComponentPropsWithoutRef<typeof TabsPrimitiveList>
>(({ className, ...props }, ref) => (
  <TabsPrimitiveList
    ref={ref}
    class={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitiveTrigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitiveTrigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitiveTrigger
    ref={ref}
    class={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitiveContent>,
  ComponentPropsWithoutRef<typeof TabsPrimitiveContent>
>(({ className, ...props }, ref) => (
  <TabsPrimitiveContent
    ref={ref}
    class={cn(
      'mt-2 ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
