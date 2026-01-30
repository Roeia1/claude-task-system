/**
 * Sessions CLI subcommands
 *
 * Commands:
 *   saga sessions list           List all SAGA sessions
 *   saga sessions status <name>  Show session status
 *   saga sessions logs <name>    Stream session output
 *   saga sessions kill <name>    Terminate session
 */

import process from 'node:process';
import { getSessionStatus, killSession, listSessions, streamLogs } from '../../lib/sessions.ts';

/**
 * List all SAGA sessions
 * Outputs JSON array of sessions
 */
export async function sessionsListCommand(): Promise<void> {
  const _sessions = await listSessions();
}

/**
 * Get status of a specific session
 * Outputs JSON object with running boolean
 *
 * @param sessionName - The session name to check
 */
export async function sessionsStatusCommand(sessionName: string): Promise<void> {
  const _status = await getSessionStatus(sessionName);
}

/**
 * Stream logs from a session
 * Outputs raw stdout stream (not JSON)
 *
 * @param sessionName - The session name to stream logs from
 */
export async function sessionsLogsCommand(sessionName: string): Promise<void> {
  try {
    await streamLogs(sessionName);
  } catch (_error) {
    process.exit(1);
  }
}

/**
 * Kill a session
 * Outputs JSON object with killed boolean
 *
 * @param sessionName - The session name to kill
 */
export async function sessionsKillCommand(sessionName: string): Promise<void> {
  const _result = await killSession(sessionName);
}
