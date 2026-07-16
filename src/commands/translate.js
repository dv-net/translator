import path from 'path';
import Translator from '../index.js';
import { resolveLocales } from '../utils/resolve-locales.js';
import { resolveDir } from '../utils/resolve-dir.js';
import { resolveOpenAiKey, resolveProvider } from '../utils/resolve-key.js';
import { resolveThreads } from '../utils/resolve-threads.js';

export async function runTranslate(options) {
  const dir = await resolveDir(options, 'en.json');
  const inputPath = path.join(dir, 'en.json');

  const locales = resolveLocales(options);
  const openAiKey = await resolveOpenAiKey({ keyFlag: options.key });
  const provider = resolveProvider({ provider: options.provider, openAiKey });

  const threads = resolveThreads(options.threads);

  const translator = new Translator({
    provider,
    openAiKey,
    maxConcurrent: threads,
    model: options.model,
  });

  console.log(`📁 Directory: ${dir}`);
  console.log(`📝 Source: en.json`);
  console.log(`🌍 Locales: ${locales.join(', ')}`);
  console.log(`⚡ Threads: ${threads}`);
  console.log(`🔧 Mode: ${options.force ? 'Force translate' : 'Incremental (hash-based)'}`);
  console.log(`🌐 Provider: ${provider.toUpperCase()}`);
  console.log('');

  await translator.translateJsonFile(inputPath, locales, dir, { force: options.force });
}
