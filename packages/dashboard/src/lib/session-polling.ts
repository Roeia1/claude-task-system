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
} from "./sessions.ts";

/**
 * Polling interval in milliseconds (3 seconds)
 */
const POLLING_INTERVAL_MS = 3000;

/**
 * Broadcast message type for session updates
 */
interface SessionsUpdatedMessage {
	type: "sessions:updated";
	data: DetailedSessionInfo[];
}

// Module-level state
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let currentSessions: DetailedSessionInfo[] = [];
let isFirstPoll = true;

/**
 * Create a map of sessions by name for quick lookup
 */
function createSessionMap(
	sessions: DetailedSessionInfo[],
): Map<string, DetailedSessionInfo> {
	return new Map(sessions.map((s) => [s.name, s]));
}

/**
 * Check if the set of session names has changed (added or removed sessions)
 */
function hasSessionSetChanged(
	newMap: Map<string, DetailedSessionInfo>,
	currentMap: Map<string, DetailedSessionInfo>,
): boolean {
	for (const name of newMap.keys()) {
		if (!currentMap.has(name)) {
			return true;
		}
	}
	for (const name of currentMap.keys()) {
		if (!newMap.has(name)) {
			return true;
		}
	}
	return false;
}

/**
 * Check if any session's status or output has changed
 */
function hasSessionPropertiesChanged(
	newMap: Map<string, DetailedSessionInfo>,
	currentMap: Map<string, DetailedSessionInfo>,
): boolean {
	for (const [name, newSession] of newMap) {
		const currentSession = currentMap.get(name);
		if (!currentSession) {
			continue;
		}
		if (currentSession.status !== newSession.status) {
			return true;
		}
		if (currentSession.outputPreview !== newSession.outputPreview) {
			return true;
		}
	}
	return false;
}

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

	const newSessionMap = createSessionMap(newSessions);
	const currentSessionMap = createSessionMap(currentSessions);

	// Check for session set changes (added/removed)
	if (hasSessionSetChanged(newSessionMap, currentSessionMap)) {
		return true;
	}

	// Check for property changes (status/output)
	return hasSessionPropertiesChanged(newSessionMap, currentSessionMap);
}

/**
 * Build session info with error handling
 */
async function buildSessionInfoSafe(
	sessionName: string,
	status: "running" | "completed",
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
		const status: "running" | "completed" = statusResult.running
			? "running"
			: "completed";
		return buildSessionInfoSafe(session.name, status);
	});

	const results = await Promise.all(sessionPromises);
	const detailedSessions = results.filter(
		(s): s is DetailedSessionInfo => s !== null,
	);

	// Sort by startTime descending (newest first)
	detailedSessions.sort(
		(a, b) => b.startTime.getTime() - a.startTime.getTime(),
	);

	return detailedSessions;
}

/**
 * Poll for session changes and broadcast if anything changed
 */
async function pollSessions(
	broadcast: (msg: SessionsUpdatedMessage) => void,
): Promise<void> {
	try {
		const sessions = await discoverSessions();
		const hasChanges = detectChanges(sessions);

		if (hasChanges) {
			currentSessions = sessions;
			isFirstPoll = false;
			broadcast({
				type: "sessions:updated",
				data: sessions,
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
export function startSessionPolling(
	broadcast: (msg: SessionsUpdatedMessage) => void,
): void {
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
