import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const CLIENT_DIR = path.dirname(new URL(import.meta.url).pathname);
// After flattening package structure, dependencies are in the main CLI package.json
const CLI_DIR = path.join(CLIENT_DIR, '..', '..');
const CLI_PACKAGE_JSON = path.join(CLI_DIR, 'package.json');

describe('shadcn/ui setup', () => {
  describe('dependencies (in main CLI package.json)', () => {
    let packageJson: Record<string, unknown>;
    let allDeps: Record<string, string>;

    beforeAll(() => {
      packageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, 'utf-8'));
      // Client dependencies may be in dependencies or devDependencies (devDeps since they're bundled)
      allDeps = {
        ...((packageJson.dependencies as Record<string, string>) || {}),
        ...((packageJson.devDependencies as Record<string, string>) || {}),
      };
    });

    it('should have class-variance-authority installed', () => {
      expect(allDeps['class-variance-authority']).toBeDefined();
    });

    it('should have clsx installed', () => {
      expect(allDeps.clsx).toBeDefined();
    });

    it('should have tailwind-merge installed', () => {
      expect(allDeps['tailwind-merge']).toBeDefined();
    });

    it('should have lucide-react installed', () => {
      expect(allDeps['lucide-react']).toBeDefined();
    });
  });

  describe('utility function', () => {
    it('should have lib/utils.ts with cn function', () => {
      const utilsPath = path.join(CLIENT_DIR, 'src', 'lib', 'utils.ts');
      expect(fs.existsSync(utilsPath)).toBe(true);

      const content = fs.readFileSync(utilsPath, 'utf-8');
      expect(content).toContain('export function cn');
      expect(content).toContain('clsx');
      expect(content).toContain('twMerge');
    });
  });

  describe('components.json configuration', () => {
    let componentsJson: Record<string, unknown>;

    beforeAll(() => {
      const componentsJsonPath = path.join(CLIENT_DIR, 'components.json');
      componentsJson = JSON.parse(fs.readFileSync(componentsJsonPath, 'utf-8'));
    });

    it('should have valid $schema', () => {
      expect(componentsJson.$schema).toBe('https://ui.shadcn.com/schema.json');
    });

    it('should use new-york style', () => {
      expect(componentsJson.style).toBe('new-york');
    });

    it('should have rsc set to false', () => {
      expect(componentsJson.rsc).toBe(false);
    });

    it('should have tsx set to true', () => {
      expect(componentsJson.tsx).toBe(true);
    });

    it('should have tailwind configuration', () => {
      const tailwind = componentsJson.tailwind as Record<string, unknown>;
      expect(tailwind).toBeDefined();
      expect(tailwind.config).toBe('tailwind.config.js');
      expect(tailwind.css).toBe('src/index.css');
      expect(tailwind.cssVariables).toBe(true);
    });

    it('should have correct aliases', () => {
      const aliases = componentsJson.aliases as Record<string, string>;
      expect(aliases).toBeDefined();
      expect(aliases.components).toBe('@/components');
      expect(aliases.utils).toBe('@/lib/utils');
      expect(aliases.ui).toBe('@/components/ui');
      expect(aliases.lib).toBe('@/lib');
      expect(aliases.hooks).toBe('@/hooks');
    });

    it('should use lucide icon library', () => {
      expect(componentsJson.iconLibrary).toBe('lucide');
    });
  });

  describe('required UI components', () => {
    const uiDir = path.join(CLIENT_DIR, 'src', 'components', 'ui');

    it('should have Button component', () => {
      const buttonPath = path.join(uiDir, 'button.tsx');
      expect(fs.existsSync(buttonPath)).toBe(true);

      const content = fs.readFileSync(buttonPath, 'utf-8');
      expect(content).toContain('Button');
      expect(content).toContain('buttonVariants');
    });

    it('should have Card component', () => {
      const cardPath = path.join(uiDir, 'card.tsx');
      expect(fs.existsSync(cardPath)).toBe(true);

      const content = fs.readFileSync(cardPath, 'utf-8');
      expect(content).toContain('Card');
      expect(content).toContain('CardHeader');
      expect(content).toContain('CardContent');
    });

    it('should have Badge component', () => {
      const badgePath = path.join(uiDir, 'badge.tsx');
      expect(fs.existsSync(badgePath)).toBe(true);

      const content = fs.readFileSync(badgePath, 'utf-8');
      expect(content).toContain('Badge');
      expect(content).toContain('badgeVariants');
    });

    it('should have Progress component', () => {
      const progressPath = path.join(uiDir, 'progress.tsx');
      expect(fs.existsSync(progressPath)).toBe(true);

      const content = fs.readFileSync(progressPath, 'utf-8');
      expect(content).toContain('Progress');
    });

    it('should have Tabs component', () => {
      const tabsPath = path.join(uiDir, 'tabs.tsx');
      expect(fs.existsSync(tabsPath)).toBe(true);

      const content = fs.readFileSync(tabsPath, 'utf-8');
      expect(content).toContain('Tabs');
      expect(content).toContain('TabsList');
      expect(content).toContain('TabsTrigger');
      expect(content).toContain('TabsContent');
    });

    it('should have Toast components', () => {
      const toastPath = path.join(uiDir, 'toast.tsx');
      expect(fs.existsSync(toastPath)).toBe(true);

      const content = fs.readFileSync(toastPath, 'utf-8');
      expect(content).toContain('Toast');
    });

    it('should have Toaster component', () => {
      const toasterPath = path.join(uiDir, 'toaster.tsx');
      expect(fs.existsSync(toasterPath)).toBe(true);

      const content = fs.readFileSync(toasterPath, 'utf-8');
      expect(content).toContain('Toaster');
    });

    it('should have useToast hook', () => {
      const useToastPath = path.join(CLIENT_DIR, 'src', 'hooks', 'use-toast.ts');
      expect(fs.existsSync(useToastPath)).toBe(true);

      const content = fs.readFileSync(useToastPath, 'utf-8');
      expect(content).toContain('useToast');
      expect(content).toContain('toast');
    });

    it('should have Collapsible component', () => {
      const collapsiblePath = path.join(uiDir, 'collapsible.tsx');
      expect(fs.existsSync(collapsiblePath)).toBe(true);

      const content = fs.readFileSync(collapsiblePath, 'utf-8');
      expect(content).toContain('Collapsible');
      expect(content).toContain('CollapsibleTrigger');
      expect(content).toContain('CollapsibleContent');
    });
  });

  describe('CSS variables for shadcn/ui theming', () => {
    let cssContent: string;

    beforeAll(() => {
      const cssPath = path.join(CLIENT_DIR, 'src', 'index.css');
      cssContent = fs.readFileSync(cssPath, 'utf-8');
    });

    it('should have background CSS variable', () => {
      expect(cssContent).toContain('--background:');
    });

    it('should have foreground CSS variable', () => {
      expect(cssContent).toContain('--foreground:');
    });

    it('should have card CSS variables', () => {
      expect(cssContent).toContain('--card:');
      expect(cssContent).toContain('--card-foreground:');
    });

    it('should have primary CSS variables', () => {
      expect(cssContent).toContain('--primary:');
      expect(cssContent).toContain('--primary-foreground:');
    });

    it('should have secondary CSS variables', () => {
      expect(cssContent).toContain('--secondary:');
      expect(cssContent).toContain('--secondary-foreground:');
    });

    it('should have muted CSS variables', () => {
      expect(cssContent).toContain('--muted:');
      expect(cssContent).toContain('--muted-foreground:');
    });

    it('should have accent CSS variables', () => {
      expect(cssContent).toContain('--accent:');
      expect(cssContent).toContain('--accent-foreground:');
    });

    it('should have destructive CSS variables', () => {
      expect(cssContent).toContain('--destructive:');
    });

    it('should have border and input CSS variables', () => {
      expect(cssContent).toContain('--border:');
      expect(cssContent).toContain('--input:');
    });

    it('should have ring-3 CSS variable', () => {
      expect(cssContent).toContain('--ring:');
    });

    it('should have radius CSS variable', () => {
      expect(cssContent).toContain('--radius:');
    });
  });

  describe('tailwind config extensions for shadcn/ui', () => {
    let tailwindConfig: string;

    beforeAll(() => {
      const tailwindConfigPath = path.join(CLIENT_DIR, 'tailwind.config.js');
      tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf-8');
    });

    it('should have tailwindcss-animate plugin', () => {
      expect(tailwindConfig).toContain('tailwindcss-animate');
    });

    it('should extend border-radius with radius variable', () => {
      expect(tailwindConfig).toContain('borderRadius');
      expect(tailwindConfig).toContain('--radius');
    });
  });

  describe('App root setup', () => {
    it('should have Toaster provider in App.tsx', () => {
      const appPath = path.join(CLIENT_DIR, 'src', 'App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');

      expect(content).toContain('Toaster');
      expect(content).toContain("from '@/components/ui/toaster'");
    });
  });
});
