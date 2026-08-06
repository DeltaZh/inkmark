import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  findNextInEditor,
  replaceAllInEditor,
  replaceCurrentInEditor,
  selectionEndTextOffset,
} from '../lib/findReplace';

export type FindReplaceBarProps = {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
};

export function FindReplaceBar({ editor, open, onClose }: FindReplaceBarProps) {
  const [search, setSearch] = useState('');
  const [replacement, setReplacement] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStatus(null);
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleFindNext = useCallback(() => {
    if (!editor) {
      setStatus('编辑器未就绪');
      return;
    }
    if (!search) {
      setStatus('请输入要查找的内容');
      return;
    }

    const fromOffset = selectionEndTextOffset(editor);
    const wrapped = findNextInEditor(editor, search, fromOffset);
    if (wrapped) {
      setStatus(null);
      return;
    }

    const fromStart = findNextInEditor(editor, search, 0);
    if (fromStart) {
      setStatus('已从头继续查找');
      return;
    }

    setStatus('未找到匹配内容');
  }, [editor, search]);

  const handleReplaceCurrent = useCallback(() => {
    if (!editor) {
      setStatus('编辑器未就绪');
      return;
    }
    if (!search) {
      setStatus('请输入要查找的内容');
      return;
    }

    const ok = replaceCurrentInEditor(editor, search, replacement);
    if (!ok) {
      setStatus('请先选中与查找词一致的文本');
      return;
    }
    setStatus('已替换 1 处');
    handleFindNext();
  }, [editor, search, replacement, handleFindNext]);

  const handleReplaceAll = useCallback(() => {
    if (!editor) {
      setStatus('编辑器未就绪');
      return;
    }
    if (!search) {
      setStatus('请输入要查找的内容');
      return;
    }

    const count = replaceAllInEditor(editor, search, replacement);
    setStatus(count > 0 ? `已全部替换 ${count} 处` : '未找到匹配内容');
  }, [editor, search, replacement]);

  if (!open) return null;

  return (
    <div
      className="find-replace-bar"
      role="search"
      aria-label="查找与替换"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleReplaceAll();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleFindNext();
        }
      }}
    >
      <label className="find-replace-bar__field">
        <span className="find-replace-bar__label">查找</span>
        <input
          ref={searchRef}
          type="search"
          className="find-replace-bar__input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="输入要查找的文字"
          aria-label="查找内容"
        />
      </label>

      <label className="find-replace-bar__field">
        <span className="find-replace-bar__label">替换</span>
        <input
          type="text"
          className="find-replace-bar__input"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="替换为"
          aria-label="替换内容"
        />
      </label>

      <div className="find-replace-bar__actions">
        <button type="button" className="find-replace-bar__btn" onClick={handleFindNext}>
          下一个
        </button>
        <button
          type="button"
          className="find-replace-bar__btn"
          onClick={handleReplaceCurrent}
        >
          替换
        </button>
        <button type="button" className="find-replace-bar__btn" onClick={handleReplaceAll}>
          全部替换
        </button>
        <button
          type="button"
          className="find-replace-bar__close"
          onClick={onClose}
          aria-label="关闭查找替换"
        >
          ×
        </button>
      </div>

      {status ? (
        <p className="find-replace-bar__status" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
