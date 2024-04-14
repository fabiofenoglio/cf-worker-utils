
export function requireFrom<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  const v = obj[key];
  if (!v) {
    throw new Error('missing required field ' + String(key));
  }
  return v;
}

export function parseBoolean(input: string | boolean | null | undefined): boolean {
  if (!input) {
    return false;
  }
  if (typeof input === 'boolean') {
    return input;
  }
  return ('' + input).toLowerCase() === 'true';
}