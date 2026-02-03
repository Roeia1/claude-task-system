/**
 * Sessions CLI subcommands
 *
 * Commands:
 *   saga sessions list           List all SAGA sessions
 *   saga sessions status <name>  Show session status
 *   saga sessions logs <name>    Stream session output
 */

import process from 'node:process';
import { getSessionStatus, listSessions, streamLogs } from '../../lib/sessions.ts';

/**
 * List all SAGA sessions
 * Outputs JSON array of sessions
 */
export async function sessionsListCommand(): Promise<void> {
  const sessions = await listSessions();
  console.log(JSON.stringify(sessions, null, 2));
}

/**
 * Get status of a specific session
 * Outputs JSON object with running boolean
 *
 * @param sessionName - The session name to check
 */
export async function sessionsStatusCommand(sessionName: string): Promise<void> {
  const status = await getSessionStatus(sessionName);
  console.log(JSON.stringify(status, null, 2));
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
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
