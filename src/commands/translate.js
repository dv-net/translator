import path from 'path';
import Translator from '../index.js';
import { resolveLocales } from '../utils/resolve-locales.js';
import { resolveDir } from '../utils/resolve-dir.js';
import { resolveOpenAiKey } from '../utils/resolve-key.js';
import { resolveThreads } from '../utils/resolve-threads.js';
import { resolveContext } from '../utils/resolve-context.js';

export async function runTranslate(options) {
  const dir = await resolveDir(options, 'en.json');
  const inputPath = path.join(dir, 'en.json');

  const locales = resolveLocales(options);
  const openAiKey = await resolveOpenAiKey({ requireKey: true });
  const threads = resolveThreads(options.threads);
  const context = resolveContext(options.context);

  const translator = new Translator({
    openAiKey,
    maxConcurrent: threads,
    model: options.model,
    context,
  });

  console.log(`📁 Directory: ${dir}`);
  console.log(`📝 Source: en.json`);
  console.log(`🌍 Locales: ${locales.join(', ')}`);
  console.log(`⚡ Threads: ${threads}`);
  console.log(`🔧 Mode: ${options.force ? 'Force translate' : 'Incremental (hash-based)'}`);
  console.log(`🧠 Model: ${options.model}`);
  if (context) console.log(`📌 Context: ${context}`);
  console.log('');

  const result = await translator.translateJsonFile(inputPath, locales, dir, { force: options.force });
  if (!result.success) {
    process.exitCode = 1;
  }
}
