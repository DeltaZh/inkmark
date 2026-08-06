import { useEffect, useState } from 'react';
import type { Settings } from '../ipc/settings';
import { listThemes, type ThemeInfo } from '../ipc/themes';
import { themeUiKey } from './ThemePicker';

export type SettingsDialogProps = {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (next: Settings) => Promise<void>;
};

export function SettingsDialog({
  open,
  settings,
  onClose,
  onSave,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft({
      ...settings,
      lastFolder: settings.lastFolder ?? null,
      recentFiles: settings.recentFiles ?? [],
      spellCheck: settings.spellCheck ?? true,
    });
    setError(null);
  }, [open, settings]);

  // 打开对话框或切换「读取社区主题」时刷新默认主题候选
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listThemes(draft.readExternalThemes)
      .then((list) => {
        if (cancelled) return;
        setThemes(list);
        setDraft((d) => {
          if (list.some((t) => t.name === d.defaultTheme) || list.length === 0) {
            return d;
          }
          return { ...d, defaultTheme: list[0]!.name };
        });
      })
      .catch(() => {
        if (!cancelled) {
          setThemes([]);
          setError('无法加载主题列表');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, draft.readExternalThemes]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch {
      setError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-overlay" role="presentation" onClick={onClose}>
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-dialog__header">
          <h2 id="settings-dialog-title">设置</h2>
          <button
            type="button"
            className="settings-dialog__close"
            onClick={onClose}
            aria-label="关闭设置"
          >
            ×
          </button>
        </header>

        <div className="settings-dialog__body">
          <label className="settings-field">
            <span className="settings-field__label">
              读取社区主题目录
              <span
                className="settings-tip"
                title="开启后，会扫描本机常见社区主题文件夹并列入可选列表。关闭后仅显示内置与本应用主题。"
              >
                ?
              </span>
            </span>
            <input
              type="checkbox"
              checked={draft.readExternalThemes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, readExternalThemes: e.target.checked }))
              }
            />
          </label>

          <label className="settings-field">
            <span className="settings-field__label">默认主题</span>
            <select
              value={draft.defaultTheme}
              onChange={(e) =>
                setDraft((d) => ({ ...d, defaultTheme: e.target.value }))
              }
            >
              {themes.map((theme) => (
                <option key={themeUiKey(theme)} value={theme.name}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span className="settings-field__label">
              拼写检查
              <span
                className="settings-tip"
                title="开启后，编辑区与源代码模式会启用系统拼写检查（使用系统拼写检查）。"
              >
                ?
              </span>
            </span>
            <input
              type="checkbox"
              checked={draft.spellCheck}
              onChange={(e) =>
                setDraft((d) => ({ ...d, spellCheck: e.target.checked }))
              }
            />
          </label>

          <div className="settings-field">
            <span className="settings-field__label">
              最近打开的文件夹
              <span
                className="settings-tip"
                title="通过「文件 → 打开文件夹…」选择后会自动记住，下次启动可继续浏览该目录下的 Markdown 文件。"
              >
                ?
              </span>
            </span>
            <p className="settings-field__value" title={draft.lastFolder ?? undefined}>
              {draft.lastFolder || '暂无'}
            </p>
          </div>

          {error ? <p className="settings-dialog__error">{error}</p> : null}
        </div>

        <footer className="settings-dialog__footer">
          <button type="button" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button
            type="button"
            className="settings-dialog__primary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </footer>
      </div>
    </div>
  );
}
