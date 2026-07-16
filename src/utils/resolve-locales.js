import { loadLocales } from '../langs.js';

function parseLocaleList(value) {
  if (!value) return [];
  return value.split(',').map((locale) => locale.trim()).filter(Boolean);
}

export function resolveLocales(options) {
  const supportedLocales = loadLocales();
  const excludedLocales = parseLocaleList(options.exclude);

  let requestedLocales;

  if (options.all) {
    requestedLocales = supportedLocales.filter((locale) => locale !== 'en');
  } else {
    requestedLocales = parseLocaleList(options.locales);
    const invalidLocales = requestedLocales.filter((locale) => !supportedLocales.includes(locale));

    if (invalidLocales.length > 0) {
      throw new Error(
        `Unsupported locales: ${invalidLocales.join(', ')}. Supported: ${supportedLocales.join(', ')}`,
      );
    }
  }

  if (excludedLocales.length > 0) {
    const invalidExcluded = excludedLocales.filter((locale) => !supportedLocales.includes(locale));

    if (invalidExcluded.length > 0) {
      throw new Error(
        `Unsupported locales in --exclude: ${invalidExcluded.join(', ')}. Supported: ${supportedLocales.join(', ')}`,
      );
    }
  }

  const locales = requestedLocales.filter((locale) => !excludedLocales.includes(locale));

  if (locales.length === 0) {
    throw new Error('No locales left to translate after applying --exclude');
  }

  return locales;
}
