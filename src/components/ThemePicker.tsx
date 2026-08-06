import { useCallback, useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  importThemeFromPath,
  listThemes,
  type ThemeInfo,
  type ThemeSource,
} from '../ipc/themes';
import { isTauri } from '../lib/isTauri';
import { loadAndApplyTheme } from '../lib/themes/loadTheme';

export type ThemePickerProps = {
  readExternalThemes: boolean;
  /** 当前选中主题名（与 settings.defaultTheme 对齐，用 name 而非 Debug id） */
  selectedName: string;
  onThemeChange: (theme: ThemeInfo) => void;
  onError: (message: string | null) => void;
  /** 设置变更后递增，触发重新 listThemes */
  refreshToken?: number;
};

const SOURCE_LABEL: Record<ThemeSource, string> = {
  external: '社区',
  app: '本机',
  builtin: '内置',
  bundled: '内置',
};

/** UI 稳定键：小写 source + name，避免依赖 Debug 格式 id */
export function themeUiKey(theme: ThemeInfo): string {
  return `${theme.source}:${theme.name}`;
}

export function ThemePicker({
  readExternalThemes,
  selectedName,
  onThemeChange,
  onError,
  refreshToken = 0,
}: ThemePickerProps) {
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshList = useCallback(async () => {
    try {
      const list = await listThemes(readExternalThemes);
      setThemes(list);
      return list;
    } catch {
      setThemes([]);
      onError('无法读取主题列表');
      return [] as ThemeInfo[];
    }
  }, [readExternalThemes, onError]);

  useEffect(() => {
    void refreshList();
  }, [refreshList, refreshToken]);

  const handleSelect = async (name: string) => {
    const theme = themes.find((t) => t.name === name);
    if (!theme) return;
    setLoading(true);
    const err = await loadAndApplyTheme(theme.path, theme.name);
    setLoading(false);
    onError(err);
    if (!err) {
      onThemeChange(theme);
    } else {
      // 已回退默认主题：尽量把选中项切到 default
      const fallback = themes.find((t) => t.name === 'github');
      if (fallback) onThemeChange(fallback);
    }
  };

  const handleImport = async () => {
    if (!isTauri()) {
      onError('请在桌面应用中导入主题');
      return;
    }
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: '主题样式', extensions: ['css'] }],
        title: '导入主题 CSS',
      });
      if (selected === null) return;
      const sourcePath = Array.isArray(selected) ? selected[0] : selected;
      if (!sourcePath) return;

      setLoading(true);
      const imported = await importThemeFromPath(sourcePath);
      const list = await refreshList();
      const theme = list.find((t) => t.name === imported.name) ?? imported;
      const err = await loadAndApplyTheme(theme.path, theme.name);
      setLoading(false);
      onError(err);
      if (!err) {
        onThemeChange(theme);
      }
    } catch (error) {
      setLoading(false);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : '导入主题失败';
      onError(message || '导入主题失败');
    }
  };

  return (
    <div className="theme-picker">
      <label className="theme-picker__field">
        <span className="theme-picker__label">主题</span>
        <select
          id="theme-picker-select"
          className="theme-picker__select"
          value={selectedName}
          disabled={loading || themes.length === 0}
          onChange={(e) => void handleSelect(e.target.value)}
          aria-label="选择外观主题"
        >
          {themes.map((theme) => (
            <option
              key={themeUiKey(theme)}
              value={theme.name}
              title={`来源：${SOURCE_LABEL[theme.source]}`}
            >
              {theme.name}
              {theme.source !== 'builtin' ? `（${SOURCE_LABEL[theme.source]}）` : ''}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="theme-picker__import"
        onClick={() => void handleImport()}
        disabled={loading}
        title="从任意位置选择 .css 文件，复制到本应用主题目录"
      >
        导入主题
      </button>
    </div>
  );
}
