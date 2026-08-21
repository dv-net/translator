import fs from 'fs-extra';
import path from 'path';
import HashManager from './hash-manager.js';
import { translateTextWithGpt, translateMarkdownWithGpt } from './providers/gpt.js';
import { ProgressTracker } from './utils/progress.js';
import { formatDuration } from './utils/format-duration.js';
import { isSafeObjectKey } from './utils/safe-object.js';
import { addTokenUsage, createTokenUsage, formatTokenUsage } from './utils/token-usage.js';
import { DEFAULT_MODEL, DEFAULT_THREADS } from './constants/defaults.js';

class Translator {
  constructor({
    openAiKey = null,
    maxConcurrent = DEFAULT_THREADS,
    model = DEFAULT_MODEL,
    context = null,
  } = {}) {
    this.openAiKey = openAiKey;
    this.maxConcurrent = maxConcurrent;
    this.model = model;
    this.context = context;
    this.translationCache = new Map();
    this.progressTracker = new ProgressTracker();
    this.semaphore = maxConcurrent;
    this.hashManager = null;
    this.abortError = null;
    this.abortLocale = null;
    this.tokenUsage = createTokenUsage();
  }

  resetAbortState() {
    this.abortError = null;
    this.abortLocale = null;
  }

  resetTokenUsage() {
    this.tokenUsage = createTokenUsage();
  }

  abort(error, locale) {
    if (!this.abortError) {
      this.abortError = error;
      this.abortLocale = locale;
    }
  }

  throwIfAborted() {
    if (this.abortError) {
      const error = new Error(
        this.abortLocale
          ? `Aborted after failure in ${this.abortLocale}: ${this.abortError.message}`
          : this.abortError.message,
      );
      error.cause = this.abortError;
      throw error;
    }
  }

  async acquire() {
    while (this.semaphore <= 0) {
      this.throwIfAborted();
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.throwIfAborted();
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

    this.throwIfAborted();

    const cacheKey = `${text}_${sourceLocale}_${targetLocale}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    let acquired = false;
    try {
      await this.acquire();
      acquired = true;
      this.throwIfAborted();

      const { text: translatedText, usage } = await translateTextWithGpt(
        text,
        targetLocale,
        sourceLocale,
        this.openAiKey,
        this.model,
        { context: this.context },
      );

      addTokenUsage(this.tokenUsage, usage);
      this.translationCache.set(cacheKey, translatedText);
      return translatedText;
    } catch (error) {
      if (error?.cause === this.abortError || (this.abortError && error.message.startsWith('Aborted after failure'))) {
        throw error;
      }
      this.abort(error, targetLocale);
      throw error;
    } finally {
      if (acquired) this.release();
    }
  }

  async translateObject(obj, targetLocale, sourceLocale = 'en', partialResult = null, objectPath = []) {
    this.throwIfAborted();

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
        translatedObj[key] = await this.translateObject(
          value,
          targetLocale,
          sourceLocale,
          partialResult,
          objectPath.concat(key),
        );
      }
      return translatedObj;
    }

    return obj;
  }

  async savePartialTranslation(locale, partialResult) {
    if (!partialResult || Object.keys(partialResult).length === 0) {
      return null;
    }

    try {
      return await this.hashManager.saveTranslation(locale, partialResult);
    } catch (error) {
      console.warn(`⚠️  Failed to save partial result for ${locale}:`, error.message);
      return null;
    }
  }

  async translateLocale(sourceJson, locale) {
    let intervalId = null;
    const partialResult = {};

    try {
      this.progressTracker.setLocale(locale);
      this.throwIfAborted();

      intervalId = setInterval(async () => {
        try {
          await this.hashManager.saveTranslation(locale, partialResult);
        } catch (error) {
          console.warn(`⚠️  Failed to save intermediate result for ${locale}:`, error.message);
        }
      }, 60000);

      const translatedJson = await this.translateObject(sourceJson, locale, 'en', partialResult);
      const outputPath = await this.hashManager.saveTranslation(locale, translatedJson);

      return {
        locale,
        success: true,
        path: outputPath,
        translatedCount: this.progressTracker.getLocaleProgress(locale),
      };
    } catch (error) {
      const path = await this.savePartialTranslation(locale, partialResult);
      const isPrimaryFailure = this.abortLocale === locale;

      return {
        locale,
        success: false,
        error: isPrimaryFailure
          ? error.message
          : `Aborted after failure in ${this.abortLocale}: ${this.abortError?.message || error.message}`,
        path,
        translatedCount: this.progressTracker.getLocaleProgress(locale),
        aborted: !isPrimaryFailure,
      };
    } finally {
      if (intervalId) clearInterval(intervalId);
    }
  }

  printJsonReport({ force, duration, totalStrings, locales, results, success }) {
    const successCount = results.filter((result) => result.success).length;
    const translatedTotal = results.reduce((sum, result) => sum + (result.translatedCount || 0), 0);
    const primaryFailure = results.find((result) => result.success === false && !result.aborted);

    console.log('');
    console.log('='.repeat(60));
    if (success) {
      console.log(force ? '✅ Force translation completed!' : '✅ Translation completed!');
    } else {
      console.log('❌ Translation stopped due to an error');
    }
    console.log(`⏱️  Duration: ${formatDuration(duration)}`);
    console.log(`📊 Strings translated: ${translatedTotal}/${totalStrings * locales.length} (per-locale quota: ${totalStrings})`);
    console.log(`🌍 Locales: ${successCount}/${locales.length} completed`);
    const tokenLine = formatTokenUsage(this.tokenUsage);
    if (tokenLine) console.log(tokenLine);

    for (const result of results) {
      if (result.success) {
        console.log(`   ✅ ${result.path} (${result.translatedCount}/${totalStrings})`);
      } else if (result.aborted) {
        console.log(`   ⏸️  ${result.locale}: aborted (${result.translatedCount}/${totalStrings} saved)`);
        if (result.path) console.log(`      partial: ${result.path}`);
      } else {
        console.log(`   ❌ ${result.locale}: ${result.error}`);
        console.log(`      progress: ${result.translatedCount}/${totalStrings}`);
        if (result.path) console.log(`      partial saved: ${result.path}`);
      }
    }

    if (!success && primaryFailure) {
      console.log(`💥 Error: ${primaryFailure.error}`);
    }

    console.log('='.repeat(60));
  }

  async translateJsonFile(inputPath, locales, outputDir = './locales', { force = false } = {}) {
    this.hashManager = new HashManager(outputDir);
    this.resetAbortState();
    this.resetTokenUsage();
    this.translationCache.clear();

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
        return { success: true, results: [], totalStrings: 0 };
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
    const duration = Math.round((Date.now() - startTime) / 1000);
    const success = results.every((result) => result.success);

    if (success) {
      const currentHashes = this.hashManager.generateHashes(sourceJson);
      await this.hashManager.saveHashes(currentHashes);
    }

    this.printJsonReport({ force, duration, totalStrings, locales, results, success });

    return { success, results, totalStrings, duration, tokenUsage: { ...this.tokenUsage } };
  }

  printMarkdownReport({ duration, locales, results, success }) {
    const successCount = results.filter((result) => result.success).length;
    const primaryFailure = results.find((result) => result.success === false && !result.aborted);

    console.log('');
    console.log('='.repeat(60));
    if (success) {
      console.log('✅ Markdown translation completed!');
    } else {
      console.log('❌ Markdown translation stopped due to an error');
    }
    console.log(`⏱️  Duration: ${formatDuration(duration)}`);
    console.log(`🌍 Locales: ${successCount}/${locales.length} completed`);
    const tokenLine = formatTokenUsage(this.tokenUsage);
    if (tokenLine) console.log(tokenLine);

    for (const result of results) {
      if (result.success) {
        console.log(result.skipped ? `   ⏭️  ${result.path}` : `   ✅ ${result.path}`);
      } else if (result.aborted) {
        console.log(`   ⏸️  ${result.locale}: aborted`);
      } else {
        console.log(`   ❌ ${result.locale}: ${result.error}`);
      }
    }

    if (!success && primaryFailure) {
      console.log(`💥 Error: ${primaryFailure.error}`);
    }

    console.log('='.repeat(60));
  }

  async translateMarkdownInDir(dir, locales, { force = false, temperature = 1 } = {}) {
    const sourcePath = path.join(dir, 'en.md');

    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`en.md not found in directory: ${dir}`);
    }

    this.resetAbortState();
    this.resetTokenUsage();

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
      return { success: true, results: skippedResults };
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
      let acquired = false;

      try {
        this.throwIfAborted();
        await this.acquire();
        acquired = true;
        this.throwIfAborted();

        try {
          const { text: translated, usage } = await translateMarkdownWithGpt(
            sourceContent,
            locale,
            'en',
            this.openAiKey,
            this.model,
            temperature,
            { context: this.context },
          );
          addTokenUsage(this.tokenUsage, usage);
          await fs.writeFile(targetPath, translated, 'utf8');
          this.progressTracker.incrementProgress(locale);
          return { locale, success: true, path: targetPath };
        } catch (error) {
          if (error?.cause === this.abortError || (this.abortError && error.message.startsWith('Aborted after failure'))) {
            throw error;
          }
          this.abort(error, locale);
          throw error;
        }
      } catch (error) {
        const isPrimaryFailure = this.abortLocale === locale;
        return {
          locale,
          success: false,
          error: isPrimaryFailure
            ? error.message
            : `Aborted after failure in ${this.abortLocale}: ${this.abortError?.message || error.message}`,
          aborted: !isPrimaryFailure,
        };
      } finally {
        if (acquired) this.release();
      }
    })());

    const translatedResults = await Promise.all(tasks);
    const results = [...skippedResults, ...translatedResults];
    const duration = Math.round((Date.now() - startTime) / 1000);
    const success = results.every((result) => result.success);

    this.printMarkdownReport({ duration, locales, results, success });

    return { success, results, duration, tokenUsage: { ...this.tokenUsage } };
  }
}

export default Translator;
