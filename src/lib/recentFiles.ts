/** 最近打开文件列表上限（与 Editor 量级接近） */
export const RECENT_FILES_MAX = 12;

/**
 * 将 path 置顶并去重，截断到上限。
 * 空路径原样返回列表。
 */
export function pushRecentFile(recent: string[], path: string): string[] {
  const trimmed = path.trim();
  if (!trimmed) return recent.slice(0, RECENT_FILES_MAX);
  const rest = recent.filter((p) => p !== trimmed);
  return [trimmed, ...rest].slice(0, RECENT_FILES_MAX);
}

/** 从绝对路径取显示用文件名 */
export function recentFileDisplayName(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const name = parts[parts.length - 1] ?? '';
  return name || path;
}
