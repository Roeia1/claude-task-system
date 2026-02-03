# CLI Dashboard Refactor

## Overview

Refactor the SAGA architecture to establish clear separation of concerns: the CLI package (`@saga-ai/cli`) becomes a standalone dashboard-only tool (`@saga-ai/dashboard`) for monitoring epics/stories, while all orchestration logic (`implement`, `scope-validator`, `find`, `worktree`, `sessions`) moves into the plugin. This eliminates the current circular dependency where the CLI requires `SAGA_PLUGIN_ROOT` to function, and creates a clean contract where the `.saga/` directory structure is the only interface between dashboard and plugin.

## Goals

- Make the CLI a truly standalone dashboard that only reads `.saga/` directory
- Move all plugin-dependent commands into the plugin's internal scripts
- Eliminate `SAGA_PLUGIN_ROOT` and other env var dependencies from the CLI/dashboard
- Establish `.saga/` directory structure as the stable contract between components
- Rename `@saga-ai/cli` to `@saga-ai/dashboard` to reflect its focused purpose

## Success Metrics

- Dashboard can run `saga dashboard` without any SAGA_ environment variables
- Plugin contains all orchestration logic (implement, scope-validator, etc.)
- Zero coupling between dashboard and plugin code
- Single version/release for plugin, independent versioning possible for dashboard
- Shared TypeScript types define `.saga/` directory contract

## Scope

### In Scope

- Refactor CLI to contain only the dashboard command
- Rename package from `@saga-ai/cli` to `@saga-ai/dashboard`
- Move `implement`, `scope-validator`, `find`, `worktree` commands to plugin
- Move session creation/management to plugin, session viewing to dashboard
- Create `packages/plugin-scripts/` for TypeScript source
- Build plugin scripts to `plugin/scripts/` directory
- Remove `SAGA_PLUGIN_ROOT` dependency from dashboard
- Update plugin skills to call internal scripts instead of `npx @saga-ai/cli`
- Create `packages/saga-types/` with TypeScript interfaces as the contract
- Delete `@saga-ai/cli` npm package, publish `@saga-ai/dashboard` starting at 3.0.0

### Out of Scope

- Changing the `.saga/` directory structure itself
- Modifying dashboard functionality (features stay the same)
- Changing how the plugin is distributed (remains Claude Code plugin system)
- Adding new features to either component
- Backward compatibility shims for old CLI

## Non-Functional Requirements

- Dashboard startup time should not regress
- Plugin scripts should execute without noticeable latency vs current CLI calls
- No breaking changes to `.saga/` directory structure (backward compatibility for existing projects)
- Dashboard should work on any project with `.saga/` directory (no plugin required)

## Technical Approach

### Current Architecture (Before)

```
┌─────────────────────────────────────────────────────────────┐
│  Plugin (Claude Code)                                        │
│  └── Skills call `npx @saga-ai/cli <command>`               │
│                    │                                         │
│                    ↓                                         │
│  CLI (@saga-ai/cli)                                          │
│  ├── dashboard     ← standalone                              │
│  ├── implement     ← needs SAGA_PLUGIN_ROOT                  │
│  ├── scope-validator ← needs SAGA_* env vars                 │
│  ├── find, init, worktree, sessions                          │
│  └── ...                                                     │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (After)

```
┌─────────────────────────────────────────────────────────────┐
│  Plugin (Claude Code)                                        │
│  ├── Skills call `node $SAGA_PLUGIN_ROOT/scripts/<name>.js` │
│  ├── skills/init/ (user-invocable, creates .saga/)          │
│  └── scripts/                                                │
│      ├── implement.js      (orchestration + session create)  │
│      ├── scope-validator.js                                  │
│      ├── find.js                                             │
│      ├── worktree.js                                         │
│      └── sessions.js       (kill only)                       │
│                                                              │
│  Dashboard (@saga-ai/dashboard) - SEPARATE                   │
│  ├── Only reads .saga/ directory                             │
│  ├── No plugin dependency                                    │
│  └── Session viewing (list, status, logs)                    │
└─────────────────────────────────────────────────────────────┘
```

### Repository Structure

```
saga/
├── packages/
│   ├── saga-types/          # Shared Zod schemas + inferred types (internal, not published)
│   │   ├── src/
│   │   │   ├── epic.ts      # EpicSchema, Epic, EpicFrontmatter
│   │   │   ├── story.ts     # StorySchema, Story, StoryFrontmatter, StoryStatus
│   │   │   ├── session.ts   # SessionSchema, Session, SessionStatus (shared by dashboard + plugin-scripts)
│   │   │   ├── directory.ts # SagaDirectory paths/structure
│   │   │   └── index.ts     # Re-exports schemas and types
│   │   ├── package.json     # depends on zod
│   │   └── tsconfig.json
│   │
│   ├── dashboard/           # @saga-ai/dashboard (npm)
│   │   └── src/             # imports from @saga-ai/types
│   │       ├── dashboard.ts
│   │       ├── server/
│   │       └── client/
│   │
│   └── plugin-scripts/      # Source for plugin scripts (NOT published)
│       ├── src/             # imports from @saga-ai/types
│       │   ├── implement.ts
│       │   ├── scope-validator.ts
│       │   ├── find.ts
│       │   ├── worktree.ts
│       │   └── sessions-kill.ts
│       ├── package.json
│       └── tsconfig.json    # Outputs to ../../plugin/scripts/
│
├── plugin/                  # What Claude Code installs
│   ├── skills/
│   │   └── init/            # User-invocable /init skill
│   ├── hooks/
│   ├── agents/
│   ├── docs/
│   └── scripts/             # Pre-built JS (committed)
│       ├── implement.js
│       ├── scope-validator.js
│       └── ...
│
└── (build script: packages/plugin-scripts → plugin/scripts/)
```

### Components to Move

| Component | Current Location | New Location |
|-----------|------------------|--------------|
| `implement.ts` | `packages/cli/src/commands/` | `packages/plugin-scripts/src/implement/` (split into modules) |
| `scope-validator.ts` | `packages/cli/src/commands/` | `packages/plugin-scripts/src/` |
| `find.ts` + `finder.ts` | `packages/cli/src/commands/` | `packages/plugin-scripts/src/` |
| `worktree.ts` | `packages/cli/src/commands/` | `packages/plugin-scripts/src/` |
| `init.ts` | `packages/cli/src/commands/` | `plugin/skills/init/` (user-invocable skill only) |
| `sessions/kill` | `packages/cli/src/commands/` | `packages/plugin-scripts/src/` |
| `sessions/list,status,logs` | `packages/cli/src/commands/` | `packages/dashboard/src/` |

**Note**: Session creation is part of the `implement.ts` execute-story flow, not a separate command.

### implement.ts Refactoring

The 32KB `implement.ts` file will be split into focused modules during migration:

```
packages/plugin-scripts/src/implement/
├── index.ts              # Entry point, CLI args parsing
├── orchestrator.ts       # Main worker loop (runLoop)
├── session-manager.ts    # Tmux session create/attach/kill
├── output-parser.ts      # Parse and validate worker JSON output
├── scope-config.ts       # Build scope hook configuration
└── types.ts              # Local types (WorkerResult, CycleOutcome, etc.)
```

**Benefits:**
- Testable units (can test orchestrator without tmux)
- Clear separation of concerns
- Easier to maintain and debug

### Testing Strategy

For each migrated command:
1. **Migrate existing tests** - Move test files from CLI to plugin-scripts, adapt imports
2. **Add new unit tests** - Test split modules individually (e.g., `orchestrator.test.ts`, `output-parser.test.ts`)

This ensures no regression during migration while improving coverage of refactored code.

### Shared Types (saga-types)

Any types used by both plugin-scripts and dashboard must live in `packages/saga-types/`:
- Epic, Story, StoryStatus (reading .saga/ directory)
- Session, SessionStatus (plugin-scripts kills, dashboard views)
- Directory structure types

### What Stays in Dashboard

| Component | Reason |
|-----------|--------|
| `dashboard.ts` | Core functionality |
| `server/` | Express + WebSocket server |
| `client/` | React frontend |
| `project-discovery.ts` | Find .saga/ directory |
| Session viewing | Monitoring concern |

## Key Decisions

### 1. Dashboard as Standalone Package

- **Choice**: Rename `@saga-ai/cli` to `@saga-ai/dashboard`, containing only dashboard and session viewing
- **Rationale**: Clear purpose, no confusion about what's standalone vs plugin-dependent
- **Alternatives Considered**: Keep CLI name (confusing), merge into plugin (wrong abstraction), remove entirely (loses value)

### 2. Plugin Scripts Pre-built

- **Choice**: Compile TypeScript to JS and commit to `plugin/scripts/`
- **Rationale**: Plugin stays simple (no build step for users), clear artifact location
- **Alternatives Considered**: Build on install (complex), rewrite as bash scripts (lose type safety)

### 3. Source/Artifact Separation

- **Choice**: Source in `packages/plugin-scripts/`, artifacts in `plugin/scripts/`
- **Rationale**: Clean separation, AI knows where to edit (source) vs reference (artifacts)
- **Alternatives Considered**: Source in plugin folder (mixes concerns), single location (confusing)

### 4. Contract via .saga/ Directory

- **Choice**: `.saga/` directory structure is the only interface between dashboard and plugin
- **Rationale**: True decoupling, dashboard works without plugin installed
- **Alternatives Considered**: Shared library (tight coupling), environment variables (current problem)

### 5. Contract via Zod Schemas

- **Choice**: Define `.saga/` directory structure as Zod schemas in `packages/saga-types/`, TypeScript types inferred via `z.infer<>`
- **Rationale**: Single source of truth, type safety, runtime validation for plugin-scripts input, self-documenting
- **Alternatives Considered**: Plain interfaces (no runtime validation), separate zod layer (two definitions to sync)

### 6. Session Management Split

- **Choice**: Plugin handles session killing (via plugin-scripts), dashboard handles viewing (list, status, logs)
- **Rationale**: Session creation is part of `implement.ts` execute-story flow, not a separate command. Killing is an orchestration action (plugin concern), viewing is monitoring (dashboard concern)
- **Alternatives Considered**: All in plugin (dashboard less useful), all in dashboard (needs plugin context)

### 7. Migration Strategy

- **Choice**: Delete `@saga-ai/cli` from npm, start `@saga-ai/dashboard` at version 3.0.0
- **Rationale**: No users on current package, clean break, version number signals continuation
- **Alternatives Considered**: Deprecation notice (unnecessary), start at 1.0.0 (loses version continuity)

### 8. Versioning Strategy

- **Choice**: Coupled versioning - plugin and dashboard release together with same version number
- **Rationale**: Simpler release process, consistent version across SAGA components
- **Alternatives Considered**: Independent versioning (adds coordination overhead)

## Data Models

### .saga/ Directory Structure

Defined in `packages/saga-types/src/directory.ts`:

```
.saga/
├── epics/
│   └── {epic-slug}/
│       ├── epic.md                    # Epic definition
│       └── stories/
│           └── {story-slug}/
│               ├── story.md           # Story definition (frontmatter + body)
│               └── journal.md         # Execution journal
│
├── worktrees/
│   └── {epic-slug}/
│       └── {story-slug}/              # Git worktree for story
│
└── archive/
    └── {epic-slug}/                   # Archived epics
```

### Zod Schemas (packages/saga-types/)

```typescript
// story.ts
import { z } from 'zod';

export const StoryStatusSchema = z.enum(['draft', 'ready', 'in-progress', 'blocked', 'completed']);
export type StoryStatus = z.infer<typeof StoryStatusSchema>;

export const StoryFrontmatterSchema = z.object({
  title: z.string(),
  status: StoryStatusSchema,
  priority: z.number().min(1).max(5).optional(),
  dependencies: z.array(z.string()).optional(),
  estimate: z.string().optional(),
});
export type StoryFrontmatter = z.infer<typeof StoryFrontmatterSchema>;

export const StorySchema = z.object({
  slug: z.string(),
  path: z.string(),
  frontmatter: StoryFrontmatterSchema,
  content: z.string(),
});
export type Story = z.infer<typeof StorySchema>;

// epic.ts
export const EpicFrontmatterSchema = z.object({
  title: z.string(),
  status: z.enum(['active', 'archived']).optional(),
});
export type EpicFrontmatter = z.infer<typeof EpicFrontmatterSchema>;

export const EpicSchema = z.object({
  slug: z.string(),
  path: z.string(),
  frontmatter: EpicFrontmatterSchema,
  content: z.string(),
  stories: z.array(StorySchema),
});
export type Epic = z.infer<typeof EpicSchema>;

// session.ts
export const SessionStatusSchema = z.enum(['running', 'stopped', 'unknown']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  name: z.string(),
  status: SessionStatusSchema,
  createdAt: z.string().optional(),
  epicSlug: z.string().optional(),
  storySlug: z.string().optional(),
});
export type Session = z.infer<typeof SessionSchema>;
```

## Interface Contracts

### Plugin Script Interface

Each script in `plugin/scripts/` follows this pattern:

```bash
node $SAGA_PLUGIN_ROOT/scripts/<name>.js [args...]
```

#### implement.js

- **Input**: `<story-slug> [--max-cycles N] [--max-time N] [--model NAME]`
- **Environment**: `SAGA_PLUGIN_ROOT` (for worker prompt), `SAGA_PROJECT_DIR`
- **Output**: JSON result to stdout

#### scope-validator.js

- **Input**: Tool call JSON via stdin
- **Environment**: `SAGA_PROJECT_DIR`, `SAGA_EPIC_SLUG`, `SAGA_STORY_SLUG`
- **Output**: Validation result to stdout

#### find.js

- **Input**: `<query> [--type epic|story] [--status STATUS]`
- **Environment**: `SAGA_PROJECT_DIR` or `--path` flag
- **Output**: Found item path to stdout

### Dashboard API (unchanged)

- `GET /api/epics` - List epics
- `GET /api/epics/:slug` - Get epic details
- `GET /api/epics/:slug/stories` - List stories
- `GET /api/epics/:slug/stories/:storySlug` - Get story details
- `WS /` - Real-time updates

## Tech Stack

- **TypeScript**: Plugin scripts and dashboard source
- **Zod**: Schema definitions + runtime validation in saga-types
- **esbuild**: Bundle plugin scripts to single JS files
- **React**: Dashboard frontend (existing)
- **Express**: Dashboard server (existing)
- **WebSocket**: Real-time updates (existing)
- **Fuse.js**: Fuzzy search in find script (existing)
- **chokidar**: File watching in dashboard (existing)

## Resolved Questions

- **Schema versioning**: Not needed for now. The `.saga/` structure is stable and changes can be handled via dashboard backward compatibility.
- **Worker prompt access**: Plugin scripts access via `$SAGA_PLUGIN_ROOT/skills/execute-story/worker-prompt.md`. The `SAGA_PLUGIN_ROOT` env var is always available when scripts are called from plugin skills.
- **Archived epics**: Dashboard shows archived epics with a toggle (current behavior, unchanged).
