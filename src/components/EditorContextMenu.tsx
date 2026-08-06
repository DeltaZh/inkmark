import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { copyAsMarkdown, promptLink } from '../lib/editorCommands';
import { isTauri } from '../lib/isTauri';
import {
  EDITOR_IMAGE_ZOOM_FACTORS,
  setImageSyntax,
  setImageZoom,
} from '../editor/EditorImage';

export type ContextMenuState = {
  x: number;
  y: number;
  /** 右键落在图片节点上时为 image */
  mode?: 'default' | 'image';
  imagePos?: number;
} | null;

type Props = {
  editor: Editor | null;
  state: ContextMenuState;
  onClose: () => void;
  onInsertImage?: () => void;
  docPath?: string | null;
};

type LeafItem = {
  type: 'item';
  label: string;
  action: () => void;
  danger?: boolean;
  checked?: boolean;
  disabled?: boolean;
};

type SubmenuItem = {
  type: 'submenu';
  label: string;
  children: LeafItem[];
};

type Item = LeafItem | SubmenuItem | { type: 'sep' };

function dirname(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(0, i) : path;
}

function joinPath(base: string, rel: string): string {
  const left = base.replace(/[/\\]+$/, '');
  const right = rel.replace(/^[/\\]+/, '');
  const sep = left.includes('\\') ? '\\' : '/';
  return `${left}${sep}${right}`;
}

function editorMarkdown(editor: Editor): string {
  const fn = (editor as Editor & { getMarkdown?: () => string }).getMarkdown;
  if (typeof fn === 'function') {
    const md = fn.call(editor);
    if (typeof md === 'string') return md;
  }
  return editor.getText();
}

function selectedText(editor: Editor): string {
  const { from, to, empty } = editor.state.selection;
  if (empty) return '';
  return editor.state.doc.textBetween(from, to, '\n');
}

export function EditorContextMenu({
  editor,
  state,
  onClose,
  onInsertImage,
  docPath = null,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  useEffect(() => {
    setOpenSubmenu(null);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [state, onClose]);

  if (!state || !editor) return null;

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const imagePos = state.imagePos;
  const imageNode =
    state.mode === 'image' && imagePos != null
      ? editor.state.doc.nodeAt(imagePos)
      : null;

  let items: Item[];

  const inTable = editor.isActive('table');
  const hasSelection = !editor.state.selection.empty;

  if (state.mode === 'image' && imageNode?.type.name === 'image') {
    const src = String(imageNode.attrs.src ?? '');
    const currentZoom = (imageNode.attrs.zoom as string | null) ?? '100%';
    const forceHtml = Boolean(imageNode.attrs.forceHtml);
    const isHtmlSyntax =
      forceHtml ||
      (imageNode.attrs.zoom && imageNode.attrs.zoom !== '100%') ||
      imageNode.attrs.width != null ||
      imageNode.attrs.height != null;

    const selectImage = () => {
      editor.chain().focus().setNodeSelection(imagePos!).run();
    };

    items = [
      {
        type: 'item',
        label: '在 Finder 中显示',
        action: () => {
          if (!isTauri() || !docPath || !src || /^https?:\/\//i.test(src)) {
            return;
          }
          const abs = src.startsWith('/')
            ? src
            : joinPath(dirname(docPath), src);
          void revealItemInDir(abs);
        },
      },
      {
        type: 'item',
        label: '复制图片',
        action: () => {
          selectImage();
          document.execCommand('copy');
        },
      },
      { type: 'sep' },
      {
        type: 'submenu',
        label: '缩放图片',
        children: EDITOR_IMAGE_ZOOM_FACTORS.map((factor) => ({
          type: 'item' as const,
          label: factor,
          checked:
            currentZoom === factor ||
            (!imageNode.attrs.zoom && factor === '100%'),
          action: () => {
            selectImage();
            setImageZoom(editor, factor);
          },
        })),
      },
      {
        type: 'submenu',
        label: '切换图片语法',
        children: [
          {
            type: 'item',
            label: 'Markdown ![alt](src)',
            checked: !isHtmlSyntax,
            action: () => {
              selectImage();
              setImageSyntax(editor, 'markdown');
            },
          },
          {
            type: 'item',
            label: 'HTML <img />',
            checked: Boolean(isHtmlSyntax),
            action: () => {
              selectImage();
              setImageSyntax(editor, 'html');
            },
          },
        ],
      },
      { type: 'sep' },
      {
        type: 'item',
        label: '删除图片',
        danger: true,
        action: () => {
          selectImage();
          editor.chain().focus().deleteSelection().run();
        },
      },
    ];
  } else {
    // 对齐常见所见即所得习惯 空白处：剪切 / 拷贝 / 粘贴 / 复制·粘贴为…
    items = [
      {
        type: 'item',
        label: '剪切',
        disabled: !hasSelection,
        action: () => {
          editor.chain().focus().run();
          document.execCommand('cut');
        },
      },
      {
        type: 'item',
        label: '拷贝',
        disabled: !hasSelection,
        action: () => {
          editor.chain().focus().run();
          document.execCommand('copy');
        },
      },
      {
        type: 'item',
        label: '粘贴',
        action: () => {
          void navigator.clipboard.readText().then((text) => {
            editor.chain().focus().insertContent(text).run();
          });
        },
      },
      {
        type: 'submenu',
        label: '复制 / 粘贴为…',
        children: [
          {
            type: 'item',
            label: '复制为 Markdown',
            action: () => {
              const md = hasSelection
                ? selectedText(editor)
                : editorMarkdown(editor);
              void copyAsMarkdown(md);
            },
          },
          {
            type: 'item',
            label: '复制为 HTML 代码',
            action: () => {
              if (hasSelection) {
                const sel = window.getSelection();
                const range =
                  sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
                if (range) {
                  const div = document.createElement('div');
                  div.appendChild(range.cloneContents());
                  void navigator.clipboard.writeText(div.innerHTML);
                  return;
                }
              }
              void navigator.clipboard.writeText(editor.getHTML());
            },
          },
          {
            type: 'item',
            label: '粘贴为纯文本',
            action: () => {
              void navigator.clipboard.readText().then((text) => {
                editor.chain().focus().insertContent(text).run();
              });
            },
          },
        ],
      },
      { type: 'sep' },
      {
        type: 'item',
        label: '插入图像…',
        action: () => onInsertImage?.(),
      },
      {
        type: 'item',
        label: '超链接…',
        action: () => promptLink(editor),
      },
      ...(inTable
        ? ([
            { type: 'sep' as const },
            {
              type: 'item' as const,
              label: '上方插入行',
              action: () => editor.chain().focus().addRowBefore().run(),
            },
            {
              type: 'item' as const,
              label: '下方插入行',
              action: () => editor.chain().focus().addRowAfter().run(),
            },
            {
              type: 'item' as const,
              label: '左侧插入列',
              action: () => editor.chain().focus().addColumnBefore().run(),
            },
            {
              type: 'item' as const,
              label: '右侧插入列',
              action: () => editor.chain().focus().addColumnAfter().run(),
            },
            {
              type: 'item' as const,
              label: '删除行',
              action: () => editor.chain().focus().deleteRow().run(),
            },
            {
              type: 'item' as const,
              label: '删除列',
              action: () => editor.chain().focus().deleteColumn().run(),
            },
            {
              type: 'item' as const,
              label: '删除表格',
              danger: true,
              action: () => editor.chain().focus().deleteTable().run(),
            },
          ] satisfies Item[])
        : []),
    ];
  }

  return (
    <div
      ref={ref}
      className="editor-context-menu"
      style={{ left: state.x, top: state.y }}
      role="menu"
    >
      {items.map((item, i) => {
        if (item.type === 'sep') {
          return <div key={`sep-${i}`} className="editor-context-menu__sep" />;
        }
        if (item.type === 'submenu') {
          const open = openSubmenu === item.label;
          return (
            <div
              key={item.label}
              className={`editor-context-menu__submenu${open ? ' is-open' : ''}`}
              onMouseEnter={() => setOpenSubmenu(item.label)}
            >
              <button
                type="button"
                className="editor-context-menu__item editor-context-menu__item--submenu"
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={open}
              >
                <span>{item.label}</span>
                <span className="editor-context-menu__caret" aria-hidden>
                  ›
                </span>
              </button>
              {open ? (
                <div
                  className="editor-context-menu editor-context-menu--flyout"
                  role="menu"
                >
                  {item.children.map((child) => (
                    <button
                      key={child.label}
                      type="button"
                      className={`editor-context-menu__item${child.checked ? ' is-checked' : ''}${child.disabled ? ' is-disabled' : ''}`}
                      role="menuitem"
                      disabled={child.disabled}
                      onClick={() => {
                        if (!child.disabled) run(child.action);
                      }}
                    >
                      <span className="editor-context-menu__check" aria-hidden>
                        {child.checked ? '✓' : ''}
                      </span>
                      {child.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        }
        return (
          <button
            key={item.label}
            type="button"
            className={`editor-context-menu__item${item.danger ? ' is-danger' : ''}${item.disabled ? ' is-disabled' : ''}`}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) run(item.action);
            }}
            onMouseEnter={() => setOpenSubmenu(null)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
