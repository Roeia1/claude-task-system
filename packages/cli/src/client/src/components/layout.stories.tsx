import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, within } from 'storybook/test';
import { DashboardProvider } from '@/context/dashboard-context';
import { dashboardMachine } from '@/machines';
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot';
import { Layout } from './Layout.tsx';

/** Number of sample cards to render in stories */
const SAMPLE_CARD_COUNT = 3;

/** Array of sample card indices for iteration */
const SAMPLE_CARD_INDICES = Array.from({ length: SAMPLE_CARD_COUNT }, (_, i) => i + 1);

/** Regex pattern for matching Dashboard text */
const DASHBOARD_PATTERN = /Dashboard/;

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
};

type Story = StoryObj<typeof Layout>;

/**
 * Default layout showing the header with SAGA Dashboard branding,
 * breadcrumb navigation (showing root "Epics" path), and the main content area.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify header renders with SAGA Dashboard branding (text is split across elements)
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText(DASHBOARD_PATTERN)).toBeInTheDocument();

    // Verify breadcrumb shows root "Epics" path
    await expect(canvas.getByText('Epics')).toBeInTheDocument();

    // Verify main content area renders
    await expect(canvas.getByText('Main content area (via Outlet)')).toBeInTheDocument();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'layout-default');
  },
  decorators: [
    (Story) => (
      <DashboardProvider logic={dashboardMachine}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Story />}>
              <Route
                index={true}
                element={
                  <div className="p-4 border border-dashed border-border rounded-lg">
                    <p className="text-text-muted text-center">Main content area (via Outlet)</p>
                  </div>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </DashboardProvider>
    ),
  ],
};

/**
 * Layout with sample page content to demonstrate how page components
 * render within the layout shell.
 */
export const WithPageContent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify header renders
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();

    // Verify page content title renders (distinct from breadcrumb)
    const epicHeadings = canvas.getAllByText('Epics');
    await expect(epicHeadings.length).toBeGreaterThanOrEqual(1);

    // Verify sample epic cards render
    await expect(canvas.getByText('Sample Epic 1')).toBeInTheDocument();
    await expect(canvas.getByText('Sample Epic 2')).toBeInTheDocument();
    await expect(canvas.getByText('Sample Epic 3')).toBeInTheDocument();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'layout-with-page-content');
  },
  decorators: [
    (Story) => (
      <DashboardProvider logic={dashboardMachine}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Story />}>
              <Route
                index={true}
                element={
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-text">Epics</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {SAMPLE_CARD_INDICES.map((i) => (
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
      </DashboardProvider>
    ),
  ],
};

/**
 * Layout as it appears on an epic detail page, showing the breadcrumb
 * with an epic slug in the path.
 */
export const EpicDetailView: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify header renders
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();

    // Verify breadcrumb shows epic path
    await expect(canvas.getByText('Epics')).toBeInTheDocument();

    // Text appears in both breadcrumb and page content, so use getAllByText
    const epicSlugElements = canvas.getAllByText('dashboard-restructure');
    await expect(epicSlugElements.length).toBeGreaterThanOrEqual(1);

    // Verify epic detail content renders
    await expect(canvas.getByText('Epic detail content area')).toBeInTheDocument();
  },
  decorators: [
    (Story) => (
      <DashboardProvider logic={dashboardMachine}>
        <MemoryRouter initialEntries={['/epic/dashboard-restructure']}>
          <Routes>
            <Route path="/" element={<Story />}>
              <Route index={true} element={<div />} />
            </Route>
            <Route path="/epic/:slug" element={<Story />}>
              <Route
                index={true}
                element={
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-text">dashboard-restructure</h2>
                    <p className="text-text-muted">Epic detail content area</p>
                  </div>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </DashboardProvider>
    ),
  ],
};

/**
 * Layout as it appears on a story detail page, showing the full
 * breadcrumb trail: Epics > epic-slug > story-slug
 */
export const StoryDetailView: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify header renders
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();

    // Verify full breadcrumb trail renders
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    await expect(canvas.getByText('dashboard-restructure')).toBeInTheDocument();

    // Text appears in both breadcrumb and page content, so use getAllByText
    const storySlugElements = canvas.getAllByText('storybook-setup');
    await expect(storySlugElements.length).toBeGreaterThanOrEqual(1);

    // Verify story detail content renders
    await expect(canvas.getByText('Story detail content area')).toBeInTheDocument();
  },
  decorators: [
    (Story) => (
      <DashboardProvider logic={dashboardMachine}>
        <MemoryRouter initialEntries={['/epic/dashboard-restructure/story/storybook-setup']}>
          <Routes>
            <Route path="/" element={<Story />}>
              <Route index={true} element={<div />} />
            </Route>
            <Route path="/epic/:epicSlug/story/:storySlug" element={<Story />}>
              <Route
                index={true}
                element={
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-text">storybook-setup</h2>
                    <p className="text-text-muted">Story detail content area</p>
                  </div>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </DashboardProvider>
    ),
  ],
};

export default meta;
