import { convertFileSrc } from '@tauri-apps/api/core';
import { isTauri } from '../isTauri';
import { resolveThemeColorScheme } from './patches';

const STYLE_ID = 'inkmark-theme';

/** 将 Rust 侧 rewrite 出的 file:// URL 转为 Tauri asset 协议，便于 WebView 加载字体/图片。 */
export function rewriteThemeAssetUrls(css: string): string {
  if (!isTauri()) return css;
  return css.replace(
    /url\(\s*(['"]?)file:\/\/([^'")]+)\1\s*\)/gi,
    (_full, quote: string, rawPath: string) => {
      let path = rawPath;
      try {
        path = decodeURIComponent(rawPath);
      } catch {
        /* keep raw */
      }
      // file:///Users/... → /Users/...
      if (path.startsWith('/') === false && /^[A-Za-z]:\//.test(path) === false) {
        path = `/${path}`;
      }
      try {
        const src = convertFileSrc(path);
        const q = quote || '';
        return `url(${q}${src}${q})`;
      } catch {
        return `url(${quote || ''}file://${rawPath}${quote || ''})`;
      }
    },
  );
}

export function applyThemeCss(css: string, themeName = 'default'): void {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  const resolved = rewriteThemeAssetUrls(css);
  el.textContent = resolved;

  const scheme = resolveThemeColorScheme(themeName, resolved);
  document.documentElement.style.colorScheme = scheme;
  document.documentElement.dataset.themeScheme = scheme;
  document.documentElement.dataset.theme = themeName;
  document.body?.style.setProperty('color-scheme', scheme);
}

export function clearThemeCss(): void {
  document.getElementById(STYLE_ID)?.remove();
  document.documentElement.style.removeProperty('color-scheme');
  delete document.documentElement.dataset.themeScheme;
  delete document.documentElement.dataset.theme;
}
