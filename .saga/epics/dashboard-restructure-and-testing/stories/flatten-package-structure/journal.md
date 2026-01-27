# Journal: Flatten Dashboard Package Structure

## Session: 2026-01-28T00:28

### Task: t1 - Audit Current Dependencies

**What was done:**
- Read both `packages/cli/package.json` and `packages/cli/src/client/package.json`
- Compared all dependencies and devDependencies for conflicts
- Ran existing test suite (530 tests pass) to establish baseline
- Documented merge strategy

**Dependency Analysis:**

CLI package.json (6 deps, 8 devDeps):
- Production: chokidar, commander, express, fuse.js, gray-matter, ws
- Dev: @types/express, @types/node, @types/supertest, @types/ws, esbuild, supertest, typescript ^5.7.0, vitest

Client package.json (15 deps, 8 devDeps):
- Production: @radix-ui/* (5 packages), @xstate/react, class-variance-authority, clsx, lucide-react, react, react-dom, react-router-dom, tailwind-merge, tailwindcss-animate, xstate
- Dev: @types/react, @types/react-dom, @vitejs/plugin-react, autoprefixer, postcss, tailwindcss, typescript ~5.6.2, vite

**Conflicts Found:**
- `typescript`: CLI ^5.7.0 vs Client ~5.6.2
  - Resolution: Use ^5.7.0 (CLI version is newer and compatible)

**Merge Strategy:**
1. Add all 15 client production deps to CLI's `dependencies`
2. Add all 8 client devDeps to CLI's `devDependencies` (except typescript which already exists)
3. Keep CLI's typescript ^5.7.0 version

**Decisions:**
- Use newer typescript version from CLI
- All React/Radix libs are production deps (they're bundled into client output)
- Vite, postcss, tailwindcss are devDeps (build-time only)

**Next steps:**
- Task t2: Move client dependencies to CLI package.json
