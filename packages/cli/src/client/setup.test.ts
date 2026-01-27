import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const CLIENT_DIR = path.join(__dirname, '.');

describe('Vite React TypeScript Project Setup', () => {
  describe('Required files exist', () => {
    it('should have package.json', () => {
      const packageJsonPath = path.join(CLIENT_DIR, 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);
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

  describe('Package configuration', () => {
    it('should have React 18+ as dependency', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(CLIENT_DIR, 'package.json'), 'utf-8')
      );
      const reactVersion = packageJson.dependencies?.react;
      expect(reactVersion).toBeDefined();
      // Version should be 18.x or higher (^18, ~18, 18.x, etc.)
      expect(reactVersion).toMatch(/^[\^~]?18\./);
    });

    it('should have TypeScript as devDependency', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(CLIENT_DIR, 'package.json'), 'utf-8')
      );
      expect(packageJson.devDependencies?.typescript).toBeDefined();
    });

    it('should have Vite as devDependency', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(CLIENT_DIR, 'package.json'), 'utf-8')
      );
      expect(packageJson.devDependencies?.vite).toBeDefined();
    });

    it('should have dev script', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(CLIENT_DIR, 'package.json'), 'utf-8')
      );
      expect(packageJson.scripts?.dev).toBeDefined();
    });

    it('should have build script', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(CLIENT_DIR, 'package.json'), 'utf-8')
      );
      expect(packageJson.scripts?.build).toBeDefined();
    });
  });

  describe('TypeScript configuration', () => {
    it('should have strict mode enabled', () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(CLIENT_DIR, 'tsconfig.json'), 'utf-8')
      );
      expect(tsconfig.compilerOptions?.strict).toBe(true);
    });

    it('should have path aliases configured for @/', () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(CLIENT_DIR, 'tsconfig.json'), 'utf-8')
      );
      const paths = tsconfig.compilerOptions?.paths;
      expect(paths).toBeDefined();
      expect(paths['@/*']).toBeDefined();
    });
  });

  describe('Vite configuration', () => {
    it('should have vite.config.ts with React plugin', async () => {
      const viteConfigContent = fs.readFileSync(
        path.join(CLIENT_DIR, 'vite.config.ts'),
        'utf-8'
      );
      expect(viteConfigContent).toContain('@vitejs/plugin-react');
      expect(viteConfigContent).toContain('react()');
    });

    it('should have path alias resolution configured', async () => {
      const viteConfigContent = fs.readFileSync(
        path.join(CLIENT_DIR, 'vite.config.ts'),
        'utf-8'
      );
      expect(viteConfigContent).toContain('resolve');
      expect(viteConfigContent).toContain('alias');
      expect(viteConfigContent).toContain('@');
    });
  });
});
