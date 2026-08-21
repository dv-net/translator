export function createTokenUsage() {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    requests: 0,
  };
}

export function addTokenUsage(target, usage) {
  if (!target || !usage) return target;

  target.promptTokens += usage.promptTokens || 0;
  target.completionTokens += usage.completionTokens || 0;
  target.totalTokens += usage.totalTokens || 0;
  target.requests += 1;

  return target;
}

export function formatTokenUsage(usage) {
  if (!usage || usage.requests === 0) {
    return null;
  }

  return `🔢 Tokens: ${usage.totalTokens} total (prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, requests: ${usage.requests})`;
}
