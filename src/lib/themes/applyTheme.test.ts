import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyThemeCss, clearThemeCss, rewriteThemeAssetUrls } from './applyTheme';

vi.mock('../isTauri', () => ({
  isTauri: () => false,
}));

describe('applyThemeCss', () => {
  beforeEach(() => {
    clearThemeCss();
  });

  it('injects style tag content', () => {
    applyThemeCss('/* hello */', 'default');
    const el = document.getElementById('inkmark-theme');
    expect(el?.textContent).toContain('hello');
  });

  it('replaces previous theme and sets scheme dataset', () => {
    applyThemeCss('a', 'github');
    applyThemeCss(':root { --bg-color: #111111; }', 'night');
    expect(document.querySelectorAll('#inkmark-theme')).toHaveLength(1);
    expect(document.documentElement.dataset.theme).toBe('night');
    expect(document.documentElement.dataset.themeScheme).toBe('dark');
  });

  it('leaves file urls untouched outside tauri', () => {
    expect(rewriteThemeAssetUrls('url(file:///tmp/a.png)')).toContain('file://');
  });
});
