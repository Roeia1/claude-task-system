import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const clientDir = join(__dirname);
const srcDir = join(clientDir, 'src');
const packagesDir = join(__dirname, '..');
// After flattening package structure, dependencies are in the main CLI package.json
const cliDir = join(__dirname, '..', '..');
const cliPackageJson = join(cliDir, 'package.json');

describe('XState Dashboard State Machine - t5', () => {
  describe('dependencies (in main CLI package.json)', () => {
    it('should have xstate installed', () => {
      const packageJson = JSON.parse(
        readFileSync(cliPackageJson, 'utf-8')
      );
      const hasDependency =
        packageJson.dependencies?.xstate || packageJson.devDependencies?.xstate;
      expect(hasDependency).toBeTruthy();
    });

    it('should have @xstate/react installed', () => {
      const packageJson = JSON.parse(
        readFileSync(cliPackageJson, 'utf-8')
      );
      const hasDependency =
        packageJson.dependencies?.['@xstate/react'] ||
        packageJson.devDependencies?.['@xstate/react'];
      expect(hasDependency).toBeTruthy();
    });
  });

  describe('machine file structure', () => {
    it('should have a machines directory', () => {
      expect(existsSync(join(srcDir, 'machines'))).toBe(true);
    });

    it('should have dashboardMachine.ts file', () => {
      expect(existsSync(join(srcDir, 'machines', 'dashboardMachine.ts'))).toBe(
        true
      );
    });

    it('should export dashboardMachine', () => {
      const content = readFileSync(
        join(srcDir, 'machines', 'dashboardMachine.ts'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(const|function)\s+dashboardMachine/);
    });
  });

  describe('machine configuration', () => {
    let machineContent: string;

    beforeAll(() => {
      machineContent = readFileSync(
        join(srcDir, 'machines', 'dashboardMachine.ts'),
        'utf-8'
      );
    });

    it('should use setup() from xstate v5', () => {
      expect(machineContent).toMatch(/import\s*\{[^}]*setup[^}]*\}\s*from\s*['"]xstate['"]/);
    });

    it('should define idle state', () => {
      expect(machineContent).toMatch(/idle\s*:/);
    });

    it('should define loading state', () => {
      expect(machineContent).toMatch(/loading\s*:/);
    });

    it('should define connected state', () => {
      expect(machineContent).toMatch(/connected\s*:/);
    });

    it('should define error state', () => {
      expect(machineContent).toMatch(/error\s*:/);
    });

    it('should define reconnecting state', () => {
      expect(machineContent).toMatch(/reconnecting\s*:/);
    });
  });

  describe('context types', () => {
    let machineContent: string;

    beforeAll(() => {
      machineContent = readFileSync(
        join(srcDir, 'machines', 'dashboardMachine.ts'),
        'utf-8'
      );
    });

    it('should define context type with epics array', () => {
      expect(machineContent).toMatch(/epics\s*:/);
    });

    it('should define context type with currentEpic', () => {
      expect(machineContent).toMatch(/currentEpic\s*:/);
    });

    it('should define context type with currentStory', () => {
      expect(machineContent).toMatch(/currentStory\s*:/);
    });

    it('should define context type with error', () => {
      expect(machineContent).toMatch(/error\s*:/);
    });

    it('should define context type with retryCount', () => {
      expect(machineContent).toMatch(/retryCount\s*:/);
    });
  });

  describe('events', () => {
    let machineContent: string;

    beforeAll(() => {
      machineContent = readFileSync(
        join(srcDir, 'machines', 'dashboardMachine.ts'),
        'utf-8'
      );
    });

    it('should handle CONNECT event', () => {
      expect(machineContent).toMatch(/CONNECT/);
    });

    it('should handle DISCONNECT event', () => {
      expect(machineContent).toMatch(/DISCONNECT/);
    });

    it('should handle EPICS_LOADED event', () => {
      expect(machineContent).toMatch(/EPICS_LOADED/);
    });

    it('should handle EPIC_LOADED event', () => {
      expect(machineContent).toMatch(/EPIC_LOADED/);
    });

    it('should handle STORY_LOADED event', () => {
      expect(machineContent).toMatch(/STORY_LOADED/);
    });

    it('should handle WS_CONNECTED event', () => {
      expect(machineContent).toMatch(/WS_CONNECTED/);
    });

    it('should handle WS_DISCONNECTED event', () => {
      expect(machineContent).toMatch(/WS_DISCONNECTED/);
    });

    it('should handle WS_ERROR event', () => {
      expect(machineContent).toMatch(/WS_ERROR/);
    });

    it('should handle RETRY event', () => {
      expect(machineContent).toMatch(/RETRY/);
    });

    it('should handle EPICS_UPDATED event for real-time updates', () => {
      expect(machineContent).toMatch(/EPICS_UPDATED/);
    });

    it('should handle STORY_UPDATED event for real-time updates', () => {
      expect(machineContent).toMatch(/STORY_UPDATED/);
    });
  });

  describe('state transitions', () => {
    let machineContent: string;

    beforeAll(() => {
      machineContent = readFileSync(
        join(srcDir, 'machines', 'dashboardMachine.ts'),
        'utf-8'
      );
    });

    it('should transition from idle to loading on CONNECT', () => {
      // The machine should have a transition from idle state on CONNECT event
      expect(machineContent).toMatch(/idle[\s\S]*?on[\s\S]*?CONNECT/);
    });

    it('should have entry action on loading state', () => {
      // Loading state should trigger data fetching
      expect(machineContent).toMatch(/loading[\s\S]*?entry/);
    });

    it('should transition to connected from loading on success', () => {
      expect(machineContent).toMatch(/connected/);
    });

    it('should transition to error on failure', () => {
      expect(machineContent).toMatch(/error/);
    });

    it('should have reconnecting logic with retry', () => {
      expect(machineContent).toMatch(/reconnecting/);
    });
  });

  describe('retry logic', () => {
    let machineContent: string;

    beforeAll(() => {
      machineContent = readFileSync(
        join(srcDir, 'machines', 'dashboardMachine.ts'),
        'utf-8'
      );
    });

    it('should track retry count in context', () => {
      expect(machineContent).toMatch(/retryCount/);
    });

    it('should have max retries constant', () => {
      expect(machineContent).toMatch(/MAX_RETRIES|maxRetries/i);
    });

    it('should implement exponential backoff delay', () => {
      // Should have some form of exponential calculation
      expect(machineContent).toMatch(/Math\.pow|Math\.min|\*\*|backoff/i);
    });
  });

  describe('TypeScript types', () => {
    it('should have types file for dashboard data models', () => {
      expect(existsSync(join(srcDir, 'types', 'dashboard.ts'))).toBe(true);
    });

    it('should export EpicSummary type', () => {
      const content = readFileSync(
        join(srcDir, 'types', 'dashboard.ts'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(interface|type)\s+EpicSummary/);
    });

    it('should export Epic type', () => {
      const content = readFileSync(
        join(srcDir, 'types', 'dashboard.ts'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(interface|type)\s+Epic/);
    });

    it('should export StoryDetail type', () => {
      const content = readFileSync(
        join(srcDir, 'types', 'dashboard.ts'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(interface|type)\s+StoryDetail/);
    });

    it('should export Task type', () => {
      const content = readFileSync(
        join(srcDir, 'types', 'dashboard.ts'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(interface|type)\s+Task/);
    });

    it('should export JournalEntry type', () => {
      const content = readFileSync(
        join(srcDir, 'types', 'dashboard.ts'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(interface|type)\s+JournalEntry/);
    });
  });

  describe('React integration', () => {
    it('should have DashboardContext file', () => {
      expect(
        existsSync(join(srcDir, 'context', 'DashboardContext.tsx'))
      ).toBe(true);
    });

    it('should export DashboardProvider component', () => {
      const content = readFileSync(
        join(srcDir, 'context', 'DashboardContext.tsx'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(const|function)\s+DashboardProvider/);
    });

    it('should export useDashboard hook', () => {
      const content = readFileSync(
        join(srcDir, 'context', 'DashboardContext.tsx'),
        'utf-8'
      );
      expect(content).toMatch(/export\s+(const|function)\s+useDashboard/);
    });

    it('should use createActorContext from @xstate/react', () => {
      const content = readFileSync(
        join(srcDir, 'context', 'DashboardContext.tsx'),
        'utf-8'
      );
      expect(content).toMatch(/createActorContext|useActorRef|useSelector/);
    });
  });

  describe('machine exports', () => {
    it('should have index file exporting machine', () => {
      expect(existsSync(join(srcDir, 'machines', 'index.ts'))).toBe(true);
    });

    it('should re-export dashboardMachine from index', () => {
      const content = readFileSync(
        join(srcDir, 'machines', 'index.ts'),
        'utf-8'
      );
      expect(content).toMatch(/export.*dashboardMachine/);
    });
  });
});
