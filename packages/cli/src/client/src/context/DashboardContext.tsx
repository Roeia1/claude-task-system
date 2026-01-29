import { useCallback, useMemo } from 'react';
import { createActorContext } from '@xstate/react';
import { dashboardMachine } from '@/machines';
import type { EpicSummary, Epic, StoryDetail } from '@/types/dashboard';

/**
 * Dashboard context using XState's createActorContext
 * Provides access to the dashboard state machine throughout the app
 */
const DashboardContext = createActorContext(dashboardMachine);

/**
 * Provider component that wraps the app with dashboard state
 */
export const DashboardProvider = DashboardContext.Provider;

/**
 * Hook to access the dashboard actor ref
 * Use this to send events to the machine
 */
export const useDashboardActorRef = DashboardContext.useActorRef;

/**
 * Hook to select state from the dashboard machine
 * Use this to read state values with optimal re-rendering
 */
export const useDashboardSelector = DashboardContext.useSelector;

/**
 * Convenience hook that provides common dashboard state and actions
 * Actions are memoized to prevent infinite loops in useEffect dependencies
 */
export function useDashboard() {
  const actorRef = useDashboardActorRef();
  const state = useDashboardSelector((snapshot) => snapshot.value);
  const context = useDashboardSelector((snapshot) => snapshot.context);

  // Memoize action functions to prevent infinite loops in useEffect
  const connect = useCallback(() => actorRef.send({ type: 'CONNECT' }), [actorRef]);
  const disconnect = useCallback(() => actorRef.send({ type: 'DISCONNECT' }), [actorRef]);
  const retry = useCallback(() => actorRef.send({ type: 'RETRY' }), [actorRef]);

  const setEpics = useCallback(
    (epics: EpicSummary[]) => actorRef.send({ type: 'EPICS_LOADED', epics }),
    [actorRef]
  );

  const setCurrentEpic = useCallback(
    (epic: Epic) => actorRef.send({ type: 'EPIC_LOADED', epic }),
    [actorRef]
  );

  const setCurrentStory = useCallback(
    (story: StoryDetail) => actorRef.send({ type: 'STORY_LOADED', story }),
    [actorRef]
  );

  const clearCurrentEpic = useCallback(
    () => actorRef.send({ type: 'CLEAR_EPIC' }),
    [actorRef]
  );

  const clearCurrentStory = useCallback(
    () => actorRef.send({ type: 'CLEAR_STORY' }),
    [actorRef]
  );

  const subscribeToStory = useCallback(
    (epicSlug: string, storySlug: string) =>
      actorRef.send({ type: 'SUBSCRIBE_STORY', epicSlug, storySlug }),
    [actorRef]
  );

  const unsubscribeFromStory = useCallback(
    (epicSlug: string, storySlug: string) =>
      actorRef.send({ type: 'UNSUBSCRIBE_STORY', epicSlug, storySlug }),
    [actorRef]
  );

  // Memoize the returned object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      // Current state
      state,
      isIdle: state === 'idle',
      isLoading: state === 'loading',
      isConnected: state === 'connected',
      isReconnecting: state === 'reconnecting',
      isError: state === 'error',

      // Context data
      epics: context.epics,
      currentEpic: context.currentEpic,
      currentStory: context.currentStory,
      error: context.error,
      retryCount: context.retryCount,
      subscribedStories: context.subscribedStories,

      // Actions (memoized)
      connect,
      disconnect,
      retry,
      setEpics,
      setCurrentEpic,
      setCurrentStory,
      clearCurrentEpic,
      clearCurrentStory,
      subscribeToStory,
      unsubscribeFromStory,

      // Actor ref for advanced usage
      actorRef,
    }),
    [
      state,
      context.epics,
      context.currentEpic,
      context.currentStory,
      context.error,
      context.retryCount,
      context.subscribedStories,
      connect,
      disconnect,
      retry,
      setEpics,
      setCurrentEpic,
      setCurrentStory,
      clearCurrentEpic,
      clearCurrentStory,
      subscribeToStory,
      unsubscribeFromStory,
      actorRef,
    ]
  );
}

export default DashboardContext;
