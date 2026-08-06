import { useEffect, useRef, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import {
  EditorContextMenu,
  type ContextMenuState,
} from '../components/EditorContextMenu';
import {
  extractOutlineFromEditorJson,
  type OutlineItem,
} from '../lib/outline';
import { formatFileError, saveImageAsset } from '../ipc/files';
import { createExtensions } from './extensions';
import { WRITE_ROOT_ID } from './editorDom';
import '../styles/editor-vendor.css';
import '../styles/delta-ink-glue.css';

function resolveImagePos(
  view: EditorView,
  event: MouseEvent,
): number | null {
  const el = event.target as HTMLElement | null;
  const img = el?.closest?.('img');
  if (img) {
    try {
      const pos = view.posAtDOM(img, 0);
      if (view.state.doc.nodeAt(pos)?.type.name === 'image') return pos;
    } catch {
      /* ignore */
    }
  }

  const coords = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });
  if (!coords) return null;

  const atInside = view.state.doc.nodeAt(coords.inside);
  if (atInside?.type.name === 'image') return coords.inside;

  const $pos = view.state.doc.resolve(coords.pos);
  for (let d = $pos.depth; d > 0; d -= 1) {
    if ($pos.node(d).type.name === 'image') return $pos.before(d);
  }
  return null;
}

export type EditorProps = {
  markdown: string;
  onChangeMarkdown: (md: string) => void;
  docPath?: string | null;
  editable?: boolean;
  /** 键入时检查拼写（contenteditable spellcheck） */
  spellCheck?: boolean;
  onEditorReady?: (editor: TiptapEditor) => void;
  onOutlineChange?: (items: OutlineItem[]) => void;
};

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);

function imageExtFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && IMAGE_EXTS.has(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  const mimeExt = file.type.split('/')[1]?.toLowerCase();
  if (mimeExt === 'jpeg') return 'jpg';
  if (mimeExt && IMAGE_EXTS.has(mimeExt)) return mimeExt;
  return 'png';
}

function collectImageFiles(list: FileList | null | undefined): File[] {
  if (!list?.length) return [];
  return Array.from(list).filter((file) => file.type.startsWith('image/'));
}

function editorToMarkdown(ed: TiptapEditor): string | null {
  const fn = (ed as TiptapEditor & { getMarkdown?: () => string }).getMarkdown;
  if (typeof fn !== 'function') return null;
  const md = fn.call(ed);
  if (typeof md !== 'string') return null;
  return md.endsWith('\n') ? md : `${md}\n`;
}

export function Editor({
  markdown,
  onChangeMarkdown,
  docPath = null,
  editable = true,
  spellCheck = true,
  onEditorReady,
  onOutlineChange,
}: EditorProps) {
  const onChangeRef = useRef(onChangeMarkdown);
  onChangeRef.current = onChangeMarkdown;
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;
  const onOutlineChangeRef = useRef(onOutlineChange);
  onOutlineChangeRef.current = onOutlineChange;
  const docPathRef = useRef(docPath);
  docPathRef.current = docPath;
  const editorRef = useRef<TiptapEditor | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const emitOutline = (ed: TiptapEditor) => {
    onOutlineChangeRef.current?.(extractOutlineFromEditorJson(ed.getJSON()));
  };

  const insertImageFromFile = async (ed: TiptapEditor, file: File) => {
    const path = docPathRef.current;
    if (!path) {
      window.alert('请先保存文档后再插入图片。');
      return;
    }

    try {
      const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
      const ext = imageExtFromFile(file);
      const rel = await saveImageAsset(path, bytes, ext);
      ed.chain().focus().setImage({ src: rel }).run();
    } catch (error) {
      window.alert(formatFileError(error));
    }
  };

  const pickAndInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      const ed = editorRef.current;
      if (file && ed) void insertImageFromFile(ed, file);
    };
    input.click();
  };

  const editor = useEditor({
    extensions: createExtensions(),
    // 显式 markdown，避免被当成 HTML/纯文本
    content: markdown,
    contentType: 'markdown' as const,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: WRITE_ROOT_ID,
        class: 'editor-write',
        spellcheck: spellCheck ? 'true' : 'false',
      },
      handleDrop(_view, event, _slice, moved) {
        if (moved) return false;
        const ed = editorRef.current;
        if (!ed) return false;

        const files = collectImageFiles(event.dataTransfer?.files);
        if (!files.length) return false;

        event.preventDefault();
        void insertImageFromFile(ed, files[0]);
        return true;
      },
      handlePaste(_view, event) {
        const ed = editorRef.current;
        if (!ed) return false;

        const items = event.clipboardData?.items;
        if (!items?.length) return false;

        for (const item of items) {
          if (!item.type.startsWith('image/')) continue;
          const file = item.getAsFile();
          if (!file) continue;
          event.preventDefault();
          void insertImageFromFile(ed, file);
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          event.preventDefault();
          const imagePos = resolveImagePos(view, event);
          if (imagePos != null) {
            view.dispatch(
              view.state.tr.setSelection(
                NodeSelection.create(view.state.doc, imagePos),
              ),
            );
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              mode: 'image',
              imagePos,
            });
            return true;
          }
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            mode: 'default',
          });
          return true;
        },
      },
    },
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
      // 再强制用 markdown 设一次，杜绝 React StrictMode / HMR 丢 contentType
      ed.commands.setContent(markdown, {
        contentType: 'markdown',
        emitUpdate: false,
      });
      onEditorReadyRef.current?.(ed);
      emitOutline(ed);
    },
    onUpdate: ({ editor: ed }) => {
      const md = editorToMarkdown(ed);
      if (md != null) onChangeRef.current(md);
      emitOutline(ed);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dom.setAttribute('spellcheck', spellCheck ? 'true' : 'false');
  }, [editor, spellCheck]);

  useEffect(() => {
    if (!editor) return;
    const current = editorToMarkdown(editor);
    if (current == null) return;
    if (current === markdown) return;
    editor.commands.setContent(markdown, {
      contentType: 'markdown',
      emitUpdate: false,
    });
    emitOutline(editor);
  }, [editor, markdown]);

  const openDefaultContextMenu = (clientX: number, clientY: number) => {
    setContextMenu({
      x: clientX,
      y: clientY,
      mode: 'default',
    });
  };

  return (
    <div
      className="editor-root"
      onContextMenu={(event) => {
        // 空白衬底（#write 外的 padding）也拦截，避免落到 WebView「重新载入/检查元素」
        event.preventDefault();
        event.stopPropagation();
        const ed = editorRef.current;
        if (!ed) {
          openDefaultContextMenu(event.clientX, event.clientY);
          return;
        }
        const imagePos = resolveImagePos(ed.view, event.nativeEvent);
        if (imagePos != null) {
          ed.view.dispatch(
            ed.view.state.tr.setSelection(
              NodeSelection.create(ed.view.state.doc, imagePos),
            ),
          );
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            mode: 'image',
            imagePos,
          });
          return;
        }
        openDefaultContextMenu(event.clientX, event.clientY);
      }}
    >
      <EditorContent editor={editor} />
      <EditorContextMenu
        editor={editor}
        state={contextMenu}
        onClose={() => setContextMenu(null)}
        onInsertImage={pickAndInsertImage}
        docPath={docPath}
      />
    </div>
  );
}
