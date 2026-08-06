import { useEffect, useMemo, useRef, useState } from 'react';
import {
  filterQuickOpenEntries,
  type QuickOpenEntry,
} from '../lib/openQuickly';

export type OpenQuickDialogProps = {
  open: boolean;
  entries: QuickOpenEntry[];
  onClose: () => void;
  onOpen: (path: string) => void;
};

export function OpenQuickDialog({
  open,
  entries,
  onClose,
  onOpen,
}: OpenQuickDialogProps) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => filterQuickOpenEntries(entries, query),
    [entries, query],
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!open) return null;

  const select = (path: string) => {
    onOpen(path);
    onClose();
  };

  return (
    <div className="settings-overlay" role="presentation" onClick={onClose}>
      <div
        className="settings-dialog open-quick-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-quick-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-dialog__header">
          <h2 id="open-quick-title">快速打开</h2>
          <button
            type="button"
            className="settings-dialog__close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </header>
        <div className="settings-dialog__body">
          <input
            ref={inputRef}
            className="open-quick-dialog__input"
            value={query}
            placeholder="输入文件名或路径…"
            aria-label="快速打开搜索"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
                return;
              }
              if (e.key === 'Enter' && filtered[index]) {
                e.preventDefault();
                select(filtered[index].path);
              }
            }}
          />
          <ul className="open-quick-dialog__list" role="listbox">
            {filtered.length === 0 ? (
              <li className="open-quick-dialog__empty">无匹配文件</li>
            ) : (
              filtered.map((entry, i) => (
                <li key={entry.path}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === index}
                    className={`open-quick-dialog__item${i === index ? ' open-quick-dialog__item--active' : ''}`}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => select(entry.path)}
                  >
                    <span className="open-quick-dialog__name">{entry.name}</span>
                    <span className="open-quick-dialog__path">{entry.path}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
