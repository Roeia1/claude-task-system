import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Story />} />
        </Routes>
      </MemoryRouter>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Breadcrumb>

/**
 * Root breadcrumb showing the home icon and "Epics" label.
 * This is displayed when on the epic list page at `/`.
 */
export const Root: Story = {}

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
}
