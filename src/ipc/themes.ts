import { invoke } from '@tauri-apps/api/core';

export type ThemeSource = 'external' | 'app' | 'builtin' | 'bundled';
export type ThemeInfo = {
  id: string;
  name: string;
  path: string;
  source: ThemeSource;
};

export function listThemes(readExternal: boolean): Promise<ThemeInfo[]> {
  return invoke('list_themes', { readExternal });
}

export function readThemeCss(path: string): Promise<string> {
  return invoke('read_theme_css', { path });
}

/** 从任意可读路径导入 `.css` 到应用 themes 目录（同名覆盖）。 */
export function importThemeFromPath(sourcePath: string): Promise<ThemeInfo> {
  return invoke('import_theme_from_path', { sourcePath });
}

/** @deprecated 与 importThemeFromPath 相同，保留兼容 */
export function importThemeCss(sourcePath: string): Promise<ThemeInfo> {
  return importThemeFromPath(sourcePath);
}
