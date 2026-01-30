import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const CLIENT_DIR = path.join(__dirname, '.');
// After flattening package structure, dependencies are in the main CLI package.json
const CLI_DIR = path.join(__dirname, '..', '..');
const CLI_PACKAGE_JSON = path.join(CLI_DIR, 'package.json');

describe('Vite React TypeScript Project Setup', () => {
  describe('Required files exist', () => {
    it('should have package.json (in main CLI package)', () => {
      expect(fs.existsSync(CLI_PACKAGE_JSON)).toBe(true);
    });

    it('should have vite.config.ts', () => {
      const viteConfigPath = path.join(CLIENT_DIR, 'vite.config.ts');
      expect(fs.existsSync(viteConfigPath)).toBe(true);
    });

    it('should have tsconfig.json', () => {
      const tsconfigPath = path.join(CLIENT_DIR, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);
    });

    it('should have index.html', () => {
      const indexPath = path.join(CLIENT_DIR, 'index.html');
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('should have src/main.tsx', () => {
      const mainPath = path.join(CLIENT_DIR, 'src', 'main.tsx');
      expect(fs.existsSync(mainPath)).toBe(true);
    });

    it('should have src/App.tsx', () => {
      const appPath = path.join(CLIENT_DIR, 'src', 'App.tsx');
      expect(fs.existsSync(appPath)).toBe(true);
    });
  });

  describe('Package configuration (in main CLI package.json)', () => {
    it('should have React 18+ as dependency', () => {
      const packageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, 'utf-8'));
      // React may be in dependencies or devDependencies (devDeps since it's bundled by Vite)
      const reactVersion = packageJson.dependencies?.react || packageJson.devDependencies?.react;
      expect(reactVersion).toBeDefined();
      // Version should be 18.x or higher (^18, ~18, 18.x, etc.)
      expect(reactVersion).toMatch(/^[\^~]?18\./);
    });

    it('should have TypeScript as devDependency', () => {
      const packageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, 'utf-8'));
      expect(packageJson.devDependencies?.typescript).toBeDefined();
    });

    it('should have Vite as devDependency', () => {
      const packageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, 'utf-8'));
      expect(packageJson.devDependencies?.vite).toBeDefined();
    });

    it('should have dev:client script for client development', () => {
      const packageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, 'utf-8'));
      expect(packageJson.scripts?.['dev:client']).toBeDefined();
    });

    it('should have build:client script for client build', () => {
      const packageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, 'utf-8'));
      expect(packageJson.scripts?.['build:client']).toBeDefined();
    });
  });

  describe('TypeScript configuration', () => {
    it('should have strict mode enabled', () => {
      const tsconfig = JSON.parse(fs.readFileSync(path.join(CLIENT_DIR, 'tsconfig.json'), 'utf-8'));
      expect(tsconfig.compilerOptions?.strict).toBe(true);
    });

    it('should have path aliases configured for @/', () => {
      const tsconfig = JSON.parse(fs.readFileSync(path.join(CLIENT_DIR, 'tsconfig.json'), 'utf-8'));
      const paths = tsconfig.compilerOptions?.paths;
      expect(paths).toBeDefined();
      expect(paths['@/*']).toBeDefined();
    });
  });

  describe('Vite configuration', () => {
    it('should have vite.config.ts with React plugin', async () => {
      const viteConfigContent = fs.readFileSync(path.join(CLIENT_DIR, 'vite.config.ts'), 'utf-8');
      expect(viteConfigContent).toContain('@vitejs/plugin-react');
      expect(viteConfigContent).toContain('react()');
    });

    it('should have path alias resolution configured', async () => {
      const viteConfigContent = fs.readFileSync(path.join(CLIENT_DIR, 'vite.config.ts'), 'utf-8');
      expect(viteConfigContent).toContain('resolve');
      expect(viteConfigContent).toContain('alias');
      expect(viteConfigContent).toContain('@');
    });
  });
});
