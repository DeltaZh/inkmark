import type { Editor } from '@tiptap/react';
import type { OutlineItem } from '../lib/outline';

export type OutlineSidebarProps = {
  items: OutlineItem[];
  editor: Editor | null;
};

function findHeadingPos(editor: Editor, index: number): number | null {
  let headingIndex = 0;
  let targetPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (targetPos !== null) return false;
    if (node.type.name === 'heading') {
      if (headingIndex === index) {
        targetPos = pos;
        return false;
      }
      headingIndex += 1;
    }
    return undefined;
  });
  return targetPos;
}

export function jumpToOutlineItem(editor: Editor, index: number): void {
  const pos = findHeadingPos(editor, index);
  if (pos === null) return;
  editor
    .chain()
    .focus()
    .setTextSelection(pos + 1)
    .scrollIntoView()
    .run();
}

export function OutlineSidebar({ items, editor }: OutlineSidebarProps) {
  if (items.length === 0) {
    return (
      <div className="outline-sidebar" aria-label="文档大纲">
        <p className="outline-sidebar__empty">文档中暂无标题</p>
      </div>
    );
  }

  return (
    <div className="outline-sidebar" aria-label="文档大纲">
      <nav className="outline-sidebar__nav">
        <ul className="outline-sidebar__list">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="outline-sidebar__item"
              style={{ paddingInlineStart: `${(item.level - 1) * 12 + 8}px` }}
            >
              <button
                type="button"
                className="outline-sidebar__link"
                title={item.text || '空标题'}
                disabled={!editor}
                onClick={() => {
                  if (!editor) return;
                  jumpToOutlineItem(editor, index);
                }}
              >
                {item.text || '（空标题）'}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
