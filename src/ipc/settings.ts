import { invoke } from '@tauri-apps/api/core';

export type Settings = {
  defaultTheme: string;
  /** 是否扫描本机社区主题目录 */
  readExternalThemes: boolean;
  imageStrategy: 'assets_beside';
  /** 最近打开的文件夹绝对路径 */
  lastFolder: string | null;
  /** 最近打开/保存的文件绝对路径（最多约 12 条，新在前） */
  recentFiles: string[];
  /** 键入时检查拼写 */
  spellCheck: boolean;
};

export async function fetchSettings(): Promise<Settings> {
  return invoke('get_settings');
}

export async function persistSettings(settings: Settings): Promise<void> {
  await invoke('save_settings', { settings });
}
