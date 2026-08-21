export function resolveContext(contextFlag) {
  const fromFlag = typeof contextFlag === 'string' ? contextFlag.trim() : '';
  return fromFlag || null;
}
