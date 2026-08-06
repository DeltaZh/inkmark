export type AppKeyboardAction =
  | 'new'
  | 'open'
  | 'save'
  | 'saveAs'
  | 'closeTab'
  | 'findReplace'
  | 'settings';

type ShortcutKeyEvent = Pick<
  KeyboardEvent,
  'metaKey' | 'ctrlKey' | 'shiftKey' | 'key'
>;

/**
 * 解析全局快捷键应触发的动作。
 * Tauri 内文件/查找等由原生菜单加速键处理，避免与 keydown 双触发。
 */
export function resolveAppKeyboardAction(
  e: ShortcutKeyEvent,
  inTauri: boolean,
): AppKeyboardAction | null {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return null;

  const key = e.key.toLowerCase();

  // Tauri：全部交给菜单；浏览器 dev：前端 fallback
  if (inTauri) return null;

  if (key === 'f') return 'findReplace';
  if (key === 's' && e.shiftKey) return 'saveAs';
  if (key === 's') return 'save';
  if (key === 'o') return 'open';
  if (key === 'n') return 'new';
  if (key === 'w') return 'closeTab';
  if (key === ',') return 'settings';

  return null;
}
