import { readThemeCss } from '../../ipc/themes';
import { applyThemeCss } from './applyTheme';
import { patchThemeCss } from './patches';
import githubCss from '../../../resources/editor/themes/github.css?raw';

export const THEME_LOAD_FALLBACK_MESSAGE = '主题加载失败，已回退默认主题';

/** 默认主题：github */
const BUILTIN_PATH = 'builtin:github';
const FALLBACK_NAME = 'github';

/** 应用官方 github 回退主题（IPC 失败时用打包 CSS）。 */
export function applyBuiltinFallbackCss(): void {
  applyThemeCss(patchThemeCss(FALLBACK_NAME, githubCss), FALLBACK_NAME);
}

/**
 * 读取并应用主题 CSS；失败时回退 github，并返回错误文案。
 * @returns 成功时 null，失败时错误提示
 */
export async function loadAndApplyTheme(
  path: string,
  name: string,
): Promise<string | null> {
  try {
    const css = await readThemeCss(path);
    applyThemeCss(patchThemeCss(name, css), name);
    return null;
  } catch {
    try {
      const fallback = await readThemeCss(BUILTIN_PATH);
      applyThemeCss(patchThemeCss(FALLBACK_NAME, fallback), FALLBACK_NAME);
    } catch {
      applyBuiltinFallbackCss();
    }
    return THEME_LOAD_FALLBACK_MESSAGE;
  }
}
