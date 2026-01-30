import {
  dashboardMachine as dashboardMachineImpl,
  type DashboardContext,
  type DashboardEvent,
  type DashboardMachine,
} from './dashboardMachine.ts';

// Re-export without barrel pattern
const dashboardMachine = dashboardMachineImpl;

export { dashboardMachine };
export type { DashboardContext, DashboardEvent, DashboardMachine };
