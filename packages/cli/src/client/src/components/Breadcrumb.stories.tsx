import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot'
import { Breadcrumb } from './Breadcrumb'

/**
 * The Breadcrumb component displays navigation breadcrumbs based on the current route.
 * It uses React Router's `useParams` to determine the current location and builds
 * the appropriate breadcrumb trail.
 *
 * **Variants:**
 * - **Root**: Shows "Epics" with home icon (at `/`)
 * - **Epic Detail**: Shows Epics > epic-slug (at `/epic/:slug`)
 * - **Story Detail**: Shows Epics > epic-slug > story-slug (at `/epic/:epicSlug/story/:storySlug`)
 */
const meta: Meta<typeof Breadcrumb> = {
  title: 'Components/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    docs: {
      description: {
        component:
          'Navigation breadcrumbs that adapt to the current route. Shows the hierarchical path through the dashboard.',
      },
    },
    // Enable a11y tests for breadcrumb navigation - links must have accessible names
    a11y: {
      test: 'error',
    },
  },
}

export default meta
type Story = StoryObj<typeof Breadcrumb>

/**
 * Root breadcrumb showing the home icon and "Epics" label.
 * This is displayed when on the epic list page at `/`.
 */
export const Root: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const nav = canvasElement.querySelector('nav[aria-label="Breadcrumb"]')
    await expect(nav).toBeInTheDocument()
    // Verify "Epics" text is present
    await expect(canvas.getByText('Epics')).toBeInTheDocument()
    // Verify home icon is present (SVG with lucide class)
    const homeIcon = canvasElement.querySelector('svg[class*="lucide"]')
    await expect(homeIcon).toBeInTheDocument()
    // Verify no separators since this is the only item (chevron-right icons)
    const separators = canvasElement.querySelectorAll('svg[class*="chevron"]')
    await expect(separators.length).toBe(0)

    // Accessibility: Verify nav has proper aria-label for screen readers
    await expect(nav).toHaveAttribute('aria-label', 'Breadcrumb')

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'breadcrumb-root')
  },
}

/**
 * Epic detail breadcrumb showing: Epics > epic-slug
 * The "Epics" link navigates back to the root, while the epic slug
 * is shown as the current page indicator (non-clickable, styled with font-medium).
 */
export const EpicDetail: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/epic/dashboard-restructure']}>
        <Routes>
          <Route path="/" element={<Story />} />
          <Route path="/epic/:slug" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Verify Epics link is present with href to root
    const epicsLink = canvas.getByRole('link', { name: /epics/i })
    await expect(epicsLink).toBeInTheDocument()
    await expect(epicsLink).toHaveAttribute('href', '/')
    // Verify separator is present
    const separators = canvasElement.querySelectorAll('svg[class*="chevron"]')
    await expect(separators.length).toBe(1)
    // Verify epic slug is displayed as current page (font-medium)
    const epicSlug = canvas.getByText('dashboard-restructure')
    await expect(epicSlug).toBeInTheDocument()
    await expect(epicSlug).toHaveClass('font-medium')

    // Accessibility: Verify links have accessible names
    await expect(epicsLink).toHaveAccessibleName()
    // Verify nav has proper aria-label
    const nav = canvasElement.querySelector('nav[aria-label="Breadcrumb"]')
    await expect(nav).toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'breadcrumb-epic-detail')
  },
}

/**
 * Story detail breadcrumb showing: Epics > epic-slug > story-slug
 * - "Epics" link navigates to the root
 * - Epic slug link navigates to the epic detail page
 * - Story slug is the current page indicator (non-clickable)
 */
export const StoryDetail: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter
        initialEntries={['/epic/dashboard-restructure/story/storybook-setup']}
      >
        <Routes>
          <Route path="/" element={<Story />} />
          <Route path="/epic/:slug" element={<Story />} />
          <Route path="/epic/:epicSlug/story/:storySlug" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Verify Epics link with href to root
    const epicsLink = canvas.getByRole('link', { name: /epics/i })
    await expect(epicsLink).toBeInTheDocument()
    await expect(epicsLink).toHaveAttribute('href', '/')
    // Verify epic slug link with href to epic detail
    const epicSlugLink = canvas.getByRole('link', {
      name: 'dashboard-restructure',
    })
    await expect(epicSlugLink).toBeInTheDocument()
    await expect(epicSlugLink).toHaveAttribute('href', '/epic/dashboard-restructure')
    // Verify two separators for the full hierarchy
    const separators = canvasElement.querySelectorAll('svg[class*="chevron"]')
    await expect(separators.length).toBe(2)
    // Verify story slug is displayed as current page (font-medium)
    const storySlug = canvas.getByText('storybook-setup')
    await expect(storySlug).toBeInTheDocument()
    await expect(storySlug).toHaveClass('font-medium')

    // Accessibility: Verify all links have accessible names
    await expect(epicsLink).toHaveAccessibleName()
    await expect(epicSlugLink).toHaveAccessibleName()
    // Verify nav has proper aria-label
    const nav = canvasElement.querySelector('nav[aria-label="Breadcrumb"]')
    await expect(nav).toBeInTheDocument()

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'breadcrumb-story-detail')
  },
}

/**
 * Epic detail with a long slug name to demonstrate text handling.
 * Shows how the breadcrumb handles longer epic names.
 */
export const LongEpicSlug: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter
        initialEntries={['/epic/implement-authentication-and-authorization-system']}
      >
        <Routes>
          <Route path="/" element={<Story />} />
          <Route path="/epic/:slug" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Verify Epics link is present with href to root
    const epicsLink = canvas.getByRole('link', { name: /epics/i })
    await expect(epicsLink).toBeInTheDocument()
    await expect(epicsLink).toHaveAttribute('href', '/')
    // Verify long epic slug is displayed as current page
    const epicSlug = canvas.getByText(
      'implement-authentication-and-authorization-system'
    )
    await expect(epicSlug).toBeInTheDocument()
    await expect(epicSlug).toHaveClass('font-medium')
  },
}

/**
 * Story detail with long slugs for both epic and story.
 * Demonstrates the full breadcrumb trail with longer names.
 */
export const LongSlugs: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter
        initialEntries={[
          '/epic/implement-authentication-and-authorization-system/story/add-oauth-provider-integration',
        ]}
      >
        <Routes>
          <Route path="/" element={<Story />} />
          <Route path="/epic/:slug" element={<Story />} />
          <Route path="/epic/:epicSlug/story/:storySlug" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Verify Epics link with href to root
    const epicsLink = canvas.getByRole('link', { name: /epics/i })
    await expect(epicsLink).toBeInTheDocument()
    await expect(epicsLink).toHaveAttribute('href', '/')
    // Verify long epic slug link with href to epic detail
    const epicSlugLink = canvas.getByRole('link', {
      name: 'implement-authentication-and-authorization-system',
    })
    await expect(epicSlugLink).toBeInTheDocument()
    await expect(epicSlugLink).toHaveAttribute(
      'href',
      '/epic/implement-authentication-and-authorization-system'
    )
    // Verify long story slug is displayed as current page
    const storySlug = canvas.getByText('add-oauth-provider-integration')
    await expect(storySlug).toBeInTheDocument()
    await expect(storySlug).toHaveClass('font-medium')
  },
}
