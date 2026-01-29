# CLAUDE.md

Development guide for `@saga-ai/cli`.

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
| `src/commands/init.ts` | `saga init` - creates `.saga/` directory |
| `src/commands/find.ts` | `saga find` - find epic/story by slug/title (supports `--status` filter) |
| `src/commands/worktree.ts` | `saga worktree` - create git worktree for story |
| `src/commands/implement.ts` | `saga implement` - worker orchestration (detached tmux by default) |
| `src/commands/sessions/` | `saga sessions` - tmux session management (list, status, logs, kill) |
| `src/commands/dashboard.ts` | `saga dashboard` - HTTP server with React dashboard |
| `src/commands/scope-validator.ts` | Hook validator for file operations |
| `src/lib/sessions.ts` | Tmux session create/list/status/kill utilities |
| `src/utils/finder.ts` | Fuzzy search for epics/stories (Fuse.js) |
| `src/utils/project-discovery.ts` | Finds `.saga/` in parent directories |

## Adding Commands

1. Create `src/commands/<name>.ts` with exported async function
2. Register in `src/cli.ts` via Commander's `.command()` API
3. Add tests in `src/commands/<name>.test.ts`

Reference: `init.ts` (simple) or `implement.ts` (complex)

## Testing

Tests run against the built CLI using `spawnSync`. See `src/commands/init.test.ts:14-21` for temp directory setup pattern.

## Key Concepts

**Project Discovery** - Walks up from cwd looking for `.saga/`. The `--path` flag overrides. See `project-discovery.ts`.

**Implement Orchestration** - Spawns Claude workers in a loop until FINISH/BLOCKED/TIMEOUT/MAX_CYCLES. Each file has detailed JSDoc at the top. Key functions:
- `runLoop()` - main orchestration loop
- `parseWorkerOutput()` - validates worker JSON response
- `buildScopeSettings()` - creates hook config for scope enforcement

**Scope Validator** - Called as a Claude Code PreToolUse hook. Blocks access to archive and other stories. Environment: `SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`.

**Finder Utility** - Fuzzy search for epics and stories using Fuse.js. Used by `saga find` command and internally by `implement.ts`. Key functions:
- `findEpic()` - searches `.saga/epics/` directories
- `findStory()` - searches `.saga/worktrees/` for story.md files
- `parseFrontmatter()` - minimal YAML parser for story metadata
- `extractContext()` - extracts `## Context` section from story body

## Build

Single CJS bundle at `dist/cli.cjs` with shebang. Dependencies bundled except Node.js built-ins.
