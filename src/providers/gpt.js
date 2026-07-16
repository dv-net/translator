import OpenAI from 'openai';

const openAIClients = new Map();

function getOrCreateOpenAI(apiKey) {
  if (openAIClients.has(apiKey)) {
    return openAIClients.get(apiKey);
  }

  const client = new OpenAI({ apiKey });
  openAIClients.set(apiKey, client);
  return client;
}

export async function translateTextWithGpt(text, targetLocale, sourceLocale, apiKey, model = 'gpt-4o-mini') {
  const openai = getOrCreateOpenAI(apiKey);

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a translation assistant. Translate the following text from ${sourceLocale} to ${targetLocale}. Return only the translated text.`,
      },
      { role: 'user', content: text },
    ],
  });

  return response.choices[0].message.content.trim();
}

export async function translateMarkdownWithGpt(
  content,
  targetLocale,
  sourceLocale = 'en',
  apiKey,
  model = 'gpt-4o-mini',
  temperature = 1,
) {
  const openai = getOrCreateOpenAI(apiKey);

  const response = await openai.chat.completions.create({
    model,
    temperature,
    messages: [
      {
        role: 'system',
        content: `You are a professional localization assistant. Translate Markdown from ${sourceLocale} to ${targetLocale}. Preserve all Markdown syntax, code blocks, inline code, front matter, links, and do not translate code identifiers or URLs. Keep HTML tags and placeholders like {variable} intact.`,
      },
      { role: 'user', content },
    ],
  });

  return response.choices[0].message.content.trim();
}
