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

## Session: 2026-02-15T09:10:00Z

### Task: implement-config

**What was done:** Added the `config` object export to `dummy/index.js` with `name: 'dummy-project'`, `version: '1.0.0'`, and `debug: false`. All 7 tests pass (3 greet + 4 config).

**Key decisions and deviations:** None. Straightforward implementation matching the test expectations. Had to use `NODE_OPTIONS='--experimental-vm-modules'` when running Jest to support ESM (previous session set up the package.json script but running Jest directly requires the flag).

**Next steps:** Write utility function tests (task #write-utils-tests), then implement utilities.

## Session: 2026-02-15T09:15:00Z

### Task: write-utils-tests

**What was done:** Created `dummy/__tests__/utils.test.js` with 4 tests: `formatName` capitalizes first letter, `formatName('')` returns 'Unknown', `isValidName` returns true for non-empty strings, and `isValidName('')` returns false. Verified tests fail correctly with "Cannot find module" as expected in TDD red phase.

**Key decisions and deviations:** None. Tests follow the same ESM import pattern as the existing test file.

**Next steps:** Implement utility functions in `dummy/utils.js` (task #implement-utils).

## Session: 2026-02-15T09:20:00Z

### Task: implement-utils

**What was done:** Created `dummy/utils.js` with `formatName(name)` (capitalizes first letter, returns 'Unknown' for empty input) and `isValidName(name)` (returns true for non-empty strings). All 11 tests pass (7 index + 4 utils), no regressions.

**Key decisions and deviations:** None. Straightforward implementation matching test expectations.

**Next steps:** Write integration tests (task #write-integration-tests), then verify all tests pass end-to-end.

## Session: 2026-02-15T09:25:00Z

### Task: write-integration-tests

**What was done:** Created `dummy/__tests__/integration.test.js` with 3 integration tests: `greet(formatName('alice'))` returns a greeting containing 'Alice', config can be spread into a new object without errors (verifying it's a plain object), and all exports from `index.js` are defined with correct types. All 3 integration tests pass.

**Key decisions and deviations:** Since all modules were already implemented, these tests passed immediately — no TDD red phase was needed. The tests verify cross-module behavior (combining greet + formatName) and structural integrity of exports.

**Next steps:** Verify all tests pass end-to-end (task #verify-all-passing).
