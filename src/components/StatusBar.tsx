import type { Tab } from '../state/tabsStore';
import { countChars, countWords } from '../lib/textStats';

export type StatusBarProps = {
  tab: Tab | null;
  themeName?: string | null;
  message?: string | null;
  spellCheck?: boolean;
  onToggleSpellCheck?: () => void;
};

function formatPath(path: string | null): string {
  if (!path) return '尚未保存到文件';
  return path;
}

export function StatusBar({
  tab,
  themeName,
  message,
  spellCheck = true,
  onToggleSpellCheck,
}: StatusBarProps) {
  const pathLabel = tab ? formatPath(tab.path) : '无打开文档';
  const dirtyLabel = tab?.dirty ? '未保存' : '已保存';
  const words = tab ? countWords(tab.markdown) : 0;
  const chars = tab ? countChars(tab.markdown) : 0;
  const themeLabel = themeName?.trim() || '默认主题';

  return (
    <footer className="status-bar" role="status">
      <span className="status-bar__path" title={tab?.path ?? undefined}>
        {pathLabel}
      </span>
      <span className="status-bar__theme" title="当前主题">
        主题：{themeLabel}
      </span>
      {tab ? (
        <span
          className={`status-bar__dirty${tab.dirty ? ' status-bar__dirty--yes' : ''}`}
        >
          {dirtyLabel}
        </span>
      ) : null}
      {tab ? (
        <span className="status-bar__counts" title="字数 / 字符数">
          {words} 词 · {chars} 字
        </span>
      ) : null}
      {onToggleSpellCheck ? (
        <button
          type="button"
          className={`status-bar__spell${spellCheck ? ' status-bar__spell--on' : ''}`}
          onClick={onToggleSpellCheck}
          title="切换拼写检查"
          aria-pressed={spellCheck}
        >
          拼写：{spellCheck ? '开' : '关'}
        </button>
      ) : null}
      {message ? <span className="status-bar__msg">{message}</span> : null}
    </footer>
  );
}
