import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const CLIENT_DIR = path.join(__dirname, '.');
// After flattening package structure, dependencies are in the main CLI package.json
const CLI_DIR = path.join(__dirname, '..', '..');
const CLI_PACKAGE_JSON = path.join(CLI_DIR, 'package.json');

describe('Tailwind CSS and Dark Theme Configuration', () => {
  describe('Tailwind CSS setup (dependencies in main CLI package.json)', () => {
    it('should have tailwindcss as devDependency', () => {
      const packageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, 'utf-8'));
      expect(packageJson.devDependencies?.tailwindcss).toBeDefined();
    });

    it('should have postcss as devDependency', () => {
      const packageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, 'utf-8'));
      expect(packageJson.devDependencies?.postcss).toBeDefined();
    });

    it('should have autoprefixer as devDependency', () => {
      const packageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, 'utf-8'));
      expect(packageJson.devDependencies?.autoprefixer).toBeDefined();
    });

    it('should have tailwind.config.js', () => {
      const tailwindConfigPath = path.join(CLIENT_DIR, 'tailwind.config.js');
      expect(fs.existsSync(tailwindConfigPath)).toBe(true);
    });

    it('should have postcss.config.js', () => {
      const postcssConfigPath = path.join(CLIENT_DIR, 'postcss.config.js');
      expect(fs.existsSync(postcssConfigPath)).toBe(true);
    });
  });

  describe('Tailwind directives in CSS', () => {
    it('should have @tailwind base directive', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toContain('@tailwind base');
    });

    it('should have @tailwind components directive', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toContain('@tailwind components');
    });

    it('should have @tailwind utilities directive', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toContain('@tailwind utilities');
    });
  });

  describe('Dark theme CSS variables', () => {
    it('should define --bg-dark variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--bg-dark:\s*oklch\(0\.1\s+0\.025\s+264\)/);
    });

    it('should define --bg variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--bg:\s*oklch\(0\.15\s+0\.025\s+264\)/);
    });

    it('should define --bg-light variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--bg-light:\s*oklch\(0\.2\s+0\.025\s+264\)/);
    });

    it('should define --text variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--text:\s*oklch\(0\.96\s+0\.05\s+264\)/);
    });

    it('should define --text-muted variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--text-muted:\s*oklch\(0\.76\s+0\.05\s+264\)/);
    });

    it('should define --highlight variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--highlight:\s*oklch\(0\.5\s+0\.05\s+264\)/);
    });

    it('should define --border variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--border:\s*oklch\(0\.4\s+0\.05\s+264\)/);
    });

    it('should define --border-muted variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--border-muted:\s*oklch\(0\.3\s+0\.05\s+264\)/);
    });

    it('should define --primary variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--primary:\s*oklch\(0\.76\s+0\.1\s+264\)/);
    });

    it('should define --secondary variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--secondary:\s*oklch\(0\.76\s+0\.1\s+84\)/);
    });

    it('should define --danger variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--danger:\s*oklch\(0\.7\s+0\.05\s+30\)/);
    });

    it('should define --warning variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--warning:\s*oklch\(0\.7\s+0\.05\s+100\)/);
    });

    it('should define --success variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--success:\s*oklch\(0\.7\s+0\.05\s+160\)/);
    });

    it('should define --info variable with oklch', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      expect(cssContent).toMatch(/--info:\s*oklch\(0\.7\s+0\.05\s+260\)/);
    });
  });

  describe('Tailwind configuration', () => {
    it('should configure content paths for React files', () => {
      const tailwindConfig = fs.readFileSync(path.join(CLIENT_DIR, 'tailwind.config.js'), 'utf-8');
      expect(tailwindConfig).toContain('content');
      expect(tailwindConfig).toContain('tsx');
    });

    it('should extend theme with custom colors', () => {
      const tailwindConfig = fs.readFileSync(path.join(CLIENT_DIR, 'tailwind.config.js'), 'utf-8');
      expect(tailwindConfig).toContain('extend');
      expect(tailwindConfig).toContain('colors');
    });

    it('should map colors to CSS variables', () => {
      const tailwindConfig = fs.readFileSync(path.join(CLIENT_DIR, 'tailwind.config.js'), 'utf-8');
      // Should use var(--bg), var(--primary), etc.
      expect(tailwindConfig).toContain('var(--');
    });
  });

  describe('Base styles', () => {
    it('should apply dark background to body', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      // Body should use --bg or --bg-dark variable
      expect(cssContent).toMatch(/body\s*\{[^}]*background[^}]*var\(--bg/);
    });

    it('should apply light text color to body', () => {
      const cssContent = fs.readFileSync(path.join(CLIENT_DIR, 'src', 'index.css'), 'utf-8');
      // Body should use --text variable
      expect(cssContent).toMatch(/body\s*\{[^}]*color[^}]*var\(--text\)/);
    });
  });
});
