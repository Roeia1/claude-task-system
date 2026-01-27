import { createActorContext } from '@xstate/react';
import { dashboardMachine } from '@/machines';

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
 */
export function useDashboard() {
  const actorRef = useDashboardActorRef();
  const state = useDashboardSelector((snapshot) => snapshot.value);
  const context = useDashboardSelector((snapshot) => snapshot.context);

  return {
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

    // Actions
    connect: () => actorRef.send({ type: 'CONNECT' }),
    disconnect: () => actorRef.send({ type: 'DISCONNECT' }),
    retry: () => actorRef.send({ type: 'RETRY' }),
    setEpics: (epics: typeof context.epics) =>
      actorRef.send({ type: 'EPICS_LOADED', epics }),
    setCurrentEpic: (epic: NonNullable<typeof context.currentEpic>) =>
      actorRef.send({ type: 'EPIC_LOADED', epic }),
    setCurrentStory: (story: NonNullable<typeof context.currentStory>) =>
      actorRef.send({ type: 'STORY_LOADED', story }),
    clearCurrentEpic: () => actorRef.send({ type: 'CLEAR_EPIC' }),
    clearCurrentStory: () => actorRef.send({ type: 'CLEAR_STORY' }),

    // Actor ref for advanced usage
    actorRef,
  };
}

export default DashboardContext;
