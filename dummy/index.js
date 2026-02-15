export const config = {
  name: 'dummy-project',
  version: '1.0.0',
  debug: false,
};

export function greet(name) {
  return `Hello, ${name || 'Dummy'}!`;
}
