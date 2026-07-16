import Translator from '../index.js';
import { resolveLocales } from '../utils/resolve-locales.js';
import { resolveDir } from '../utils/resolve-dir.js';
import { resolveOpenAiKey } from '../utils/resolve-key.js';
import { resolveThreads } from '../utils/resolve-threads.js';

export async function runTranslateMd(options) {
  const dir = await resolveDir(options, 'en.md');

  const openAiKey = await resolveOpenAiKey({ keyFlag: options.key, requireKey: true });
  const locales = resolveLocales(options);

  const threads = resolveThreads(options.threads);

  const translator = new Translator({
    provider: 'gpt',
    openAiKey,
    maxConcurrent: threads,
    model: options.model,
  });

  console.log(`📁 Directory: ${dir}`);
  console.log(`📝 Source: en.md`);
  console.log(`🌍 Locales: ${locales.join(', ')}`);
  console.log(`⚡ Threads: ${threads}`);
  console.log(`🌐 Provider: GPT`);
  console.log(`🧠 Model: ${options.model}`);
  console.log('');

  await translator.translateMarkdownInDir(dir, locales, {
    force: options.force,
    temperature: Math.min(2, Math.max(0, Number.parseFloat(options.temperature) || 1)),
  });
}
