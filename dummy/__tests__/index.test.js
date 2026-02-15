import { config, greet } from '../index.js';

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

describe('greet', () => {
  test('greet is a function', () => {
    expect(typeof greet).toBe('function');
  });

  test('greet("World") returns a string containing "World"', () => {
    const result = greet('World');
    expect(typeof result).toBe('string');
    expect(result).toContain('World');
  });

  test('greet() with no args returns a default greeting', () => {
    const result = greet();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('config', () => {
  test('config is exported and is an object', () => {
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  test('config.name equals "dummy-project"', () => {
    expect(config.name).toBe('dummy-project');
  });

  test('config.version is a string matching semver format', () => {
    expect(typeof config.version).toBe('string');
    expect(config.version).toMatch(SEMVER_REGEX);
  });

  test('config.debug is a boolean defaulting to false', () => {
    expect(typeof config.debug).toBe('boolean');
    expect(config.debug).toBe(false);
  });
});
