const MIN_THREADS = 1;
const MAX_THREADS = 20;

export function resolveThreads(value, fallback = 5) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(MAX_THREADS, Math.max(MIN_THREADS, parsed));
}
