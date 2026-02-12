## Session: 2026-02-12T05:10

### Task: t1 - Move storage utilities to saga-types package

**What was done:**
- Copied `packages/plugin-scripts/src/storage.ts` to `packages/saga-types/src/storage.ts`, converting `@saga-ai/types` imports to local relative imports (since the module is now inside the types package)
- Copied both test files (`storage.test.ts` and `storage.integration.test.ts`) to saga-types, updating import paths to use `'./index.ts'` for types and `'./storage.ts'` for storage functions
- Updated `packages/saga-types/src/index.ts` barrel export to re-export all 15 storage functions
- Added `"./storage.ts": "./src/storage.ts"` to saga-types `package.json` exports map
- Updated plugin-scripts test files to import directly from `@saga-ai/types` instead of `'./storage.ts'`
- Removed `packages/plugin-scripts/src/storage.ts` entirely (biome's `noBarrelFile` lint rule prohibits re-export-only files, and no other source files imported from it)
- All plugin-scripts tests (23 files, 451 tests) pass with imports from `@saga-ai/types`
- Saga-types now has 10 test files with 207 tests (90 original + 117 new storage tests)

**Decisions:**
- Removed the plugin-scripts `storage.ts` entirely instead of keeping it as a re-export. The biome `noBarrelFile` lint rule forbids barrel/re-export files for performance reasons. Since no non-test source files in plugin-scripts imported from `./storage.ts`, it was safe to delete.
- Did not modify `hydrate/service.ts` or `find/saga-scanner.ts` -- these files have their own local implementations of similar functions (not imported from `./storage.ts`), so they are unaffected.

**Next steps:**
- t2: Update saga-scanner to use saga-types storage
