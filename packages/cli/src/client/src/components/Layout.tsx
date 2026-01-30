import { Outlet } from 'react-router';
import { Toaster } from '@/components/ui/toaster';
import { useDashboardToasts } from '@/hooks/use-dashboard-toasts';
import { Breadcrumb } from './Breadcrumb.tsx';

export function Layout() {
  // Set up toast notifications for dashboard state changes
  useDashboardToasts();

  return (
    <div class="min-h-screen bg-bg">
      <header class="border-b border-border-muted bg-bg-dark">
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold text-text">
              <span class="text-primary">SAGA</span> Dashboard
            </h1>
          </div>
          <div class="mt-2">
            <Breadcrumb />
          </div>
        </div>
      </header>
      <main class="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
