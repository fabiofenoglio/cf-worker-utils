
export function requireFrom<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  const v = obj[key];
  if (!v) {
    throw new Error('missing required field ' + String(key));
  }
  return v;
}
