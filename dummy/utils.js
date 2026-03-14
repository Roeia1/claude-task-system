export function formatName(name) {
  if (!name) {
    return 'Unknown';
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function isValidName(name) {
  return typeof name === 'string' && name.length > 0;
}
