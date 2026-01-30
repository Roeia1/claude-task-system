import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DashboardProvider } from './context/DashboardContext';
import { AppRouter } from './router';
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
