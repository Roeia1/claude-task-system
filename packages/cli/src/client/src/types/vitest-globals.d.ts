/**
 * Global type declarations for Vitest visual snapshot testing.
 *
 * These globals are set in vitest.setup.ts and consumed by visual-snapshot.ts.
 * Centralizing them here avoids duplicate declarations.
 */

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __vitest_expect__: any;
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __vitest_page__: any;
}

export {};
