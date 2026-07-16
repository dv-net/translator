const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isSafeObjectKey(key) {
  return typeof key === 'string' && !UNSAFE_KEYS.has(key);
}
