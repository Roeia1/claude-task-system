import { useEffect, useRef } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { showConnectionErrorToast, showReconnectingToast } from '@/lib/toast-utils';

/**
 * Hook that displays toast notifications for dashboard state changes
 * (WebSocket connection errors, reconnection attempts, etc.)
 *
 * Should be called once at the app root level (in Layout component)
 */
export function useDashboardToasts() {
  const { isError, isReconnecting, error, retryCount, retry } = useDashboard();

  // Track previous state to avoid duplicate toasts
  const prevIsError = useRef(false);
  const prevIsReconnecting = useRef(false);

  // Show error toast when entering error state
  useEffect(() => {
    if (isError && !prevIsError.current) {
      showConnectionErrorToast(error || 'Connection to server failed', retry);
    }
    prevIsError.current = isError;
  }, [isError, error, retry]);

  // Show reconnecting toast when entering reconnecting state
  useEffect(() => {
    if (isReconnecting && !prevIsReconnecting.current) {
      showReconnectingToast(retryCount);
    }
    prevIsReconnecting.current = isReconnecting;
  }, [isReconnecting, retryCount]);
}
