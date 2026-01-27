import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './router';
import { DashboardProvider } from './context/DashboardContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DashboardProvider>
      <AppRouter />
    </DashboardProvider>
  </StrictMode>
);
