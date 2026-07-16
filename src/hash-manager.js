import fs from 'fs-extra';
import crypto from 'crypto';
import path from 'path';
import { isSafeObjectKey } from './utils/safe-object.js';

class HashManager {
  constructor(outputDir = './locales') {
    this.outputDir = outputDir;
    this.hashFile = path.join(outputDir, '.translation-hashes.json');
  }

  generateHash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  collectStrings(obj, prefix = '') {
    const strings = {};

    if (typeof obj === 'string') {
      strings[prefix] = obj;
      return strings;
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const key = `${prefix}[${i}]`;
        Object.assign(strings, this.collectStrings(obj[i], key));
      }
      return strings;
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (!isSafeObjectKey(key)) continue;
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        Object.assign(strings, this.collectStrings(value, newPrefix));
      }
      return strings;
    }

    return strings;
  }

  generateHashes(sourceJson) {
    const strings = this.collectStrings(sourceJson);
    const hashes = {};

    for (const [stringPath, text] of Object.entries(strings)) {
      hashes[stringPath] = this.generateHash(text);
    }

    return hashes;
  }

  async loadHashes() {
    try {
      if (await fs.pathExists(this.hashFile)) {
        return await fs.readJson(this.hashFile);
      }
    } catch (error) {
      console.warn('⚠️  Failed to load hashes:', error.message);
    }
    return {};
  }

  async saveHashes(hashes) {
    try {
      await fs.ensureDir(this.outputDir);
      await fs.writeJson(this.hashFile, hashes, { spaces: 2 });
    } catch (error) {
      console.warn('⚠️  Failed to save hashes:', error.message);
    }
  }

  findNewStrings(currentHashes, savedHashes) {
    const newStrings = {};

    for (const [stringPath, hash] of Object.entries(currentHashes)) {
      if (!savedHashes[stringPath] || savedHashes[stringPath] !== hash) {
        newStrings[stringPath] = true;
      }
    }

    return newStrings;
  }

  filterNewStrings(obj, newStrings, prefix = '') {
    if (typeof obj === 'string') {
      return newStrings[prefix] ? obj : null;
    }

    if (Array.isArray(obj)) {
      const filteredArray = [];
      for (let i = 0; i < obj.length; i++) {
        const key = `${prefix}[${i}]`;
        const filtered = this.filterNewStrings(obj[i], newStrings, key);
        if (filtered !== null) {
          filteredArray.push(filtered);
        }
      }
      return filteredArray.length > 0 ? filteredArray : null;
    }

    if (typeof obj === 'object' && obj !== null) {
      const filteredObj = {};
      let hasChanges = false;

      for (const [key, value] of Object.entries(obj)) {
        if (!isSafeObjectKey(key)) continue;
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        const filtered = this.filterNewStrings(value, newStrings, newPrefix);
        if (filtered !== null) {
          filteredObj[key] = filtered;
          hasChanges = true;
        }
      }

      return hasChanges ? filteredObj : null;
    }

    return obj;
  }

  mergeTranslations(existingTranslations, newTranslations) {
    if (typeof newTranslations === 'string') {
      return newTranslations;
    }

    if (Array.isArray(newTranslations)) {
      return newTranslations;
    }

    if (typeof newTranslations === 'object' && newTranslations !== null) {
      const merged = { ...existingTranslations };

      for (const [key, value] of Object.entries(newTranslations)) {
        if (!isSafeObjectKey(key)) continue;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          merged[key] = this.mergeTranslations(merged[key] || {}, value);
        } else {
          merged[key] = value;
        }
      }

      return merged;
    }

    return newTranslations;
  }

  async loadExistingTranslation(locale) {
    try {
      const filePath = path.join(this.outputDir, `${locale}.json`);
      if (await fs.pathExists(filePath)) {
        return await fs.readJson(filePath);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load existing translation for ${locale}:`, error.message);
    }
    return {};
  }

  async saveTranslation(locale, newTranslations) {
    const existingTranslations = await this.loadExistingTranslation(locale);
    const mergedTranslations = this.mergeTranslations(existingTranslations, newTranslations);

    const filePath = path.join(this.outputDir, `${locale}.json`);
    await fs.ensureDir(this.outputDir);
    await fs.writeJson(filePath, mergedTranslations, { spaces: 2 });

    return filePath;
  }
}

export default HashManager;
