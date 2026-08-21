#!/usr/bin/env node

import { createRequire } from 'module';
import { config as loadEnv } from 'dotenv';
import { Command } from 'commander';
import { loadLocales } from '../src/langs.js';
import { DEFAULT_MODEL, DEFAULT_THREADS } from '../src/constants/defaults.js';
import { runTranslate } from '../src/commands/translate.js';
import { runTranslateMd } from '../src/commands/translate-md.js';
import { runStatus } from '../src/commands/status.js';
import { runClean } from '../src/commands/clean.js';
import { runPrune } from '../src/commands/prune.js';

loadEnv();

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const program = new Command();

const commonOptions = [
  ['-l, --locales <locales>', 'Comma-separated list of locales', 'ru,es,fr,de'],
  ['--all', 'Translate into all available locales (except en)', false],
  ['--exclude <locales>', 'Locales to skip (comma-separated)'],
  ['-t, --threads <number>', 'Maximum number of parallel threads', String(DEFAULT_THREADS)],
  ['-f, --force', 'Force re-translation / overwrite existing files', false],
  ['-m, --model <model>', 'OpenAI model', DEFAULT_MODEL],
  ['--context <text>', 'Optional domain context for ambiguous terms'],
];

program
  .name('dv-translator')
  .description('Translate JSON and Markdown into multiple languages')
  .version(version);

const translateCmd = program
  .command('translate')
  .description('Translate en.json into the specified locales')
  .requiredOption('--dir <path>', 'Directory containing en.json');

for (const [flags, desc, defaultValue] of commonOptions) {
  translateCmd.option(flags, desc, defaultValue);
}

translateCmd.action(async (options) => {
  try {
    await runTranslate(options);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
});

const translateMdCmd = program
  .command('translate-md')
  .description('Translate en.md into the specified locales')
  .requiredOption('--dir <path>', 'Directory containing en.md');

for (const [flags, desc, defaultValue] of commonOptions) {
  translateMdCmd.option(flags, desc, defaultValue);
}

translateMdCmd
  .option('--temperature <number>', 'Sampling temperature (0-2)', '1')
  .action(async (options) => {
    try {
      await runTranslateMd(options);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show hash status for en.json')
  .requiredOption('--dir <path>', 'Directory containing en.json')
  .action(async (options) => {
    try {
      await runStatus(options);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show supported locales')
  .action(() => {
    const supportedLocales = loadLocales();
    console.log('🌍 Supported locales:');
    console.log(supportedLocales.join(', '));
    console.log(`\n📊 Total locales: ${supportedLocales.length}`);
  });

program
  .command('prune')
  .description('Remove keys from locale JSON files that are missing in en.json')
  .requiredOption('--dir <path>', 'Directory containing en.json and locale files')
  .action(async (options) => {
    try {
      await runPrune(options);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Remove translation files from a directory')
  .requiredOption('--dir <path>', 'Directory with translation files')
  .action(async (options) => {
    try {
      await runClean(options);
    } catch (error) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
