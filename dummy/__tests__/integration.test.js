import { config, greet } from '../index.js';
import { formatName } from '../utils.js';

describe('integration', () => {
  test('greet with formatted name returns greeting with capitalized name', () => {
    const result = greet(formatName('alice'));
    expect(typeof result).toBe('string');
    expect(result).toContain('Alice');
  });

  test('config can be spread into a new object without errors', () => {
    const copy = { ...config };
    expect(copy).toEqual(config);
    expect(copy).not.toBe(config);
  });

  test('all exports from index.js are defined and the correct type', () => {
    expect(greet).toBeDefined();
    expect(typeof greet).toBe('function');

    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
    expect(config).not.toBeNull();
  });
});
