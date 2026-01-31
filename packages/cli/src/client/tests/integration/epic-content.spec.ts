import { expect, test } from '../fixtures.ts';
import { createMockEpic, createMockStoryDetail, mockEpicDetail } from '../utils/mock-api.ts';

// Test fixture: markdown content with code block
const MARKDOWN_WITH_CODE_BLOCK = [
  '## Example',
  '',
  '```typescript',
  'const hello = "world";',
  '```',
].join('\n');

// Regex patterns for case-insensitive matching
const EPIC_DOCUMENTATION_REGEX = /epic documentation/i;

/**
 * Integration tests for epic content display in the dashboard.
 * Tests the EpicContent component as integrated into the EpicDetail page.
 */
test.describe('Epic Content Display', () => {
  test.describe('Content visibility', () => {
    test('should display epic content section when epic has content', async ({ page }) => {
      const epicWithContent = createMockEpic({
        slug: 'content-epic',
        title: 'Epic With Content',
        content:
          '# Epic Overview\n\nThis is the main description.\n\n## Goals\n\n- Goal 1\n- Goal 2',
        stories: [],
      });

      await mockEpicDetail(page, epicWithContent);
      await page.goto('/epic/content-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Verify the epic content section is visible
      const epicContent = page.getByTestId('epic-content');
      await expect(epicContent).toBeVisible();

      // Verify the toggle button header is displayed (use button role for specificity)
      await expect(page.getByRole('button', { name: 'Epic Documentation' })).toBeVisible();

      // Verify markdown content is rendered (inside the prose container)
      const markdownContent = epicContent.locator('.prose');
      await expect(markdownContent.locator('h1')).toContainText('Epic Overview');
      await expect(page.getByText('This is the main description.')).toBeVisible();
    });

    test('should not display epic content section when epic has no content', async ({ page }) => {
      const epicWithoutContent = createMockEpic({
        slug: 'no-content-epic',
        title: 'Epic Without Content',
        content: undefined,
        stories: [],
      });

      await mockEpicDetail(page, epicWithoutContent);
      await page.goto('/epic/no-content-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Verify the page loaded correctly (title is visible)
      await expect(page.getByRole('heading', { name: 'Epic Without Content' })).toBeVisible();

      // Verify the epic content section is NOT present
      const epicContent = page.getByTestId('epic-content');
      await expect(epicContent).not.toBeVisible();
    });

    test('should not display epic content section when content is empty string', async ({
      page,
    }) => {
      const epicWithEmptyContent = createMockEpic({
        slug: 'empty-content-epic',
        title: 'Epic With Empty Content',
        content: '',
        stories: [],
      });

      await mockEpicDetail(page, epicWithEmptyContent);
      await page.goto('/epic/empty-content-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Verify the page loaded correctly
      await expect(page.getByRole('heading', { name: 'Epic With Empty Content' })).toBeVisible();

      // Verify the epic content section is NOT present
      const epicContent = page.getByTestId('epic-content');
      await expect(epicContent).not.toBeVisible();
    });
  });

  test.describe('Collapsible behavior', () => {
    test('should show content expanded by default', async ({ page }) => {
      const epic = createMockEpic({
        slug: 'expanded-epic',
        title: 'Expanded Epic',
        content: '# Welcome\n\nThis content should be visible by default.',
        stories: [],
      });

      await mockEpicDetail(page, epic);
      await page.goto('/epic/expanded-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Verify the epic content section is expanded (data-state="open")
      const epicContent = page.getByTestId('epic-content');
      await expect(epicContent).toHaveAttribute('data-state', 'open');

      // Verify the content is visible
      await expect(page.getByText('This content should be visible by default.')).toBeVisible();
    });

    test('should collapse content when toggle button is clicked', async ({ page }) => {
      const epic = createMockEpic({
        slug: 'collapsible-epic',
        title: 'Collapsible Epic',
        content: '# Collapsible Content\n\nThis content can be hidden.',
        stories: [],
      });

      await mockEpicDetail(page, epic);
      await page.goto('/epic/collapsible-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      const epicContent = page.getByTestId('epic-content');

      // Initially expanded
      await expect(epicContent).toHaveAttribute('data-state', 'open');
      await expect(page.getByText('This content can be hidden.')).toBeVisible();

      // Click the toggle button
      await page.getByRole('button', { name: EPIC_DOCUMENTATION_REGEX }).click();

      // Verify the section is collapsed
      await expect(epicContent).toHaveAttribute('data-state', 'closed');
    });

    test('should expand content when toggle button is clicked again', async ({ page }) => {
      const epic = createMockEpic({
        slug: 'toggle-epic',
        title: 'Toggle Epic',
        content: '# Toggle Me\n\nContent to toggle.',
        stories: [],
      });

      await mockEpicDetail(page, epic);
      await page.goto('/epic/toggle-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      const epicContent = page.getByTestId('epic-content');
      const toggleButton = page.getByRole('button', { name: EPIC_DOCUMENTATION_REGEX });

      // Collapse
      await toggleButton.click();
      await expect(epicContent).toHaveAttribute('data-state', 'closed');

      // Expand again
      await toggleButton.click();
      await expect(epicContent).toHaveAttribute('data-state', 'open');
      await expect(page.getByText('Content to toggle.')).toBeVisible();
    });
  });

  test.describe('Content positioning', () => {
    test('should display epic content between header and stories', async ({ page }) => {
      const epic = createMockEpic({
        slug: 'layout-epic',
        title: 'Layout Epic',
        content: '## Content Section\n\nLayout description here.',
        stories: [
          createMockStoryDetail({
            slug: 'story-1',
            title: 'First Story',
            status: 'ready',
            epicSlug: 'layout-epic',
          }),
        ],
      });

      await mockEpicDetail(page, epic);
      await page.goto('/epic/layout-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Verify all sections are present
      await expect(page.getByRole('heading', { name: 'Layout Epic' })).toBeVisible();
      await expect(page.getByTestId('epic-content')).toBeVisible();
      await expect(page.getByText('First Story')).toBeVisible();

      // Verify the epic content section toggle button and markdown content are displayed
      const epicContent = page.getByTestId('epic-content');
      await expect(epicContent.getByRole('button', { name: 'Epic Documentation' })).toBeVisible();
      await expect(epicContent.getByText('Layout description here.')).toBeVisible();
    });
  });

  test.describe('Markdown rendering', () => {
    test('should render headings in markdown content', async ({ page }) => {
      const epic = createMockEpic({
        slug: 'markdown-epic',
        title: 'Markdown Epic',
        content: '# Main Heading\n\n## Subheading\n\n### Third Level',
        stories: [],
      });

      await mockEpicDetail(page, epic);
      await page.goto('/epic/markdown-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // The markdown content is rendered inside the .prose container
      // The "Epic Documentation" h2 is in the trigger, not inside .prose
      const epicContent = page.getByTestId('epic-content');
      const markdownContent = epicContent.locator('.prose');
      await expect(markdownContent.locator('h1')).toContainText('Main Heading');
      await expect(markdownContent.locator('h2')).toContainText('Subheading');
      await expect(markdownContent.locator('h3')).toContainText('Third Level');
    });

    test('should render lists in markdown content', async ({ page }) => {
      const epic = createMockEpic({
        slug: 'lists-epic',
        title: 'Lists Epic',
        content: '## Goals\n\n- First item\n- Second item\n- Third item',
        stories: [],
      });

      await mockEpicDetail(page, epic);
      await page.goto('/epic/lists-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      const epicContent = page.getByTestId('epic-content');
      await expect(epicContent.locator('ul')).toBeVisible();
      await expect(epicContent.getByText('First item')).toBeVisible();
      await expect(epicContent.getByText('Second item')).toBeVisible();
      await expect(epicContent.getByText('Third item')).toBeVisible();
    });

    test('should render code blocks in markdown content', async ({ page }) => {
      const epic = createMockEpic({
        slug: 'code-epic',
        title: 'Code Epic',
        content: MARKDOWN_WITH_CODE_BLOCK,
        stories: [],
      });

      await mockEpicDetail(page, epic);
      await page.goto('/epic/code-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      const epicContent = page.getByTestId('epic-content');
      await expect(epicContent.locator('pre')).toBeVisible();
      await expect(epicContent.getByText('const hello = "world";')).toBeVisible();
    });

    test('should render tables in markdown content (GFM)', async ({ page }) => {
      const epic = createMockEpic({
        slug: 'table-epic',
        title: 'Table Epic',
        content: '## Data\n\n| Name | Value |\n|------|-------|\n| Key1 | Val1 |',
        stories: [],
      });

      await mockEpicDetail(page, epic);
      await page.goto('/epic/table-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      const epicContent = page.getByTestId('epic-content');
      await expect(epicContent.locator('table')).toBeVisible();
      await expect(epicContent.getByText('Name')).toBeVisible();
      await expect(epicContent.getByText('Key1')).toBeVisible();
      await expect(epicContent.getByText('Val1')).toBeVisible();
    });
  });
});
