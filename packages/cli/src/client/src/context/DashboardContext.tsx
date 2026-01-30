import { createActorContext } from '@xstate/react';
import { useCallback, useMemo } from 'react';
import type { ActorRefFrom } from 'xstate';
import type { dashboardMachine } from '@/machines';
import { dashboardMachine as machine } from '@/machines';
import type { Epic, EpicSummary, StoryDetail } from '@/types/dashboard';

type DashboardActorRef = ActorRefFrom<typeof dashboardMachine>;

/**
 * Dashboard context using XState's createActorContext
 * Provides access to the dashboard state machine throughout the app
 */
const DashboardContext = createActorContext(machine);

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
 * Hook to create memoized connection actions
 */
function useConnectionActions(actorRef: DashboardActorRef) {
  const connect = useCallback(() => actorRef.send({ type: 'CONNECT' }), [actorRef]);
  const disconnect = useCallback(() => actorRef.send({ type: 'DISCONNECT' }), [actorRef]);
  const retry = useCallback(() => actorRef.send({ type: 'RETRY' }), [actorRef]);
  return { connect, disconnect, retry };
}

/**
 * Hook to create memoized data actions
 */
function useDataActions(actorRef: DashboardActorRef) {
  const setEpics = useCallback(
    (epics: EpicSummary[]) => actorRef.send({ type: 'EPICS_LOADED', epics }),
    [actorRef],
  );
  const setCurrentEpic = useCallback(
    (epic: Epic) => actorRef.send({ type: 'EPIC_LOADED', epic }),
    [actorRef],
  );
  const setCurrentStory = useCallback(
    (story: StoryDetail) => actorRef.send({ type: 'STORY_LOADED', story }),
    [actorRef],
  );
  const clearCurrentEpic = useCallback(() => actorRef.send({ type: 'CLEAR_EPIC' }), [actorRef]);
  const clearCurrentStory = useCallback(() => actorRef.send({ type: 'CLEAR_STORY' }), [actorRef]);
  return { setEpics, setCurrentEpic, setCurrentStory, clearCurrentEpic, clearCurrentStory };
}

/**
 * Hook to create memoized subscription actions
 */
function useSubscriptionActions(actorRef: DashboardActorRef) {
  const subscribeToStory = useCallback(
    (epicSlug: string, storySlug: string) =>
      actorRef.send({ type: 'SUBSCRIBE_STORY', epicSlug, storySlug }),
    [actorRef],
  );
  const unsubscribeFromStory = useCallback(
    (epicSlug: string, storySlug: string) =>
      actorRef.send({ type: 'UNSUBSCRIBE_STORY', epicSlug, storySlug }),
    [actorRef],
  );
  return { subscribeToStory, unsubscribeFromStory };
}

/**
 * Convenience hook that provides common dashboard state and actions
 * Actions are memoized to prevent infinite loops in useEffect dependencies
 */
export function useDashboard() {
  const actorRef = useDashboardActorRef();
  const state = useDashboardSelector((snapshot) => snapshot.value);
  const context = useDashboardSelector((snapshot) => snapshot.context);

  const connectionActions = useConnectionActions(actorRef);
  const dataActions = useDataActions(actorRef);
  const subscriptionActions = useSubscriptionActions(actorRef);

  return useMemo(
    () => ({
      state,
      isIdle: state === 'idle',
      isLoading: state === 'loading',
      isConnected: state === 'connected',
      isReconnecting: state === 'reconnecting',
      isError: state === 'error',
      epics: context.epics,
      currentEpic: context.currentEpic,
      currentStory: context.currentStory,
      error: context.error,
      retryCount: context.retryCount,
      subscribedStories: context.subscribedStories,
      ...connectionActions,
      ...dataActions,
      ...subscriptionActions,
      actorRef,
    }),
    [state, context, connectionActions, dataActions, subscriptionActions, actorRef],
  );
}
