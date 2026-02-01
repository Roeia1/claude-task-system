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
- Clear documentation of `.saga/` directory schema

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
- Document `.saga/` directory schema as the interface contract
- Deprecate `@saga-ai/cli` npm package

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
│  └── scripts/                                                │
│      ├── implement.js                                        │
│      ├── scope-validator.js                                  │
│      ├── find.js                                             │
│      ├── worktree.js                                         │
│      └── sessions.js (create, manage, kill)                  │
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
│   ├── dashboard/           # @saga-ai/dashboard (npm)
│   │   └── src/
│   │       ├── dashboard.ts
│   │       ├── server/
│   │       └── client/
│   │
│   └── plugin-scripts/      # Source for plugin scripts (NOT published)
│       ├── src/
│       │   ├── implement.ts
│       │   ├── scope-validator.ts
│       │   ├── find.ts
│       │   ├── worktree.ts
│       │   └── sessions.ts
│       ├── package.json
│       └── tsconfig.json    # Outputs to ../../plugin/scripts/
│
├── plugin/                  # What Claude Code installs
│   ├── skills/
│   ├── hooks/
│   ├── agents/
│   ├── docs/
│   │   └── SAGA-DIRECTORY-SCHEMA.md  # Contract documentation
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
| `implement.ts` | `packages/cli/src/commands/` | `packages/plugin-scripts/src/` |
| `scope-validator.ts` | `packages/cli/src/commands/` | `packages/plugin-scripts/src/` |
| `find.ts` + `finder.ts` | `packages/cli/src/commands/` | `packages/plugin-scripts/src/` |
| `worktree.ts` | `packages/cli/src/commands/` | `packages/plugin-scripts/src/` |
| `sessions/*.ts` (create/kill) | `packages/cli/src/commands/` | `packages/plugin-scripts/src/` |
| `sessions/*.ts` (list/status/logs) | `packages/cli/src/commands/` | `packages/dashboard/src/` |

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

### 5. Contract Documentation

- **Choice**: Document `.saga/` directory structure in `plugin/docs/SAGA-DIRECTORY-SCHEMA.md`
- **Rationale**: Single source of truth, human-readable, easy to maintain
- **Alternatives Considered**: JSON Schema (overkill), implicit (no clarity)

### 6. Session Management Split

- **Choice**: Plugin handles session creation/management/killing, dashboard handles viewing (list, status, logs)
- **Rationale**: Creation is orchestration (plugin concern), viewing is monitoring (dashboard concern)
- **Alternatives Considered**: All in plugin (dashboard less useful), all in dashboard (needs plugin context)

### 7. Migration Strategy

- **Choice**: Hard deprecation of `@saga-ai/cli`, users must switch to `@saga-ai/dashboard`
- **Rationale**: Clean break, no maintenance of compatibility shims
- **Alternatives Considered**: Deprecation warning with redirect, alias package

## Data Models

### .saga/ Directory Structure (Contract)

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

### story.md Frontmatter Schema

```yaml
---
title: string           # Story title
status: string          # draft | ready | in-progress | blocked | completed
priority: number        # 1-5 (optional)
dependencies: string[]  # Story slugs this depends on (optional)
estimate: string        # Time estimate (optional)
---
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
- **esbuild**: Bundle plugin scripts to single JS files
- **React**: Dashboard frontend (existing)
- **Express**: Dashboard server (existing)
- **WebSocket**: Real-time updates (existing)
- **Fuse.js**: Fuzzy search in find script (existing)
- **chokidar**: File watching in dashboard (existing)

## Open Questions

- Should we version the `.saga/` directory schema? (e.g., `.saga/version` file)
- How do we handle plugin scripts that need the worker prompt? (Currently in `plugin/skills/execute-story/worker-prompt.md`)
- Should dashboard show archived epics by default or require a flag?
