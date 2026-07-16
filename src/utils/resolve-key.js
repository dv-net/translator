import fs from 'fs-extra';
import path from 'path';

function normalizeKey(raw) {
  const trimmed = raw.trim();
  return trimmed.startsWith('ChatGPT:') ? trimmed.slice('ChatGPT:'.length) : trimmed;
}

async function warnIfKeyFileIsWorldReadable(keyFilePath) {
  if (process.platform === 'win32') return;

  const stat = await fs.stat(keyFilePath);
  const mode = stat.mode & 0o777;

  if ((mode & 0o077) !== 0) {
    console.warn('⚠️  key.txt is readable by group/other users. Recommended: chmod 600 key.txt');
  }
}

export async function resolveOpenAiKey({ keyFlag, requireKey = false } = {}) {
  if (keyFlag) {
    return normalizeKey(keyFlag);
  }

  if (process.env.OPENAI_API_KEY) {
    return normalizeKey(process.env.OPENAI_API_KEY);
  }

  const keyFilePath = path.resolve(process.cwd(), 'key.txt');
  if (await fs.pathExists(keyFilePath)) {
    await warnIfKeyFileIsWorldReadable(keyFilePath);
    const content = await fs.readFile(keyFilePath, 'utf8');
    const raw = content.split(/\r?\n/, 1)[0];
    if (raw?.trim()) {
      return normalizeKey(raw);
    }
  }

  if (requireKey) {
    throw new Error(
      'OpenAI API key is required. Provide it via -k/--key, OPENAI_API_KEY, or key.txt',
    );
  }

  return null;
}

export function resolveProvider({ provider, openAiKey }) {
  const normalized = (provider || 'google').toLowerCase();

  if (normalized === 'chatgpt') {
    return 'gpt';
  }

  if (!['google', 'gpt'].includes(normalized)) {
    throw new Error(`Unsupported provider: ${provider}. Available: google, gpt`);
  }

  if (normalized === 'gpt' && !openAiKey) {
    throw new Error('Provider gpt requires an OpenAI API key');
  }

  if (openAiKey && normalized === 'google') {
    return 'google';
  }

  if (openAiKey && !provider) {
    return 'gpt';
  }

  return normalized;
}
