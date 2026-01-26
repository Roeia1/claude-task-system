# CLAUDE.md

Development guide for the `@saga-ai/cli` package.

## Quick Reference

```bash
pnpm build          # Bundle TypeScript to dist/cli.cjs
pnpm test           # Run all tests
pnpm test:watch     # Run tests in watch mode
```

## Project Structure

```
src/
├── cli.ts                    # Entry point - Commander.js setup, command registration
├── cli.test.ts               # CLI integration tests (help, version, routing)
├── commands/
│   ├── init.ts               # `saga init` - Creates .saga/ directory structure
│   ├── implement.ts          # `saga implement` - Orchestration loop for workers
│   ├── dashboard.ts          # `saga dashboard` - Starts HTTP server
│   └── scope-validator.ts    # Internal command for file operation validation
└── utils/
    └── project-discovery.ts  # Finds .saga/ directory in parent hierarchy
```

## Adding a New Command

1. Create `src/commands/<name>.ts` with an exported async function
2. Register in `src/cli.ts` using Commander's `.command()` API
3. Add tests in `src/commands/<name>.test.ts`

See `src/commands/init.ts` for a simple example or `src/commands/implement.ts` for a complex one.

## Testing Pattern

Tests run against the built CLI (`dist/cli.cjs`) using `spawnSync`:

```typescript
const result = spawnSync('node', [CLI_PATH, ...args], { encoding: 'utf-8' });
expect(result.stdout).toContain('expected output');
```

Tests create temporary directories and clean up after themselves. See `src/commands/init.test.ts:15-24` for the setup pattern.

## Key Implementation Details

### Project Discovery (`src/utils/project-discovery.ts`)

Walks up the directory tree looking for `.saga/` directory. The `--path` global option overrides this.

### Implement Command (`src/commands/implement.ts`)

The most complex command. Key concepts:
- **Orchestration loop** (line 501): Spawns Claude workers repeatedly until FINISH, BLOCKED, TIMEOUT, or MAX_CYCLES
- **Worker output parsing** (line 413): Validates JSON schema with status/summary/blocker fields
- **Scope enforcement** (line 393): Builds hook settings that call `scope-validator` for file operations

### Scope Validator (`src/commands/scope-validator.ts`)

Called by Claude Code hooks during `implement`. Validates that file operations stay within the story worktree boundaries. Reads context from environment variables set by the orchestrator.

## Build Output

Single bundled CJS file at `dist/cli.cjs` with shebang. Uses esbuild for fast builds. The bundle includes all dependencies except Node.js built-ins.

## Dependencies

- **commander** - CLI argument parsing (runtime)
- **vitest** - Testing (dev only)
- **esbuild** - Bundling (dev only)
- **typescript** - Type checking (dev only)
