# Testing Strategy

Comprehensive testing guidance for the `@saga-ai/cli` package.

## Testing Philosophy

- **TDD** - Write tests before implementation
- **Test isolation** - Each test runs independently with its own fixtures
- **Determinism** - Tests produce consistent results across runs
- **Fail-fast** - Stop on first failure (`bail: 1` in Vitest, `maxFailures: 1` in Playwright)

## Test Types Decision Tree

| Scenario | Test Type | Location |
|----------|-----------|----------|
| Pure function, utility, parser | Unit test | `src/**/*.test.ts` |
| CLI command behavior | CLI integration test | `src/commands/*.test.ts` |
| Server endpoint | Server integration | `src/server/__tests__/*.test.ts` |
| WebSocket behavior | Server integration | `src/server/__tests__/websocket.test.ts` |
| React component in isolation | Component unit test | `src/client/src/**/*.test.tsx` |
| UI workflow with mocked API | Playwright integration | `src/client/tests/integration/*.spec.ts` |
| Full dashboard with real backend | E2E test | `src/client/e2e/*.spec.ts` |
| Visual component appearance | Storybook visual test | `src/client/src/**/*.stories.tsx` |

## File Naming & Location

| Type | Pattern | Location |
|------|---------|----------|
| Unit tests (backend) | `<name>.test.ts` | Co-located with source |
| Component tests | `<name>.test.tsx` | Co-located with component |
| Server tests | `*.test.ts` | `src/server/__tests__/` |
| Integration tests | `*.spec.ts` | `src/client/tests/integration/` |
| E2E tests | `*.spec.ts` | `src/client/e2e/` |
| Storybook stories | `*.stories.tsx` | Co-located with component |

## Commands Reference

```bash
pnpm test              # Full suite (build + unit + integration + e2e)
pnpm test:watch        # Unit tests in watch mode
pnpm test:integration  # Playwright integration tests (mocked API)
pnpm test:e2e          # Playwright E2E tests (real backend)
pnpm test:storybook    # Storybook visual tests
```

## Test Configuration

The project uses a multi-project Vitest setup (`vitest.config.ts`):

- **`unit`** - Backend unit tests in Node environment
- **`client`** - React component tests in jsdom environment
- **`storybook`** - Visual tests in browser environment

Playwright has two configurations:

- **`playwright.config.ts`** - Integration tests with mocked API (Vite dev server)
- **`playwright.e2e.config.ts`** - E2E tests with real backend (dashboard server)

---

## Mocking Patterns

### File System Mocking

For tests that need filesystem operations:

```typescript
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe } from 'vitest';

describe('my feature', () => {
  let testDir: string;

  beforeEach(() => {
    // Use realpath to resolve macOS /private/var symlinks
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-test-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });
});
```

### CLI Testing Pattern

For testing CLI commands via subprocess:

```typescript
import { execSync } from 'node:child_process';
import { join } from 'node:path';

function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const cliPath = join(__dirname, '../../dist/cli.cjs');
  try {
    const stdout = execSync(`node ${cliPath} ${args.join(' ')}`, {
      cwd: testDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error) {
    const spawnError = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
    return {
      stdout: spawnError.stdout?.toString() || '',
      stderr: spawnError.stderr?.toString() || '',
      exitCode: spawnError.status || 1,
    };
  }
}
```

### API Route Mocking (Playwright)

For integration tests that mock API responses:

```typescript
import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockEpicSummary,
  mockEpicDetail,
  mockEpicList,
} from '../utils/mock-api.ts';

test('displays epic list', async ({ page }) => {
  // Setup mock data
  const epic = createMockEpicSummary({
    slug: 'test-epic',
    title: 'Test Epic',
    storyCounts: { ready: 1, inProgress: 0, blocked: 0, completed: 0, total: 1 },
  });
  const epicDetail = createMockEpic({
    slug: 'test-epic',
    title: 'Test Epic',
    stories: [],
  });

  await mockEpicList(page, [epic]);
  await mockEpicDetail(page, epicDetail);

  await page.goto('/');
  await expect(page.getByText('Test Epic')).toBeVisible();
});
```

### WebSocket Testing Pattern

For testing WebSocket connections and messages:

```typescript
import { WebSocket } from 'ws';

const WS_CONNECTION_TIMEOUT_MS = 5000;
const MESSAGE_TIMEOUT_MS = 3000;

function createWsClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, WS_CONNECTION_TIMEOUT_MS);

    ws.on('open', () => {
      clearTimeout(timeout);
      resolve(ws);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function waitForMessage(
  ws: WebSocket,
  timeoutMs = MESSAGE_TIMEOUT_MS,
): Promise<{ event: string; data: unknown }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('WebSocket message timeout'));
    }, timeoutMs);

    ws.once('message', (data: Buffer) => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(data.toString()));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function sendMessage(ws: WebSocket, event: string, data: unknown): void {
  ws.send(JSON.stringify({ event, data }));
}
```

### React Component Testing Pattern

For testing React components with Testing Library:

```typescript
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MyComponent } from './MyComponent.tsx';

describe('MyComponent', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders correctly', () => {
    render(<MyComponent content="Test content" />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    render(<MyComponent content="Test" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByTestId('result')).toBeVisible();
  });
});
```

---

## Fixtures & Test Data

### Mock Data Factories

Located in `src/client/tests/utils/mock-api.ts`:

```typescript
import {
  createMockEpic,
  createMockEpicSummary,
  createMockStoryDetail,
  createMockTask,
  createMockJournalEntry,
} from '../utils/mock-api.ts';

// Create mock data with sensible defaults
const epic = createMockEpicSummary({
  slug: 'my-epic',
  title: 'My Epic',
  storyCounts: { ready: 1, inProgress: 2, blocked: 0, completed: 3, total: 6 },
});

const story = createMockStoryDetail({
  slug: 'my-story',
  title: 'My Story',
  status: 'in_progress',
  epicSlug: 'my-epic',
  tasks: [
    createMockTask({ id: 't1', title: 'Task 1', status: 'completed' }),
    createMockTask({ id: 't2', title: 'Task 2', status: 'pending' }),
  ],
});
```

### E2E Fixtures

Located in `src/client/e2e/fixtures/`. Copied to temp directory before each test run:

```typescript
import { readStoryFile, resetAllFixtures, writeStoryFile } from './fixtures-utils.ts';

test.beforeEach(async () => {
  await resetAllFixtures();
});

test('modifies fixture file', async ({ page }) => {
  const originalContent = await readStoryFile('epic-slug', 'story-slug');

  try {
    const updatedContent = originalContent.replace('status: ready', 'status: completed');
    await writeStoryFile('epic-slug', 'story-slug', updatedContent);

    // Test assertions...
  } finally {
    // Restore original file
    await writeStoryFile('epic-slug', 'story-slug', originalContent);
  }
});
```

---

## Common Patterns

### Constants at Top of Test Files

Define timing constants and magic numbers at the top of test files:

```typescript
const WS_CONNECTION_TIMEOUT_MS = 5000;
const MESSAGE_TIMEOUT_MS = 3000;
const SHORT_WAIT_MS = 50;
const EXPECTED_ITEM_COUNT = 3;
```

### Unique Port Allocation

For server tests, allocate unique ports to avoid `EADDRINUSE`:

```typescript
const PORT_BASE = 40_000;
let portCounter = 0;

function getRandomPort(): number {
  portCounter++;
  return PORT_BASE + portCounter;
}
```

### Waiting for Loading States

In Playwright tests, wait for skeleton loaders to disappear:

```typescript
await page.goto('/');
await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });
await expect(page.getByText('My Epic')).toBeVisible();
```

### WebSocket Connection Waiting (E2E)

Wait for WebSocket connection before modifying files:

```typescript
await page.goto('/');
await expect(page.locator('[data-ws-connected="true"]')).toBeVisible({ timeout: 10_000 });
```

### Cleanup in afterEach

Always clean up resources:

```typescript
afterEach(async () => {
  if (server) {
    await server.close();
  }
  await cleanupTempDir(tempDir);
});
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Multi-project Vitest setup (unit, client, storybook) |
| `src/client/playwright.config.ts` | Integration test config (mocked API) |
| `src/client/playwright.e2e.config.ts` | E2E test config (real backend) |
| `src/client/tests/utils/mock-api.ts` | Mock data factories for Playwright |
| `src/client/e2e/fixtures-utils.ts` | E2E fixture file utilities |
| `src/client/src/test-setup.ts` | React Testing Library setup |
