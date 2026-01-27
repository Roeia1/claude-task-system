import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const clientDir = join(__dirname);

describe('Toast Notifications - t10', () => {
  describe('Toast utility functions', () => {
    const toastUtilsPath = join(clientDir, 'src/lib/toast-utils.ts');

    it('should have toast-utils.ts file', () => {
      expect(existsSync(toastUtilsPath)).toBe(true);
    });

    it('should export showErrorToast function', () => {
      const content = readFileSync(toastUtilsPath, 'utf-8');
      expect(content).toMatch(/export\s+(function|const)\s+showErrorToast/);
    });

    it('should export showReconnectingToast function', () => {
      const content = readFileSync(toastUtilsPath, 'utf-8');
      expect(content).toMatch(/export\s+(function|const)\s+showReconnectingToast/);
    });

    it('should export showConnectionErrorToast function', () => {
      const content = readFileSync(toastUtilsPath, 'utf-8');
      expect(content).toMatch(/export\s+(function|const)\s+showConnectionErrorToast/);
    });

    it('should import toast from use-toast hook', () => {
      const content = readFileSync(toastUtilsPath, 'utf-8');
      expect(content).toMatch(/import.*\{.*toast.*\}.*from.*['"]@\/hooks\/use-toast['"]/);
    });

    it('should use destructive variant for error toasts', () => {
      const content = readFileSync(toastUtilsPath, 'utf-8');
      expect(content).toContain("variant: 'destructive'");
    });
  });

  describe('use-toast hook enhancements', () => {
    const useToastPath = join(clientDir, 'src/hooks/use-toast.ts');

    it('should have TOAST_REMOVE_DELAY constant', () => {
      const content = readFileSync(useToastPath, 'utf-8');
      expect(content).toContain('TOAST_REMOVE_DELAY');
    });

    it('should support duration property in toast', () => {
      const content = readFileSync(useToastPath, 'utf-8');
      // Duration should be part of ToasterToast type
      expect(content).toMatch(/duration\??:\s*(number|React\.ReactNode)/);
    });
  });

  describe('Error toast integration in EpicList', () => {
    const epicListPath = join(clientDir, 'src/pages/EpicList.tsx');

    it('should import toast utilities', () => {
      const content = readFileSync(epicListPath, 'utf-8');
      expect(content).toMatch(/import.*from.*['"]@\/lib\/toast-utils['"]/);
    });

    it('should show toast on API fetch failure', () => {
      const content = readFileSync(epicListPath, 'utf-8');
      // Should call showApiErrorToast in catch block
      expect(content).toContain('showApiErrorToast');
      expect(content).toContain('catch');
    });
  });

  describe('Error toast integration in EpicDetail', () => {
    const epicDetailPath = join(clientDir, 'src/pages/EpicDetail.tsx');

    it('should import toast utilities', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      expect(content).toMatch(/import.*from.*['"]@\/lib\/toast-utils['"]/);
    });

    it('should show toast on API fetch failure', () => {
      const content = readFileSync(epicDetailPath, 'utf-8');
      // Should call showApiErrorToast in catch block
      expect(content).toContain('showApiErrorToast');
      expect(content).toContain('catch');
    });
  });

  describe('Error toast integration in StoryDetail', () => {
    const storyDetailPath = join(clientDir, 'src/pages/StoryDetail.tsx');

    it('should import toast utilities', () => {
      const content = readFileSync(storyDetailPath, 'utf-8');
      expect(content).toMatch(/import.*from.*['"]@\/lib\/toast-utils['"]/);
    });

    it('should show toast on API fetch failure', () => {
      const content = readFileSync(storyDetailPath, 'utf-8');
      // Should call showApiErrorToast in catch block
      expect(content).toContain('showApiErrorToast');
      expect(content).toContain('catch');
    });
  });

  describe('WebSocket error toast notifications', () => {
    const toastHookPath = join(clientDir, 'src/hooks/use-dashboard-toasts.ts');

    it('should have use-dashboard-toasts hook file', () => {
      expect(existsSync(toastHookPath)).toBe(true);
    });

    it('should import useDashboard hook', () => {
      const content = readFileSync(toastHookPath, 'utf-8');
      expect(content).toMatch(/import.*\{.*useDashboard.*\}.*from.*['"]@\/context\/DashboardContext['"]/);
    });

    it('should import toast utilities or toast function', () => {
      const content = readFileSync(toastHookPath, 'utf-8');
      expect(content).toContain("from '@/lib/toast-utils'");
    });

    it('should react to error state changes with useEffect', () => {
      const content = readFileSync(toastHookPath, 'utf-8');
      expect(content).toContain('useEffect');
      expect(content).toMatch(/isError|state.*===.*['"]error['"]/);
    });

    it('should react to reconnecting state changes', () => {
      const content = readFileSync(toastHookPath, 'utf-8');
      expect(content).toMatch(/isReconnecting|state.*===.*['"]reconnecting['"]/);
    });

    it('should show connection error toast on error state', () => {
      const content = readFileSync(toastHookPath, 'utf-8');
      expect(content).toMatch(/showConnectionErrorToast|showErrorToast/);
    });

    it('should show reconnecting toast on reconnecting state', () => {
      const content = readFileSync(toastHookPath, 'utf-8');
      expect(content).toContain('showReconnectingToast');
    });
  });

  describe('Dashboard toasts integration in Layout', () => {
    const layoutPath = join(clientDir, 'src/components/Layout.tsx');

    it('should import useDashboardToasts hook', () => {
      const content = readFileSync(layoutPath, 'utf-8');
      expect(content).toMatch(/import.*\{.*useDashboardToasts.*\}.*from.*['"]@\/hooks\/use-dashboard-toasts['"]/);
    });

    it('should call useDashboardToasts in Layout component', () => {
      const content = readFileSync(layoutPath, 'utf-8');
      expect(content).toContain('useDashboardToasts()');
    });
  });

  describe('Toast dismissal behavior', () => {
    const toastUtilsPath = join(clientDir, 'src/lib/toast-utils.ts');

    it('should have different durations for error vs info toasts', () => {
      const content = readFileSync(toastUtilsPath, 'utf-8');
      // Error toasts should use Infinity for duration
      expect(content).toContain('ERROR_TOAST_DURATION = Infinity');
      // Info toasts should have a shorter duration
      expect(content).toContain('INFO_TOAST_DURATION');
    });
  });

  describe('Toast retry action support', () => {
    const toastUtilsPath = join(clientDir, 'src/lib/toast-utils.ts');

    it('should support optional retry action in showConnectionErrorToast', () => {
      const content = readFileSync(toastUtilsPath, 'utf-8');
      // Function should accept onRetry parameter
      expect(content).toContain('showConnectionErrorToast');
      expect(content).toContain('onRetry');
    });

    it('should use ToastAction component for retry button', () => {
      const content = readFileSync(toastUtilsPath, 'utf-8');
      expect(content).toContain('ToastAction');
    });
  });

  describe('Duplicate toast prevention', () => {
    const toastUtilsPath = join(clientDir, 'src/lib/toast-utils.ts');

    it('should track active toasts to prevent duplicates', () => {
      const content = readFileSync(toastUtilsPath, 'utf-8');
      // Should have some mechanism to track active toasts
      expect(content).toMatch(/(activeToasts|toastIds|shownToasts|Map|Set)/);
    });
  });
});
