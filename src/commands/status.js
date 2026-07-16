import path from 'path';
import fs from 'fs-extra';
import HashManager from '../hash-manager.js';
import { resolveDir } from '../utils/resolve-dir.js';

export async function runStatus(options) {
  const dir = await resolveDir(options, 'en.json');
  const inputPath = path.join(dir, 'en.json');

  const sourceJson = await fs.readJson(inputPath);
  const hashManager = new HashManager(dir);

  const currentHashes = hashManager.generateHashes(sourceJson);
  const savedHashes = await hashManager.loadHashes();
  const newStrings = hashManager.findNewStrings(currentHashes, savedHashes);

  const totalStrings = Object.keys(currentHashes).length;
  const newStringsCount = Object.keys(newStrings).length;
  const translatedStrings = totalStrings - newStringsCount;

  console.log(`📁 Directory: ${dir}`);
  console.log(`📝 Source: en.json`);
  console.log(`📊 Total strings: ${totalStrings}`);
  console.log(`✅ Already translated: ${translatedStrings}`);
  console.log(`🆕 New strings: ${newStringsCount}`);

  if (newStringsCount > 0) {
    console.log('\n🆕 New or changed strings:');
    Object.keys(newStrings).forEach((stringPath) => {
      console.log(`   • ${stringPath}`);
    });
  } else {
    console.log('\n✅ All strings are already translated!');
  }
}
