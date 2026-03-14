import { formatName, isValidName } from '../utils.js';

describe('formatName', () => {
  test('capitalizes the first letter of a name', () => {
    expect(formatName('alice')).toBe('Alice');
  });

  test('returns "Unknown" for an empty string', () => {
    expect(formatName('')).toBe('Unknown');
  });
});

describe('isValidName', () => {
  test('returns true for non-empty strings', () => {
    expect(isValidName('alice')).toBe(true);
  });

  test('returns false for an empty string', () => {
    expect(isValidName('')).toBe(false);
  });
});
