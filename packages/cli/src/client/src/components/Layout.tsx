import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router';
import { Toaster } from '@/components/ui/toaster';
import { useDashboard } from '@/context/dashboard-context';
import { useDashboardToasts } from '@/hooks/use-dashboard-toasts';
import { Breadcrumb } from './Breadcrumb.tsx';

export function Layout() {
  // Set up toast notifications for dashboard state changes
  useDashboardToasts();

  // Auto-connect to WebSocket on mount for real-time updates
  const { connect, isConnected } = useDashboard();
  const hasConnected = useRef(false);
  useEffect(() => {
    if (!hasConnected.current) {
      hasConnected.current = true;
      connect();
    }
  }, [connect]);

  return (
    <div className="min-h-screen bg-bg" data-ws-connected={isConnected}>
      <header className="border-b border-border-muted bg-bg-dark">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-text">
              <span className="text-primary">SAGA</span> Dashboard
            </h1>
          </div>
          <div className="mt-2">
            <Breadcrumb />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
