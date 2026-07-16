import fs from 'fs-extra';
import path from 'path';
import HashManager from './hash-manager.js';
import { translateWithGoogle } from './providers/google.js';
import { translateTextWithGpt, translateMarkdownWithGpt } from './providers/gpt.js';
import { ProgressTracker } from './utils/progress.js';
import { formatDuration } from './utils/format-duration.js';
import { isSafeObjectKey } from './utils/safe-object.js';

class Translator {
  constructor({ provider = 'google', openAiKey = null, maxConcurrent = 5, model = 'gpt-4o-mini' } = {}) {
    this.provider = provider;
    this.openAiKey = openAiKey;
    this.maxConcurrent = maxConcurrent;
    this.model = model;
    this.translationCache = new Map();
    this.progressTracker = new ProgressTracker();
    this.semaphore = maxConcurrent;
    this.hashManager = null;
  }

  async acquire() {
    while (this.semaphore <= 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.semaphore--;
  }

  release() {
    this.semaphore++;
  }

  countStrings(obj) {
    if (typeof obj === 'string') return 1;
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + this.countStrings(item), 0);
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).reduce((sum, value) => sum + this.countStrings(value), 0);
    }
    return 0;
  }

  async translateText(text, targetLocale, sourceLocale = 'en') {
    if (!text || typeof text !== 'string') {
      return text;
    }

    const cacheKey = `${text}_${sourceLocale}_${targetLocale}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      await this.acquire();

      let translatedText;
      if (this.provider === 'gpt') {
        translatedText = await translateTextWithGpt(text, targetLocale, sourceLocale, this.openAiKey, this.model);
      } else {
        translatedText = await translateWithGoogle(text, targetLocale, sourceLocale);
      }

      this.translationCache.set(cacheKey, translatedText);
      return translatedText;
    } catch (error) {
      console.warn(`\nTranslation error (${targetLocale}):`, error.message);
      return text;
    } finally {
      this.release();
    }
  }

  async translateObject(obj, targetLocale, sourceLocale = 'en', partialResult = null, objectPath = []) {
    if (typeof obj === 'string') {
      const result = await this.translateText(obj, targetLocale, sourceLocale);
      this.progressTracker.incrementProgress(targetLocale);

      if (partialResult) {
        let ref = partialResult;
        for (let i = 0; i < objectPath.length - 1; i++) {
          if (!(objectPath[i] in ref)) ref[objectPath[i]] = {};
          ref = ref[objectPath[i]];
        }
        ref[objectPath[objectPath.length - 1]] = result;
      }

      return result;
    }

    if (Array.isArray(obj)) {
      const translatedArray = [];
      for (let i = 0; i < obj.length; i++) {
        translatedArray[i] = await this.translateObject(
          obj[i],
          targetLocale,
          sourceLocale,
          partialResult,
          objectPath.concat(i),
        );
      }
      return translatedArray;
    }

    if (typeof obj === 'object' && obj !== null) {
      const translatedObj = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!isSafeObjectKey(key)) continue;
        if (key === 'staticStrings') {
          translatedObj[key] = value;
        } else {
          translatedObj[key] = await this.translateObject(
            value,
            targetLocale,
            sourceLocale,
            partialResult,
            objectPath.concat(key),
          );
        }
      }
      return translatedObj;
    }

    return obj;
  }

  async translateLocale(sourceJson, locale) {
    let intervalId = null;
    const partialResult = {};

    try {
      this.progressTracker.setLocale(locale);

      intervalId = setInterval(async () => {
        try {
          await this.hashManager.saveTranslation(locale, partialResult);
        } catch (error) {
          console.warn(`⚠️  Failed to save intermediate result for ${locale}:`, error.message);
        }
      }, 60000);

      const translatedJson = await this.translateObject(sourceJson, locale, 'en', partialResult);
      const outputPath = await this.hashManager.saveTranslation(locale, translatedJson);

      return { locale, success: true, path: outputPath };
    } catch (error) {
      return { locale, success: false, error: error.message };
    } finally {
      if (intervalId) clearInterval(intervalId);
    }
  }

  async translateJsonFile(inputPath, locales, outputDir = './locales', { force = false } = {}) {
    this.hashManager = new HashManager(outputDir);
    const sourceJson = await fs.readJson(inputPath);

    let jsonToTranslate = sourceJson;
    let totalStrings = this.countStrings(sourceJson);

    if (!force) {
      const currentHashes = this.hashManager.generateHashes(sourceJson);
      const savedHashes = await this.hashManager.loadHashes();
      const newStrings = this.hashManager.findNewStrings(currentHashes, savedHashes);
      const newStringsCount = Object.keys(newStrings).length;

      if (newStringsCount === 0) {
        console.log('✅ All strings are already translated! No new changes.');
        return;
      }

      jsonToTranslate = this.hashManager.filterNewStrings(sourceJson, newStrings);
      totalStrings = this.countStrings(jsonToTranslate);

      console.log(`📊 New strings to translate: ${totalStrings} of ${this.countStrings(sourceJson)}`);
    } else {
      console.log(`📊 Force-translating all strings: ${totalStrings}`);
    }

    console.log(`🚀 Translating into ${locales.length} locale(s) (max ${this.maxConcurrent} threads)`);
    console.log('');

    await fs.ensureDir(outputDir);
    this.progressTracker.setTotalStrings(totalStrings);
    this.progressTracker.reset();

    const startTime = Date.now();
    const results = await Promise.all(locales.map((locale) => this.translateLocale(jsonToTranslate, locale)));

    const currentHashes = this.hashManager.generateHashes(sourceJson);
    await this.hashManager.saveHashes(currentHashes);

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('');
    console.log('='.repeat(60));
    console.log(force ? '✅ Force translation completed!' : '✅ Translation completed!');
    console.log(`⏱️  Duration: ${formatDuration(duration)}`);
    console.log('📄 Created files:');

    let successCount = 0;
    for (const result of results) {
      if (result.success) {
        console.log(`   ✅ ${result.path}`);
        successCount++;
      } else {
        console.log(`   ❌ ${result.locale}: ${result.error}`);
      }
    }

    console.log(`📊 Successfully translated: ${successCount}/${locales.length} locale(s)`);
    console.log('='.repeat(60));
  }

  async translateMarkdownInDir(dir, locales, { force = false, temperature = 1 } = {}) {
    const sourcePath = path.join(dir, 'en.md');

    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`en.md not found in directory: ${dir}`);
    }

    const sourceContent = await fs.readFile(sourcePath, 'utf8');
    const startTime = Date.now();
    const skippedResults = [];
    const localesToTranslate = [];

    for (const locale of locales) {
      const targetPath = path.join(dir, `${locale}.md`);
      if (!force && await fs.pathExists(targetPath)) {
        skippedResults.push({ locale, success: true, path: targetPath, skipped: true });
      } else {
        localesToTranslate.push(locale);
      }
    }

    if (skippedResults.length > 0) {
      for (const result of skippedResults) {
        console.log(`⏭️  ${result.locale}.md already exists, skipping`);
      }
    }

    if (localesToTranslate.length === 0) {
      console.log('✅ All locale files already exist. Nothing to translate.');
      return;
    }

    console.log(`🚀 Translating into ${localesToTranslate.length} locale(s) (max ${this.maxConcurrent} threads)`);
    console.log('');

    this.progressTracker.setTotalStrings(1);
    this.progressTracker.reset();
    for (const locale of localesToTranslate) {
      this.progressTracker.setLocale(locale);
    }

    const tasks = localesToTranslate.map((locale) => (async () => {
      const targetPath = path.join(dir, `${locale}.md`);

      await this.acquire();
      try {
        const translated = await translateMarkdownWithGpt(
          sourceContent,
          locale,
          'en',
          this.openAiKey,
          this.model,
          temperature,
        );
        await fs.writeFile(targetPath, translated, 'utf8');
        this.progressTracker.incrementProgress(locale);
        return { locale, success: true, path: targetPath };
      } catch (error) {
        return { locale, success: false, error: error.message };
      } finally {
        this.release();
      }
    })());

    const results = [...skippedResults, ...(await Promise.all(tasks))];
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Markdown translation completed!');
    console.log(`⏱️  Duration: ${formatDuration(duration)}`);

    let successCount = 0;
    for (const result of results) {
      if (result.success) {
        console.log(result.skipped ? `   ⏭️  ${result.path}` : `   ✅ ${result.path}`);
        successCount++;
      } else {
        console.log(`   ❌ ${result.locale}: ${result.error}`);
      }
    }

    console.log(`📊 Successful: ${successCount}/${locales.length} locale(s)`);
    console.log('='.repeat(60));
  }
}

export default Translator;
