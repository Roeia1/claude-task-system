import { greet } from '../index.js';

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
