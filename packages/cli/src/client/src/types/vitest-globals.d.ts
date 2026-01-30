/**
 * Global type declarations for Vitest visual snapshot testing.
 *
 * These globals are set in vitest.setup.ts and consumed by visual-snapshot.ts.
 * Centralizing them here avoids duplicate declarations.
 */

declare global {
  var __vitest_expect__: typeof import('vitest').expect | undefined;
  var __vitest_page__: import('playwright').Page | undefined;
}

export {};
