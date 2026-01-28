import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Layout } from './Layout'

/**
 * The Layout component provides the main application shell including:
 * - Header with "SAGA Dashboard" branding
 * - Breadcrumb navigation
 * - Main content area via React Router's Outlet
 * - Toast notification container
 */
const meta: Meta<typeof Layout> = {
  title: 'Components/Layout',
  component: Layout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main layout shell for the SAGA Dashboard. Provides header, breadcrumb navigation, and content area.',
      },
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Story />}>
            <Route
              index
              element={
                <div className="p-4 border border-dashed border-border rounded-lg">
                  <p className="text-text-muted text-center">
                    Main content area (via Outlet)
                  </p>
                </div>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Layout>

/**
 * Default layout showing the header with SAGA Dashboard branding,
 * breadcrumb navigation (showing root "Epics" path), and the main content area.
 */
export const Default: Story = {}

/**
 * Layout with sample page content to demonstrate how page components
 * render within the layout shell.
 */
export const WithPageContent: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Story />}>
            <Route
              index
              element={
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-text">Epics</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-card text-card-foreground p-4 rounded-lg border border-border"
                      >
                        <h3 className="font-medium">Sample Epic {i}</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                          This is a placeholder epic card
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    ),
  ],
}

/**
 * Layout as it appears on an epic detail page, showing the breadcrumb
 * with an epic slug in the path.
 */
export const EpicDetailView: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/epic/dashboard-restructure']}>
        <Routes>
          <Route path="/" element={<Story />}>
            <Route index element={<div />} />
          </Route>
          <Route path="/epic/:slug" element={<Story />}>
            <Route
              index
              element={
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-text">
                    dashboard-restructure
                  </h2>
                  <p className="text-text-muted">Epic detail content area</p>
                </div>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    ),
  ],
}

/**
 * Layout as it appears on a story detail page, showing the full
 * breadcrumb trail: Epics > epic-slug > story-slug
 */
export const StoryDetailView: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter
        initialEntries={['/epic/dashboard-restructure/story/storybook-setup']}
      >
        <Routes>
          <Route path="/" element={<Story />}>
            <Route index element={<div />} />
          </Route>
          <Route path="/epic/:epicSlug/story/:storySlug" element={<Story />}>
            <Route
              index
              element={
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-text">
                    storybook-setup
                  </h2>
                  <p className="text-text-muted">Story detail content area</p>
                </div>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    ),
  ],
}
