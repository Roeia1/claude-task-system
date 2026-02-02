/**
 * Snapshot testing utilities for Storybook stories.
 *
 * Two types of snapshots are available:
 *
 * 1. **DOM Snapshots** (`matchDomSnapshot`)
 *    - Captures HTML structure and CSS classes
 *    - Stored as .snap files in snapshots/dom/
 *    - Catches: missing elements, wrong props, structural changes
 *    - Fast, runs on all stories by default
 *
 * 2. **Pixel Snapshots** (`matchPixelSnapshot`)
 *    - Captures actual rendered pixels as PNG images
 *    - Stored as .png files in snapshots/pixel/{story}/
 *    - Catches: overlapping text, broken layouts, z-index issues
 *    - Use for components with complex positioning/layout
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
	return typeof globalThis.__vitest_expect__ !== "undefined";
}

/**
 * Normalize HTML for consistent DOM snapshots.
 * Removes dynamic attributes that change between runs.
 */
function normalizeHtml(html: string): string {
	return (
		html
			// Remove data-state attributes that may be dynamic
			.replace(/data-state="[^"]*"/g, 'data-state="..."')
			// Remove style attributes with dynamic values
			.replace(/style="[^"]*"/g, 'style="..."')
			// Normalize Radix UI generated IDs (e.g., radix-:r8:, radix-:rk:)
			.replace(/radix-:[a-z0-9]+:/g, "radix-:id:")
			// Normalize whitespace
			.replace(/\s+/g, " ")
			.trim()
	);
}

// ============================================================================
// DOM Snapshots - captures HTML structure
// ============================================================================

/**
 * Take a DOM snapshot of the canvas element.
 *
 * Captures HTML structure and CSS classes. Use this to verify component
 * structure, props, and conditional rendering.
 *
 * In Vitest test mode, captures the HTML and compares it against a baseline.
 * In Storybook dev mode, this is a no-op.
 *
 * @param canvasElement - The canvas element from the play function context
 * @param snapshotName - A unique name for this snapshot
 */
export async function matchDomSnapshot(
	canvasElement: HTMLElement,
	snapshotName: string,
): Promise<void> {
	if (!isVitestTest()) {
		return;
	}

	const expect = globalThis.__vitest_expect__;
	const html = normalizeHtml(canvasElement.innerHTML);

	await expect(html).toMatchSnapshot(snapshotName);
}

// ============================================================================
// Pixel Snapshots - captures rendered pixels
// ============================================================================

/**
 * Take a pixel snapshot of the canvas element.
 *
 * Captures actual rendered pixels as a PNG image. Use this to verify
 * visual appearance, especially for components with:
 * - position: absolute/fixed/sticky
 * - z-index or overlapping elements
 * - Complex flexbox/grid layouts
 * - Virtualized/scrolling content
 *
 * In Vitest test mode, takes a screenshot and compares it against a baseline.
 * In Storybook dev mode, this is a no-op.
 *
 * @param canvasElement - The canvas element from the play function context
 * @param snapshotName - A unique name for this snapshot (without .png extension)
 */
export async function matchPixelSnapshot(
	canvasElement: HTMLElement,
	snapshotName: string,
): Promise<void> {
	if (!isVitestTest()) {
		return;
	}

	const expect = globalThis.__vitest_expect__;

	await expect(canvasElement).toMatchScreenshot(`${snapshotName}.png`);
}
