import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const clientDir = path.join(__dirname, '.');
const srcDir = path.join(clientDir, 'src');

describe('React Router Setup', () => {
  describe('dependencies', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(clientDir, 'package.json'), 'utf-8'),
    );

    it('should have react-router-dom installed', () => {
      expect(packageJson.dependencies).toHaveProperty('react-router-dom');
    });

    it('should use react-router-dom v6 or higher', () => {
      const version = packageJson.dependencies['react-router-dom'];
      // Version should be ^6.x or higher
      expect(version).toMatch(/^[\^~]?6\./);
    });
  });

  describe('router configuration', () => {
    it('should have router.tsx file', () => {
      const routerPath = path.join(srcDir, 'router.tsx');
      expect(fs.existsSync(routerPath)).toBe(true);
    });

    it('should configure BrowserRouter', () => {
      const routerContent = fs.readFileSync(
        path.join(srcDir, 'router.tsx'),
        'utf-8',
      );
      expect(routerContent).toContain('BrowserRouter');
    });

    it('should define root route /', () => {
      const routerContent = fs.readFileSync(
        path.join(srcDir, 'router.tsx'),
        'utf-8',
      );
      expect(routerContent).toMatch(/path:\s*['"]\/['"]/);
    });

    it('should define epic detail route /epic/:slug', () => {
      const routerContent = fs.readFileSync(
        path.join(srcDir, 'router.tsx'),
        'utf-8',
      );
      expect(routerContent).toMatch(/path:\s*['"]epic\/:slug['"]/);
    });

    it('should define story detail route /epic/:epicSlug/story/:storySlug', () => {
      const routerContent = fs.readFileSync(
        path.join(srcDir, 'router.tsx'),
        'utf-8',
      );
      // Can be either full path or nested route pattern
      expect(routerContent).toMatch(
        /path:\s*['"]epic\/:epicSlug\/story\/:storySlug['"]|path:\s*['"]story\/:storySlug['"]/,
      );
    });
  });

  describe('layout component', () => {
    it('should have Layout component file', () => {
      const layoutPath = path.join(srcDir, 'components', 'Layout.tsx');
      expect(fs.existsSync(layoutPath)).toBe(true);
    });

    it('should export Layout component', () => {
      const layoutContent = fs.readFileSync(
        path.join(srcDir, 'components', 'Layout.tsx'),
        'utf-8',
      );
      expect(layoutContent).toMatch(/export\s+(default\s+)?function\s+Layout/);
    });

    it('should include navigation header', () => {
      const layoutContent = fs.readFileSync(
        path.join(srcDir, 'components', 'Layout.tsx'),
        'utf-8',
      );
      expect(layoutContent).toContain('<header');
    });

    it('should include Outlet for nested routes', () => {
      const layoutContent = fs.readFileSync(
        path.join(srcDir, 'components', 'Layout.tsx'),
        'utf-8',
      );
      expect(layoutContent).toContain('Outlet');
    });
  });

  describe('breadcrumb component', () => {
    it('should have Breadcrumb component file', () => {
      const breadcrumbPath = path.join(srcDir, 'components', 'Breadcrumb.tsx');
      expect(fs.existsSync(breadcrumbPath)).toBe(true);
    });

    it('should export Breadcrumb component', () => {
      const breadcrumbContent = fs.readFileSync(
        path.join(srcDir, 'components', 'Breadcrumb.tsx'),
        'utf-8',
      );
      expect(breadcrumbContent).toMatch(
        /export\s+(default\s+)?function\s+Breadcrumb/,
      );
    });

    it('should use useLocation or useMatches for route info', () => {
      const breadcrumbContent = fs.readFileSync(
        path.join(srcDir, 'components', 'Breadcrumb.tsx'),
        'utf-8',
      );
      expect(breadcrumbContent).toMatch(/useLocation|useMatches|useParams/);
    });

    it('should use Link for navigation', () => {
      const breadcrumbContent = fs.readFileSync(
        path.join(srcDir, 'components', 'Breadcrumb.tsx'),
        'utf-8',
      );
      expect(breadcrumbContent).toContain('Link');
    });
  });

  describe('route components', () => {
    it('should have EpicList page component', () => {
      const epicListPath = path.join(srcDir, 'pages', 'EpicList.tsx');
      expect(fs.existsSync(epicListPath)).toBe(true);
    });

    it('should have EpicDetail page component', () => {
      const epicDetailPath = path.join(srcDir, 'pages', 'EpicDetail.tsx');
      expect(fs.existsSync(epicDetailPath)).toBe(true);
    });

    it('should have StoryDetail page component', () => {
      const storyDetailPath = path.join(srcDir, 'pages', 'StoryDetail.tsx');
      expect(fs.existsSync(storyDetailPath)).toBe(true);
    });

    it('should export EpicList component', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'pages', 'EpicList.tsx'),
        'utf-8',
      );
      expect(content).toMatch(/export\s+(default\s+)?function\s+EpicList/);
    });

    it('should export EpicDetail component', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'pages', 'EpicDetail.tsx'),
        'utf-8',
      );
      expect(content).toMatch(/export\s+(default\s+)?function\s+EpicDetail/);
    });

    it('should export StoryDetail component', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'pages', 'StoryDetail.tsx'),
        'utf-8',
      );
      expect(content).toMatch(/export\s+(default\s+)?function\s+StoryDetail/);
    });

    it('should use useParams in EpicDetail for slug', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'pages', 'EpicDetail.tsx'),
        'utf-8',
      );
      expect(content).toContain('useParams');
    });

    it('should use useParams in StoryDetail for slugs', () => {
      const content = fs.readFileSync(
        path.join(srcDir, 'pages', 'StoryDetail.tsx'),
        'utf-8',
      );
      expect(content).toContain('useParams');
    });
  });

  describe('App integration', () => {
    it('should render Router in main.tsx', () => {
      const mainContent = fs.readFileSync(
        path.join(srcDir, 'main.tsx'),
        'utf-8',
      );
      expect(mainContent).toContain('AppRouter');
    });

    it('should import AppRouter from router.tsx', () => {
      const mainContent = fs.readFileSync(
        path.join(srcDir, 'main.tsx'),
        'utf-8',
      );
      expect(mainContent).toMatch(/import.*AppRouter.*from\s+['"].\/router/);
    });
  });
});
