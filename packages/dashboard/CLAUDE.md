# CLAUDE.md

Development guide for `@saga-ai/dashboard`.

## Quick Reference

```bash
pnpm build        # Bundle to dist/cli.cjs
pnpm test         # Run tests
pnpm test:watch   # Watch mode
```

## Structure

| Path | Purpose |
|------|---------|
| `src/cli.ts` | Entry point, Commander.js command registration |
| `src/commands/dashboard.ts` | `saga dashboard` - HTTP server with React dashboard UI |
| `src/commands/sessions/` | `saga sessions` - tmux session management (list, status, logs) |
| `src/lib/sessions.ts` | Tmux session list/status/logs/create/kill utilities |
| `src/lib/session-polling.ts` | Periodic session status polling |
| `src/lib/log-stream-manager.ts` | Log file streaming for sessions |
| `src/server/` | Express HTTP server, routes, WebSocket, file watcher |
| `src/utils/project-discovery.ts` | Finds `.saga/` in parent directories |
| `src/utils/saga-scanner.ts` | Scans `.saga/` directory for epics/stories |
| `src/client/` | React dashboard frontend (Vite, Tailwind, XState) |

## Key Concepts

**Project Discovery** - Walks up from cwd looking for `.saga/`. The `--path` flag overrides. See `project-discovery.ts`.

**Dashboard Server** - Express server serving the React dashboard UI and a REST/WebSocket API. The server watches `.saga/` for file changes and pushes updates via WebSocket. Key modules:
- `server/routes.ts` - REST API endpoints for epics/stories
- `server/session-routes.ts` - REST API endpoints for tmux sessions
- `server/watcher.ts` - File system watcher (chokidar) for live updates
- `server/websocket.ts` - WebSocket server for real-time push

**Session Management** - Lists and monitors tmux sessions. Session names follow the pattern `saga__<epic>__<story>__<pid>`. The dashboard reads session output files for log viewing.

## Build

Single CJS bundle at `dist/cli.cjs` with shebang. Dependencies bundled except Node.js built-ins and select externals (express, ws, chokidar, gray-matter, commander).
