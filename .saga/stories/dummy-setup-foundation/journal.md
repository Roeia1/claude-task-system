# Journal: dummy-setup-foundation

## Session: 2026-02-15T08:55:00Z

### Task: write-foundation-tests

**What was done:** Created `dummy/__tests__/index.test.js` with three tests for the `greet` function: verifies it's a function, that `greet('World')` returns a string containing 'World', and that `greet()` with no args returns a default greeting. Also created `dummy/jest.config.js` for test configuration. Verified tests fail correctly (module not found) as expected in TDD red phase.

**Key decisions and deviations:** Used Jest from `packages/statusline/node_modules/.bin/jest` since npm/pnpm registry access is blocked and Jest is already available in the monorepo. Created a local jest.config.js for the dummy module.

**Next steps:** Implement `dummy/index.js` with the `greet` function to make tests pass (task #implement-foundation).

## Session: 2026-02-15T09:00:00Z

### Task: implement-foundation

**What was done:** Created `dummy/index.js` with the `greet(name)` function that returns `Hello, ${name || 'Dummy'}!`. Used ESM export syntax to match project conventions. All 3 foundation tests pass.

**Key decisions and deviations:** Kept implementation minimal as instructed. The config object (also mentioned in the task description) will be added in the #implement-config task. Converted test file and jest config from CommonJS to ESM (`.mjs`) to satisfy biome's `noCommonJs` lint rule. Added `dummy/package.json` with `"type": "module"` for ESM support.

**Next steps:** Write config object tests (task #write-config-tests), then implement config object.

## Session: 2026-02-15T09:05:00Z

### Task: write-config-tests

**What was done:** Added a `describe('config')` block to `dummy/__tests__/index.test.js` with 4 tests: config is an exported object, `config.name` equals 'dummy-project', `config.version` matches semver format, and `config.debug` is a boolean defaulting to false. Verified tests fail correctly (config not exported yet).

**Key decisions and deviations:** Extracted semver regex to a top-level `SEMVER_REGEX` constant to satisfy biome's `useTopLevelRegex` rule. Sorted imports alphabetically per biome's `organizeImports` rule.

**Next steps:** Implement config object in `dummy/index.js` (task #implement-config).
