/** 是否运行在 Tauri WebView 内（非纯 Vite 浏览器） */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
