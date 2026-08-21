import Translator from '../index.js';
import { resolveLocales } from '../utils/resolve-locales.js';
import { resolveDir } from '../utils/resolve-dir.js';
import { resolveOpenAiKey } from '../utils/resolve-key.js';
import { resolveThreads } from '../utils/resolve-threads.js';
import { resolveContext } from '../utils/resolve-context.js';

export async function runTranslateMd(options) {
  const dir = await resolveDir(options, 'en.md');

  const openAiKey = await resolveOpenAiKey({ requireKey: true });
  const locales = resolveLocales(options);
  const threads = resolveThreads(options.threads);
  const context = resolveContext(options.context);

  const translator = new Translator({
    openAiKey,
    maxConcurrent: threads,
    model: options.model,
    context,
  });

  console.log(`📁 Directory: ${dir}`);
  console.log(`📝 Source: en.md`);
  console.log(`🌍 Locales: ${locales.join(', ')}`);
  console.log(`⚡ Threads: ${threads}`);
  console.log(`🧠 Model: ${options.model}`);
  if (context) console.log(`📌 Context: ${context}`);
  console.log('');

  const result = await translator.translateMarkdownInDir(dir, locales, {
    force: options.force,
    temperature: Math.min(2, Math.max(0, Number.parseFloat(options.temperature) || 1)),
  });

  if (!result.success) {
    process.exitCode = 1;
  }
}
