import path from 'path';
import fs from 'fs-extra';
import HashManager from '../hash-manager.js';
import { resolveDir } from '../utils/resolve-dir.js';
import { pruneObjectByReference } from '../utils/prune-keys.js';

async function listLocaleJsonFiles(dir) {
  const entries = await fs.readdir(dir);
  return entries
    .filter((name) => name.endsWith('.json'))
    .filter((name) => name !== 'en.json')
    .filter((name) => !name.startsWith('.'))
    .sort();
}

export async function runPrune(options) {
  const dir = await resolveDir(options, 'en.json');
  const enPath = path.join(dir, 'en.json');
  const enJson = await fs.readJson(enPath);

  const localeFiles = await listLocaleJsonFiles(dir);
  if (localeFiles.length === 0) {
    console.log(`ℹ️  No locale JSON files found in: ${dir}`);
    return;
  }

  console.log(`📁 Directory: ${dir}`);
  console.log(`📝 Source: en.json`);
  console.log('');

  let totalRemoved = 0;
  let filesChanged = 0;

  for (const fileName of localeFiles) {
    const filePath = path.join(dir, fileName);
    const localeJson = await fs.readJson(filePath);
    const { value: cleaned, removed } = pruneObjectByReference(localeJson, enJson);

    if (removed.length === 0) {
      console.log(`✅ ${fileName}: nothing to remove`);
      continue;
    }

    await fs.writeJson(filePath, cleaned, { spaces: 2 });
    filesChanged++;
    totalRemoved += removed.length;

    console.log(`🧹 ${fileName}: removed ${removed.length} key(s)`);
    for (const keyPath of removed) {
      console.log(`   - ${keyPath}`);
    }
    console.log('');
  }

  const hashManager = new HashManager(dir);
  const currentHashes = hashManager.generateHashes(enJson);
  const savedHashes = await hashManager.loadHashes();
  const cleanedHashes = {};
  const staleHashKeys = [];

  for (const [key, hash] of Object.entries(savedHashes)) {
    if (key in currentHashes) {
      cleanedHashes[key] = hash;
    } else {
      staleHashKeys.push(key);
    }
  }

  if (staleHashKeys.length > 0) {
    await hashManager.saveHashes(cleanedHashes);
    console.log(`🧾 .translation-hashes.json: removed ${staleHashKeys.length} stale hash(es)`);
    for (const keyPath of staleHashKeys) {
      console.log(`   - ${keyPath}`);
    }
    console.log('');
  }

  console.log('='.repeat(60));
  if (totalRemoved === 0) {
    console.log('✅ No unused keys found. All locale files match en.json.');
  } else {
    console.log(`✅ Pruned ${totalRemoved} key(s) across ${filesChanged} file(s).`);
  }
  console.log('='.repeat(60));
}
