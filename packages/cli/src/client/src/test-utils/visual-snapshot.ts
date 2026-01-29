/**
 * Visual snapshot testing utilities for Storybook stories.
 *
 * This module provides DOM/HTML snapshot testing for Storybook play functions.
 * It uses Vitest's toMatchSnapshot() to capture and compare the rendered HTML
 * structure of components.
 *
 * The vitest.setup.ts file exposes the expect object globally, allowing
 * this module to create snapshots without direct vitest imports that would
 * fail in Storybook's dev server context.
 */

// Global types are declared in src/types/vitest-globals.d.ts

/**
 * Check if we're running in Vitest test mode.
 */
function isVitestTest(): boolean {
  return typeof globalThis.__vitest_expect__ !== 'undefined';
}

/**
 * Normalize HTML for consistent snapshots.
 * Removes dynamic attributes that change between runs.
 */
function normalizeHtml(html: string): string {
  return html
    // Remove data-state attributes that may be dynamic
    .replace(/data-state="[^"]*"/g, 'data-state="..."')
    // Remove style attributes with dynamic values
    .replace(/style="[^"]*"/g, 'style="..."')
    // Normalize Radix UI generated IDs (e.g., radix-:r8:, radix-:rk:)
    .replace(/radix-:[a-z0-9]+:/g, 'radix-:id:')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Take a DOM snapshot of the canvas element.
 *
 * In Vitest test mode, captures the HTML and compares it against a baseline.
 * In Storybook dev mode, this is a no-op.
 *
 * @param canvasElement - The canvas element from the play function context
 * @param snapshotName - A unique name for this snapshot (optional)
 */
export async function matchCanvasSnapshot(
  canvasElement: HTMLElement,
  snapshotName?: string
): Promise<void> {
  if (!isVitestTest()) {
    return;
  }

  const expect = globalThis.__vitest_expect__;
  const html = normalizeHtml(canvasElement.innerHTML);

  if (snapshotName) {
    await expect(html).toMatchSnapshot(snapshotName);
  } else {
    await expect(html).toMatchSnapshot();
  }
}

/**
 * Take a DOM snapshot of an element by test ID.
 *
 * @param canvasElement - The canvas element to search within
 * @param testId - The data-testid attribute of the element to snapshot
 * @param snapshotName - A unique name for this snapshot (optional)
 */
export async function matchElementSnapshot(
  canvasElement: HTMLElement,
  testId: string,
  snapshotName?: string
): Promise<void> {
  if (!isVitestTest()) {
    return;
  }

  const element = canvasElement.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Element with data-testid="${testId}" not found`);
  }

  const expect = globalThis.__vitest_expect__;
  const html = normalizeHtml(element.outerHTML);

  if (snapshotName) {
    await expect(html).toMatchSnapshot(snapshotName);
  } else {
    await expect(html).toMatchSnapshot();
  }
}
