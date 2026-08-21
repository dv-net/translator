export async function resolveOpenAiKey({ requireKey = false } = {}) {
  const normalize = (raw) => {
    const trimmed = raw.trim();
    if (trimmed.startsWith('ChatGPT:')) return trimmed.slice('ChatGPT:'.length).trim();
    if (trimmed.startsWith('OpenAI:')) return trimmed.slice('OpenAI:'.length).trim();
    return trimmed;
  };

  if (process.env.OPENAI_API_KEY?.trim()) {
    return normalize(process.env.OPENAI_API_KEY);
  }

  if (requireKey) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY in the environment.');
  }

  return null;
}
