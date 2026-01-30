/**
 * saga dashboard command - Start the dashboard server
 *
 * Starts an Express server that provides REST API endpoints for reading
 * epic and story data from the filesystem, watches for file changes,
 * and broadcasts real-time updates via WebSocket.
 */

import process from 'node:process';
import { startServer } from '../server/index.ts';
import { resolveProjectPath } from '../utils/project-discovery.ts';

/**
 * Options for the dashboard command
 */
export interface DashboardOptions {
  path?: string;
  port?: number;
}

/**
 * Execute the dashboard command
 */
export async function dashboardCommand(options: DashboardOptions): Promise<void> {
  // Resolve project path
  let projectPath: string;
  try {
    projectPath = resolveProjectPath(options.path);
  } catch (_error) {
    process.exit(1);
  }

  try {
    const server = await startServer({
      sagaRoot: projectPath,
      port: options.port,
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.close();
      process.exit(0);
    });
  } catch (_error) {
    process.exit(1);
  }
}
