import path from 'path';
import fs from 'fs-extra';
import { loadLocales } from '../langs.js';
import { resolveDir } from '../utils/resolve-dir.js';

export async function runClean(options) {
  const dir = await resolveDir(options);
  const locales = loadLocales().filter((locale) => locale !== 'en');

  let removedCount = 0;

  for (const locale of locales) {
    for (const ext of ['json', 'md']) {
      const filePath = path.join(dir, `${locale}.${ext}`);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        removedCount++;
      }
    }
  }

  const hashPath = path.join(dir, '.translation-hashes.json');
  if (await fs.pathExists(hashPath)) {
    await fs.remove(hashPath);
    removedCount++;
  }

  if (removedCount > 0) {
    console.log(`✅ Removed ${removedCount} file(s) in ${dir}`);
  } else {
    console.log(`ℹ️  No translation files found in: ${dir}`);
  }
}
