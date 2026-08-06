import { useEffect, useMemo, useRef, useState } from 'react';
import { filterCodeBlockLanguages } from './codeBlockLanguages';

export type CodeBlockLangInputProps = {
  language: string;
  onChangeLanguage: (language: string | null) => void;
};

function normalizeLang(value: string): string {
  return value.trim().toLowerCase();
}

/** 编辑器风格：可输入筛选的代码块语言框；⌘A 只选中输入框。 */
export function CodeBlockLangInput({
  language,
  onChangeLanguage,
}: CodeBlockLangInputProps) {
  const display = language || 'plaintext';
  const [text, setText] = useState(display);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setText(display);
  }, [display, open]);

  const filtered = useMemo(
    () => filterCodeBlockLanguages(text),
    [text],
  );

  useEffect(() => {
    setHighlight(0);
  }, [text, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setText(display);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open, display]);

  const commit = (raw: string) => {
    const value = normalizeLang(raw);
    if (!value || value === 'plaintext') {
      onChangeLanguage(null);
      setText('plaintext');
    } else {
      onChangeLanguage(value);
      setText(value);
    }
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="code-block-lang"
      contentEditable={false}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        className="ty-cm-lang-input ty-input"
        value={text}
        spellCheck={false}
        autoComplete="off"
        aria-label="代码语言"
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
        onFocus={() => {
          setOpen(true);
          // 对齐常见所见即所得习惯：聚焦后便于直接输入筛选
          window.requestAnimationFrame(() => inputRef.current?.select());
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          // ⌘A / Ctrl+A：只全选输入框，不交给编辑器全选文档
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            e.stopPropagation();
            inputRef.current?.select();
            return;
          }
          // 阻止编辑器快捷键冒泡
          e.stopPropagation();

          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setText(display);
            inputRef.current?.blur();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((i) => Math.max(i - 1, 0));
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            const pick = filtered[highlight] ?? { id: text, label: text };
            commit(pick.id);
            inputRef.current?.blur();
          }
        }}
        onBlur={() => {
          // 延迟以允许点击选项
          window.setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement)) {
              if (open) commit(text);
            }
          }, 120);
        }}
      />
      {open && filtered.length > 0 ? (
        <ul className="code-block-lang__list" role="listbox">
          {filtered.map((lang, i) => (
            <li key={lang.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={`code-block-lang__option${i === highlight ? ' is-active' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(lang.id);
                }}
              >
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
