import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardProvider } from './context/dashboard-context.tsx';
import { AppRouter } from './router.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <DashboardProvider>
      <AppRouter />
    </DashboardProvider>
  </StrictMode>,
);
