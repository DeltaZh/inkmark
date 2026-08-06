import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
};

const MAX_COLS = 10;
const MAX_ROWS = 8;

/** 编辑器风格：悬停预览行列，点击插入（对齐 md-grid-board）。 */
export function TableInsertDialog({ open, onClose, onInsert }: Props) {
  const [hoverCols, setHoverCols] = useState(3);
  const [hoverRows, setHoverRows] = useState(3);

  useEffect(() => {
    if (!open) return;
    setHoverCols(3);
    setHoverRows(3);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') {
        e.preventDefault();
        onInsert(hoverRows, hoverCols);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onInsert, hoverRows, hoverCols]);

  if (!open) return null;

  const insert = (rows: number, cols: number) => {
    onInsert(rows, cols);
    onClose();
  };

  return createPortal(
    <div
      className="app-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="app-modal app-modal--table"
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-insert-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="app-modal__header">
          <div id="table-insert-title" className="app-modal__title">
            插入表格
          </div>
          <div className="app-modal__subtitle" aria-live="polite">
            {hoverRows} × {hoverCols}
          </div>
        </div>
        <div className="app-modal__body app-modal__body--grid">
          <table
            className="md-grid-board"
            role="grid"
            aria-label="选择表格行列"
            onMouseLeave={() => {
              setHoverCols(3);
              setHoverRows(3);
            }}
          >
            <tbody>
              {Array.from({ length: MAX_ROWS }, (_, ri) => (
                <tr key={ri}>
                  {Array.from({ length: MAX_COLS }, (_, ci) => {
                    const r = ri + 1;
                    const c = ci + 1;
                    const active = r <= hoverRows && c <= hoverCols;
                    return (
                      <td key={`${r}-${c}`}>
                        <button
                          type="button"
                          className={`md-grid-board__cell${active ? ' md-active' : ''}`}
                          aria-label={`${r} 行 ${c} 列`}
                          onMouseEnter={() => {
                            setHoverRows(r);
                            setHoverCols(c);
                          }}
                          onClick={() => insert(r, c)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="app-modal__footer">
          <button type="button" className="app-modal__btn" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="app-modal__btn app-modal__btn--primary"
            onClick={() => insert(hoverRows, hoverCols)}
          >
            插入 {hoverRows}×{hoverCols}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
