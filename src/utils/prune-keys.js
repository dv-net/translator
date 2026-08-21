import { isSafeObjectKey } from './safe-object.js';

function collectLeafPaths(obj, prefix = '') {
  const paths = [];

  if (typeof obj === 'string') {
    if (prefix) paths.push(prefix);
    return paths;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const next = prefix ? `${prefix}[${i}]` : `[${i}]`;
      paths.push(...collectLeafPaths(obj[i], next));
    }
    return paths;
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (!isSafeObjectKey(key)) continue;
      const next = prefix ? `${prefix}.${key}` : key;
      paths.push(...collectLeafPaths(value, next));
    }
  }

  return paths;
}

/**
 * Keep only keys/branches that exist in the English reference tree.
 * Returns cleaned object and list of removed leaf key paths.
 */
export function pruneObjectByReference(localeObj, enObj, prefix = '') {
  if (typeof enObj === 'string') {
    return { value: localeObj, removed: [] };
  }

  if (Array.isArray(enObj)) {
    if (!Array.isArray(localeObj)) {
      return { value: localeObj, removed: [] };
    }

    const cleaned = [];
    const removed = [];

    for (let i = 0; i < localeObj.length; i++) {
      const next = prefix ? `${prefix}[${i}]` : `[${i}]`;
      if (i >= enObj.length) {
        removed.push(...collectLeafPaths(localeObj[i], next));
        continue;
      }
      const nested = pruneObjectByReference(localeObj[i], enObj[i], next);
      cleaned.push(nested.value);
      removed.push(...nested.removed);
    }

    return { value: cleaned, removed };
  }

  if (typeof enObj !== 'object' || enObj === null) {
    return { value: localeObj, removed: [] };
  }

  if (typeof localeObj !== 'object' || localeObj === null || Array.isArray(localeObj)) {
    return { value: localeObj, removed: [] };
  }

  const cleaned = {};
  const removed = [];

  for (const [key, value] of Object.entries(localeObj)) {
    if (!isSafeObjectKey(key)) continue;
    const next = prefix ? `${prefix}.${key}` : key;

    if (!(key in enObj)) {
      removed.push(...collectLeafPaths(value, next));
      continue;
    }

    const nested = pruneObjectByReference(value, enObj[key], next);
    cleaned[key] = nested.value;
    removed.push(...nested.removed);
  }

  return { value: cleaned, removed };
}
