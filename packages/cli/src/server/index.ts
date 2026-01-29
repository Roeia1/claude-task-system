/**
 * SAGA Dashboard Server
 *
 * Express server that provides REST API endpoints for reading epic and story data
 * from the filesystem, watches for file changes using chokidar, and broadcasts
 * real-time updates to connected clients via WebSocket.
 */

import express, { type Express, type Request, type Response } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import { join } from 'path';
import { createApiRouter } from './routes.js';
import { createWebSocketServer, type WebSocketInstance } from './websocket.js';

/**
 * Configuration for starting the server
 */
export interface ServerConfig {
  /** Path to the project root with .saga/ directory */
  sagaRoot: string;
  /** Server port (default: 3847) */
  port?: number;
}

/**
 * Server instance returned by startServer
 */
export interface ServerInstance {
  /** The Express app instance */
  app: Express;
  /** The HTTP server instance */
  httpServer: HttpServer;
  /** The WebSocket server instance */
  wsServer: WebSocketInstance;
  /** The port the server is running on */
  port: number;
  /** Close the server gracefully */
  close: () => Promise<void>;
}

/** Default port for the dashboard server */
const DEFAULT_PORT = 3847;

/**
 * Create and configure the Express app
 */
function createApp(sagaRoot: string): Express {
  const app = express();

  // JSON middleware
  app.use(express.json());

  // CORS for local development
  app.use((_req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // API routes
  app.use('/api', createApiRouter(sagaRoot));

  // Serve static files from built client (dist/client relative to dist/cli.cjs)
  const clientDistPath = join(__dirname, 'client');
  app.use(express.static(clientDistPath));

  // SPA fallback - serve index.html for client-side routing
  // Express 5 requires named wildcards, use {*splat} to also match root path
  app.get('/{*splat}', (_req: Request, res: Response) => {
    res.sendFile(join(clientDistPath, 'index.html'));
  });

  return app;
}

/**
 * Start the SAGA Dashboard server
 *
 * @param config - Server configuration
 * @returns Promise resolving to the server instance
 */
export async function startServer(config: ServerConfig): Promise<ServerInstance> {
  const port = config.port ?? DEFAULT_PORT;
  const app = createApp(config.sagaRoot);
  const httpServer = createServer(app);

  // Create WebSocket server attached to HTTP server
  const wsServer = await createWebSocketServer(httpServer, config.sagaRoot);

  return new Promise((resolve, reject) => {
    httpServer.on('error', reject);

    httpServer.listen(port, () => {
      console.log(`SAGA Dashboard server running on http://localhost:${port}`);

      resolve({
        app,
        httpServer,
        wsServer,
        port,
        close: async () => {
          // Close WebSocket server first
          await wsServer.close();

          // Then close HTTP server
          return new Promise<void>((resolveClose, rejectClose) => {
            httpServer.close((err) => {
              if (err) {
                rejectClose(err);
              } else {
                resolveClose();
              }
            });
          });
        }
      });
    });
  });
}
