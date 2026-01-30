/**
 * saga dashboard command - Start the dashboard server
 *
 * Starts an Express server that provides REST API endpoints for reading
 * epic and story data from the filesystem, watches for file changes,
 * and broadcasts real-time updates via WebSocket.
 */

import { startServer } from '../server/index.js';
import { resolveProjectPath } from '../utils/project-discovery.js';

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
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  try {
    const server = await startServer({
      sagaRoot: projectPath,
      port: options.port,
    });

    console.log(`Project: ${projectPath}`);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down dashboard server...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error(
      `Error starting server: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
