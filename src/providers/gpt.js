import OpenAI from 'openai';
import {
  DEFAULT_MARKDOWN_REQUEST_TIMEOUT_MS,
  DEFAULT_MODEL,
  DEFAULT_REQUEST_TIMEOUT_MS,
} from '../constants/defaults.js';
import { getMarkdownTranslationPrompt, getTextTranslationPrompt } from '../constants/prompts.js';

const openAIClients = new Map();

function getOrCreateOpenAI(apiKey) {
  if (openAIClients.has(apiKey)) {
    return openAIClients.get(apiKey);
  }

  const client = new OpenAI({
    apiKey,
    timeout: DEFAULT_REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });
  openAIClients.set(apiKey, client);
  return client;
}

function requestOptions(timeoutMs) {
  return {
    timeout: timeoutMs,
    maxRetries: 0,
    signal: AbortSignal.timeout(timeoutMs),
  };
}

function formatTimeoutError(error, timeoutMs) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || error?.constructor?.name === 'APIConnectionTimeoutError') {
    return new Error(`OpenAI request timed out after ${timeoutMs}ms`);
  }
  return error;
}

export function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  const promptTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;

  return {
    promptTokens: Number(promptTokens) || 0,
    completionTokens: Number(completionTokens) || 0,
    totalTokens: Number(totalTokens) || 0,
  };
}

export async function translateTextWithGpt(
  text,
  targetLocale,
  sourceLocale,
  apiKey,
  model = DEFAULT_MODEL,
  { context = null, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = {},
) {
  const openai = getOrCreateOpenAI(apiKey);

  try {
    const response = await openai.chat.completions.create(
      {
        model,
        messages: [
          {
            role: 'system',
            content: getTextTranslationPrompt(sourceLocale, targetLocale, { context }),
          },
          { role: 'user', content: text },
        ],
      },
      requestOptions(timeoutMs),
    );

    return {
      text: response.choices[0].message.content.trim(),
      usage: normalizeUsage(response.usage),
    };
  } catch (error) {
    throw formatTimeoutError(error, timeoutMs);
  }
}

export async function translateMarkdownWithGpt(
  content,
  targetLocale,
  sourceLocale = 'en',
  apiKey,
  model = DEFAULT_MODEL,
  temperature = 1,
  {
    context = null,
    timeoutMs = DEFAULT_MARKDOWN_REQUEST_TIMEOUT_MS,
  } = {},
) {
  const openai = getOrCreateOpenAI(apiKey);

  try {
    const response = await openai.chat.completions.create(
      {
        model,
        temperature,
        messages: [
          {
            role: 'system',
            content: getMarkdownTranslationPrompt(sourceLocale, targetLocale, { context }),
          },
          { role: 'user', content },
        ],
      },
      requestOptions(timeoutMs),
    );

    return {
      text: response.choices[0].message.content.trim(),
      usage: normalizeUsage(response.usage),
    };
  } catch (error) {
    throw formatTimeoutError(error, timeoutMs);
  }
}
