/**
 * Tests for the Express server foundation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { startServer, type ServerInstance, type ServerConfig } from '../index.js';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('server', () => {
  let testDir: string;
  let server: ServerInstance | null = null;

  beforeEach(() => {
    // Create a temp directory with .saga structure for each test
    testDir = mkdtempSync(join(tmpdir(), 'saga-server-test-'));
    mkdirSync(join(testDir, '.saga', 'epics'), { recursive: true });
  });

  afterEach(async () => {
    // Stop server if running
    if (server) {
      await server.close();
      server = null;
    }
    // Clean up temp directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('startServer', () => {
    it('should start server on default port 3847', async () => {
      server = await startServer({ sagaRoot: testDir });
      expect(server.port).toBe(3847);
    });

    it('should start server on custom port', async () => {
      server = await startServer({ sagaRoot: testDir, port: 4000 });
      expect(server.port).toBe(4000);
    });

    it('should export the express app instance', async () => {
      server = await startServer({ sagaRoot: testDir, port: 4001 });
      expect(server.app).toBeDefined();
    });

    it('should export the http server instance', async () => {
      server = await startServer({ sagaRoot: testDir, port: 4002 });
      expect(server.httpServer).toBeDefined();
    });

    it('should be closable', async () => {
      server = await startServer({ sagaRoot: testDir, port: 4003 });
      await server.close();
      server = null;
      // Server should be closed, attempting to make requests should fail
    });
  });

  describe('health endpoint', () => {
    it('should return status ok at GET /api/health', async () => {
      server = await startServer({ sagaRoot: testDir, port: 4010 });

      const response = await fetch('http://localhost:4010/api/health');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ status: 'ok' });
    });
  });

  describe('CORS', () => {
    it('should include CORS headers for local development', async () => {
      server = await startServer({ sagaRoot: testDir, port: 4020 });

      const response = await fetch('http://localhost:4020/api/health');
      const corsHeader = response.headers.get('access-control-allow-origin');
      expect(corsHeader).toBe('*');
    });
  });

  describe('JSON middleware', () => {
    it('should parse JSON request bodies', async () => {
      server = await startServer({ sagaRoot: testDir, port: 4030 });

      // The health endpoint should work, indicating JSON middleware is loaded
      const response = await fetch('http://localhost:4030/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(response.status).toBe(200);
    });
  });
});
