import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Layout } from '@/components/Layout';
import { DashboardProvider } from '@/context/dashboard-context';
import { dashboardMachine } from '@/machines/dashboardMachine';

interface PageWrapperProps {
  /**
   * The children to render inside the Layout's main content area.
   */
  children: ReactNode;
  /**
   * The initial route for the MemoryRouter.
   * This determines the breadcrumb context.
   * Examples:
   * - "/" for EpicList page
   * - "/epic/my-epic" for EpicDetail page
   * - "/epic/my-epic/story/my-story" for StoryDetail page
   * @default "/"
   */
  route?: string;
}

/**
 * A wrapper component for Page stories that provides proper Layout context.
 *
 * This component wraps page content with:
 * - DashboardProvider for state management
 * - MemoryRouter with route definitions for breadcrumb context
 * - Layout component that renders header, breadcrumb, and content area
 *
 * Use this wrapper in Page stories to render pages as they appear in the
 * actual dashboard, with proper header and breadcrumb navigation.
 *
 * @example
 * ```tsx
 * // Epic List page at root
 * <PageWrapper route="/">
 *   <EpicList />
 * </PageWrapper>
 *
 * // Epic Detail page
 * <PageWrapper route="/epic/my-epic">
 *   <EpicDetail />
 * </PageWrapper>
 *
 * // Story Detail page
 * <PageWrapper route="/epic/my-epic/story/my-story">
 *   <StoryDetail />
 * </PageWrapper>
 * ```
 */
function PageWrapper({ children, route = '/' }: PageWrapperProps) {
  // The content to render inside the outlet
  const content = <>{children}</>;

  return (
    <DashboardProvider logic={dashboardMachine}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          {/* Root route */}
          <Route path="/" element={<Layout />}>
            <Route index={true} element={content} />
          </Route>

          {/* Epic detail route */}
          <Route path="/epic/:slug" element={<Layout />}>
            <Route index={true} element={content} />
          </Route>

          {/* Story detail route */}
          <Route path="/epic/:epicSlug/story/:storySlug" element={<Layout />}>
            <Route index={true} element={content} />
          </Route>
        </Routes>
      </MemoryRouter>
    </DashboardProvider>
  );
}

export { PageWrapper };
