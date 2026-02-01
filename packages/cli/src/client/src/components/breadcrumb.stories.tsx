import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, within } from 'storybook/test';
import { matchDomSnapshot } from '@/test-utils/visual-snapshot';
import { Breadcrumb } from './Breadcrumb.tsx';

// ============================================================================
// Route Presets
// ============================================================================

/** Regex pattern for matching "Epics" link text (case insensitive) */
const EPICS_LINK_PATTERN = /epics/i;

/** Available route presets for Playground */
const routePresets = ['root', 'epicDetail', 'storyDetail', 'longEpicSlug', 'longSlugs'] as const;
type RoutePreset = (typeof routePresets)[number];

/** Route configuration for each preset */
const routeConfigs: Record<RoutePreset, { route: string; description: string }> = {
  root: {
    route: '/',
    description: 'Epic list page (root)',
  },
  epicDetail: {
    route: '/epic/dashboard-restructure',
    description: 'Epic detail page',
  },
  storyDetail: {
    route: '/epic/dashboard-restructure/story/storybook-setup',
    description: 'Story detail page',
  },
  longEpicSlug: {
    route: '/epic/implement-authentication-and-authorization-system',
    description: 'Long epic slug',
  },
  longSlugs: {
    route:
      '/epic/implement-authentication-and-authorization-system/story/add-oauth-provider-integration',
    description: 'Long epic and story slugs',
  },
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Wrapper component providing router context for Breadcrumb stories.
 */
function BreadcrumbWithRouter({ route }: { route: string }) {
  return (
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={<Breadcrumb />} />
        <Route path="/epic/:slug" element={<Breadcrumb />} />
        <Route path="/epic/:epicSlug/story/:storySlug" element={<Breadcrumb />} />
      </Routes>
    </MemoryRouter>
  );
}

// ============================================================================
// Story Meta
// ============================================================================

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
const meta: Meta<{ preset: RoutePreset; customRoute: string }> = {
  title: 'Atoms/Breadcrumb',
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
  argTypes: {
    preset: {
      control: 'select',
      options: routePresets,
      description: 'Route preset determining breadcrumb display',
    },
    customRoute: {
      control: 'text',
      description: 'Custom route path (overrides preset when provided)',
    },
  },
  args: {
    preset: 'root',
    customRoute: '',
  },
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Curated display of Breadcrumb variants showing all navigation states.
 */
const Showcase: Story = {
  render: () => (
    <div className="space-y-8">
      {/* Core Navigation States */}
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-3">Navigation States</h3>
        <div className="space-y-4">
          <div>
            <span className="text-xs text-text-muted block mb-1">Root (Epic List):</span>
            <BreadcrumbWithRouter route="/" />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">Epic Detail:</span>
            <BreadcrumbWithRouter route="/epic/dashboard-restructure" />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">Story Detail:</span>
            <BreadcrumbWithRouter route="/epic/dashboard-restructure/story/storybook-setup" />
          </div>
        </div>
      </section>

      {/* Edge Cases */}
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-3">Edge Cases (Long Slugs)</h3>
        <div className="space-y-4">
          <div>
            <span className="text-xs text-text-muted block mb-1">Long Epic Slug:</span>
            <BreadcrumbWithRouter route="/epic/implement-authentication-and-authorization-system" />
          </div>
          <div>
            <span className="text-xs text-text-muted block mb-1">Long Epic + Story Slugs:</span>
            <BreadcrumbWithRouter route="/epic/implement-authentication-and-authorization-system/story/add-oauth-provider-integration" />
          </div>
        </div>
      </section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify section headers
    await expect(canvas.getByText('Navigation States')).toBeInTheDocument();
    await expect(canvas.getByText('Edge Cases (Long Slugs)')).toBeInTheDocument();

    // Verify root breadcrumb - contains "Epics" text and home icon
    const epicsTexts = canvas.getAllByText('Epics');
    await expect(epicsTexts.length).toBeGreaterThan(0);
    const homeIcons = canvas.getAllByTestId('breadcrumb-home-icon');
    await expect(homeIcons.length).toBeGreaterThan(0);

    // Verify epic/story detail breadcrumbs - dashboard-restructure appears in both epic and story detail
    const dashboardRestructureTexts = canvas.getAllByText('dashboard-restructure');
    await expect(dashboardRestructureTexts.length).toBeGreaterThanOrEqual(2); // Epic detail + Story detail

    // Verify story detail breadcrumb - contains storybook-setup
    await expect(canvas.getByText('storybook-setup')).toBeInTheDocument();

    // Verify long slugs are displayed
    const longEpicSlugs = canvas.getAllByText('implement-authentication-and-authorization-system');
    await expect(longEpicSlugs.length).toBe(2); // Appears in both long slug examples
    await expect(canvas.getByText('add-oauth-provider-integration')).toBeInTheDocument();

    // Visual snapshot test
    await matchDomSnapshot(canvasElement, 'breadcrumb-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring Breadcrumb with different routes.
 * Use the preset selector or enter a custom route path.
 */
const Playground: Story = {
  render: (args) => {
    const route = args.customRoute || routeConfigs[args.preset].route;
    return (
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-medium text-text-muted mb-2">
            {args.customRoute ? 'Custom Route' : routeConfigs[args.preset].description}
          </h3>
          <p className="text-xs text-text-muted mb-3 font-mono">{route}</p>
          <BreadcrumbWithRouter route={route} />
        </section>
      </div>
    );
  },
  args: {
    preset: 'root',
    customRoute: '',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify the breadcrumb renders - at minimum, nav element should exist
    const nav = canvas.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(nav).toBeInTheDocument();

    // For root preset, verify home icon and Epics text
    if (args.preset === 'root' && !args.customRoute) {
      await expect(canvas.getByTestId('breadcrumb-home-icon')).toBeInTheDocument();
      await expect(canvas.getByText('Epics')).toBeInTheDocument();
      // Root has no separators
      const separators = canvas.queryAllByTestId('breadcrumb-separator');
      await expect(separators.length).toBe(0);
    }

    // For epicDetail preset, verify Epics link and epic slug
    if (args.preset === 'epicDetail' && !args.customRoute) {
      const epicsLink = canvas.getByRole('link', { name: EPICS_LINK_PATTERN });
      await expect(epicsLink).toHaveAttribute('href', '/');
      await expect(canvas.getByText('dashboard-restructure')).toBeInTheDocument();
      const separators = canvas.getAllByTestId('breadcrumb-separator');
      await expect(separators.length).toBe(1);
    }

    // For storyDetail preset, verify full breadcrumb trail
    if (args.preset === 'storyDetail' && !args.customRoute) {
      const epicsLink = canvas.getByRole('link', { name: EPICS_LINK_PATTERN });
      await expect(epicsLink).toHaveAttribute('href', '/');
      const epicSlugLink = canvas.getByRole('link', { name: 'dashboard-restructure' });
      await expect(epicSlugLink).toHaveAttribute('href', '/epic/dashboard-restructure');
      await expect(canvas.getByText('storybook-setup')).toBeInTheDocument();
      const separators = canvas.getAllByTestId('breadcrumb-separator');
      await expect(separators.length).toBe(2);
    }

    // Accessibility: Verify nav has proper aria-label
    await expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  },
};

// ============================================================================
// Exports
// ============================================================================

export default meta;
export { Showcase, Playground };
