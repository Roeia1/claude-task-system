/**
 * Session Polling Service
 *
 * Provides session discovery by polling tmux sessions at regular intervals.
 * Detects changes (new sessions, completed sessions, removed sessions) and
 * broadcasts updates to connected clients via a callback function.
 *
 * Usage:
 *   startSessionPolling((msg) => broadcastToClients(msg));
 *   // Later:
 *   stopSessionPolling();
 */

import {
  buildSessionInfo,
  type DetailedSessionInfo,
  getSessionStatus,
  listSessions,
} from './sessions.ts';

/**
 * Polling interval in milliseconds (3 seconds)
 */
const POLLING_INTERVAL_MS = 3000;

/**
 * Broadcast message type for session updates
 */
interface SessionsUpdatedMessage {
  type: 'sessions:updated';
  sessions: DetailedSessionInfo[];
}

// Module-level state
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let currentSessions: DetailedSessionInfo[] = [];
let isFirstPoll = true;

/**
 * Detect if there are any changes between current and new sessions
 */
function detectChanges(newSessions: DetailedSessionInfo[]): boolean {
  // First poll always broadcasts to establish baseline state
  if (isFirstPoll) {
    return true;
  }

  // Check for different number of sessions
  if (newSessions.length !== currentSessions.length) {
    return true;
  }

  // Create maps for quick lookup
  const newSessionMap = new Map<string, DetailedSessionInfo>();
  for (const session of newSessions) {
    newSessionMap.set(session.name, session);
  }

  const currentSessionMap = new Map<string, DetailedSessionInfo>();
  for (const session of currentSessions) {
    currentSessionMap.set(session.name, session);
  }

  // Check for new sessions or removed sessions
  for (const name of newSessionMap.keys()) {
    if (!currentSessionMap.has(name)) {
      return true; // New session
    }
  }

  for (const name of currentSessionMap.keys()) {
    if (!newSessionMap.has(name)) {
      return true; // Removed session
    }
  }

  // Check for status changes or output preview changes
  for (const [name, newSession] of newSessionMap) {
    const currentSession = currentSessionMap.get(name);
    if (currentSession) {
      if (currentSession.status !== newSession.status) {
        return true; // Status changed
      }
      if (currentSession.outputPreview !== newSession.outputPreview) {
        return true; // Output preview changed
      }
    }
  }

  return false;
}

/**
 * Build session info with error handling
 */
async function buildSessionInfoSafe(
  sessionName: string,
  status: 'running' | 'completed',
): Promise<DetailedSessionInfo | null> {
  try {
    return await buildSessionInfo(sessionName, status);
  } catch {
    // Skip sessions that fail to build
    return null;
  }
}

/**
 * Discover all SAGA sessions and build detailed info
 */
async function discoverSessions(): Promise<DetailedSessionInfo[]> {
  const rawSessions = listSessions();

  // Build session info for all sessions in parallel
  const sessionPromises = rawSessions.map((session) => {
    const statusResult = getSessionStatus(session.name);
    const status: 'running' | 'completed' = statusResult.running ? 'running' : 'completed';
    return buildSessionInfoSafe(session.name, status);
  });

  const results = await Promise.all(sessionPromises);
  const detailedSessions = results.filter((s): s is DetailedSessionInfo => s !== null);

  // Sort by startTime descending (newest first)
  detailedSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

  return detailedSessions;
}

/**
 * Poll for session changes and broadcast if anything changed
 */
async function pollSessions(broadcast: (msg: SessionsUpdatedMessage) => void): Promise<void> {
  try {
    const sessions = await discoverSessions();
    const hasChanges = detectChanges(sessions);

    if (hasChanges) {
      currentSessions = sessions;
      isFirstPoll = false;
      broadcast({
        type: 'sessions:updated',
        sessions,
      });
    }
  } catch {
    // Silently ignore polling errors to avoid spamming logs
  }
}

/**
 * Get the current list of sessions
 * Returns a copy to prevent external mutation
 */
export function getCurrentSessions(): DetailedSessionInfo[] {
  return [...currentSessions];
}

/**
 * Start polling for session changes
 *
 * @param broadcast - Callback function to broadcast session updates
 */
export function startSessionPolling(broadcast: (msg: SessionsUpdatedMessage) => void): void {
  // Stop any existing polling
  stopSessionPolling();

  // Perform initial poll immediately
  pollSessions(broadcast);

  // Set up interval for subsequent polls
  pollingInterval = setInterval(() => {
    pollSessions(broadcast);
  }, POLLING_INTERVAL_MS);
}

/**
 * Stop the polling service
 */
export function stopSessionPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  currentSessions = [];
  isFirstPoll = true;
}

export { POLLING_INTERVAL_MS };

export type { SessionsUpdatedMessage };
