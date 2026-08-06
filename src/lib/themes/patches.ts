/**
 * 主题注入后的最小壳层桥接（不改写 编辑器 正文规则）。
 */

/** 从 CSS 中粗略判断是否为暗色主题 */
export function detectColorScheme(css: string): 'light' | 'dark' {
  const bgMatch = css.match(/--bg-color\s*:\s*([^;]+);/i);
  if (!bgMatch) return 'light';
  const value = bgMatch[1]!.trim().toLowerCase();
  const rgb = parseCssColorToRgb(value);
  if (!rgb) return 'light';
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.45 ? 'dark' : 'light';
}

function parseCssColorToRgb(value: string): { r: number; g: number; b: number } | null {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('');
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = value.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i,
  );
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
    };
  }
  return null;
}

export function resolveThemeColorScheme(
  name: string,
  css: string,
): 'light' | 'dark' {
  if (/night|dark|black/i.test(name)) return 'dark';
  return detectColorScheme(css);
}

export function patchThemeCss(name: string, css: string): string {
  const scheme = resolveThemeColorScheme(name, css);
  // 壳层桥接 + TipTap 代码块语言条压过 base-control 全局 input 白底
  // （主题 <style> 最后注入，保证优先级压过 vendor）
  return `${css}

/* delta-ink shell bridge */
:root, html { color-scheme: ${scheme}; }
.app-shell, .app-toolbar, .left-sidebar, .tab-bar, .status-bar, .find-replace-bar {
  background: var(--side-bar-bg-color, var(--bg-color));
  color: var(--control-text-color, var(--text-color));
}
.app-shell { background: var(--bg-color); color: var(--text-color); }

/* TipTap code-fence language chip → 编辑器 .code-tooltip（压过全局 input 白底） */
#write .md-fences .code-tooltip {
  background: inherit !important;
  background-color: inherit !important;
}
#write .md-fences .code-tooltip input,
#write .md-fences .code-tooltip input.ty-cm-lang-input {
  -webkit-appearance: none !important;
  appearance: none !important;
  background: transparent !important;
  background-color: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  color: inherit !important;
}
`;
}
