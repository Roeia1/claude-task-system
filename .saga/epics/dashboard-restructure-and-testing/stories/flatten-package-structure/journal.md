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

## Session: 2026-01-28T00:29

### Task: t2 - Move Client Dependencies to CLI package.json

**What was done:**
- Added all 15 client production dependencies to CLI's `dependencies` section
- Added 7 client devDependencies to CLI's `devDependencies` section (excluding typescript)
- Kept typescript at ^5.7.0 (CLI's newer version)
- Ran `pnpm install` - succeeded with no version conflicts
- Ran full test suite - all 530 tests pass

**Dependencies Added:**

Production dependencies:
- @radix-ui/react-collapsible ^1.1.12
- @radix-ui/react-progress ^1.1.8
- @radix-ui/react-slot ^1.2.4
- @radix-ui/react-tabs ^1.1.13
- @radix-ui/react-toast ^1.2.15
- @xstate/react ^6.0.0
- class-variance-authority ^0.7.1
- clsx ^2.1.1
- lucide-react ^0.563.0
- react ^18.3.1
- react-dom ^18.3.1
- react-router-dom ^6.30.0
- tailwind-merge ^3.4.0
- tailwindcss-animate ^1.0.7
- xstate ^5.26.0

Dev dependencies:
- @types/react ^18.3.17
- @types/react-dom ^18.3.5
- @vitejs/plugin-react ^4.3.4
- autoprefixer ^10.4.23
- postcss ^8.5.6
- tailwindcss ^3.4.19
- vite ^6.0.5

**Decisions:**
- Kept dependencies alphabetized and organized logically
- Used exact versions from client package.json

**Next steps:**
- Task t3: Update Vite Configuration
