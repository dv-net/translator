function formatContextBlock(context) {
  if (typeof context !== 'string' || !context.trim()) return '';
  return `Domain: ${context.trim()}`;
}

const PRESERVE = [
  'i18n tokens ({name}, {{raw}}, %s, %d, %(name)s) — do not translate names inside them',
  'ICU ({n, plural|select|selectordinal, …}, #, =0|one|other) — translate only visible text in branches; keep syntax/keys',
  'HTML/XML — keep tags+attrs; translate only text between tags; keep nesting',
  'Markdown syntax, code/inline-code, URLs, paths — keep',
  'brands, products, tech acronyms (API, VPN, URL, JSON, HTTP…) — keep; if unsure, keep source',
].join('; ');

export function getTextTranslationPrompt(sourceLocale, targetLocale, { context = null } = {}) {
  return [
    `Strict i18n translator: ${sourceLocale}→${targetLocale}.`,
    'Return ONLY the translation.',
    'Translate human-readable text only; never break markup.',
    `Preserve: ${PRESERVE}.`,
    'No commentary; no extra punctuation/newlines; keep casing on short UI labels when apt.',
    'If unknown, return the source unchanged.',
    formatContextBlock(context),
  ]
    .filter(Boolean)
    .join(' ');
}

export function getMarkdownTranslationPrompt(sourceLocale, targetLocale, { context = null } = {}) {
  return [
    `Markdown localizer: ${sourceLocale}→${targetLocale}.`,
    'Return ONLY the translated Markdown.',
    'Keep structure: headings, lists, tables, quotes, emphasis, links, images, front matter, anchors, identifiers.',
    `Preserve: ${PRESERVE}.`,
    'No commentary.',
    'If unknown, return the source unchanged.',
    formatContextBlock(context),
  ]
    .filter(Boolean)
    .join(' ');
}
