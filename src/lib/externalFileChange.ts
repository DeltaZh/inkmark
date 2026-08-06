/**
 * 磁盘 mtime 是否比上次已知值更新，需要提示用户。
 * dirty 不影响判定：本地未保存与外部变更同时发生时仍应提示。
 */
export function shouldPromptExternalChange(
  knownMtimeMs: number | null | undefined,
  diskMtimeMs: number,
  _dirty = false,
): boolean {
  if (knownMtimeMs == null) return false;
  return diskMtimeMs > knownMtimeMs;
}
