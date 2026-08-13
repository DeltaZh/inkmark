import type { Editor } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const FOCUS_CLASS = 'md-focus';
const FOCUS_CONTAINER = 'md-focus-container';
const META_KEY = 'editorViewModes';

export type ViewModeFlags = {
  focusMode: boolean;
  typewriterMode: boolean;
};

const viewModesKey = new PluginKey<ViewModeFlags>(META_KEY);

function readFlags(editor: Editor): ViewModeFlags {
  return (
    viewModesKey.getState(editor.state) ?? {
      focusMode: false,
      typewriterMode: false,
    }
  );
}

function dispatchFlags(editor: Editor, patch: Partial<ViewModeFlags>) {
  const prev = readFlags(editor);
  const next: ViewModeFlags = { ...prev, ...patch };
  const tr = editor.state.tr.setMeta(viewModesKey, next);
  editor.view.dispatch(tr);
}

/** 当前光标所在「末端块」（段落/标题等），对齐 Typora md-end-block */
function leafBlockRange(
  state: EditorState,
): { from: number; to: number; depth: number } | null {
  const { $from } = state.selection;
  let depth = $from.depth;
  while (depth > 0) {
    const node = $from.node(depth);
    if (node.isBlock) break;
    depth -= 1;
  }
  if (depth <= 0) return null;
  const from = $from.before(depth);
  const node = $from.node(depth);
  return { from, to: from + node.nodeSize, depth };
}

function focusDecorations(state: EditorState): DecorationSet | null {
  const flags = viewModesKey.getState(state);
  if (!flags?.focusMode) return null;
  const leaf = leafBlockRange(state);
  if (!leaf) return null;

  const decos = [
    Decoration.node(leaf.from, leaf.to, {
      class: `${FOCUS_CLASS} md-end-block`,
    }),
  ];

  // 列表项作为容器高亮（Typora: md-focus-container on li）
  const { $from } = state.selection;
  for (let d = leaf.depth - 1; d > 0; d -= 1) {
    const name = $from.node(d).type.name;
    if (name === 'listItem' || name === 'taskItem') {
      const from = $from.before(d);
      const node = $from.node(d);
      decos.push(
        Decoration.node(from, from + node.nodeSize, {
          class: FOCUS_CONTAINER,
        }),
      );
      break;
    }
  }

  return DecorationSet.create(state.doc, decos);
}

function scrollTypewriter(editor: Editor) {
  try {
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    const scroller =
      (editor.view.dom.closest('.editor-root') as HTMLElement | null) ??
      (editor.view.dom.parentElement as HTMLElement | null);
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    const target = coords.top - rect.top - rect.height / 2 + scroller.scrollTop;
    const nextTop = Math.max(0, target);
    if (Math.abs(scroller.scrollTop - nextTop) < 1) return;
    scroller.scrollTo({ top: nextTop, behavior: 'auto' });
  } catch {
    /* ignore */
  }
}

/**
 * 专注模式 / 打字机模式。
 * 专注高亮用 Decorations（禁止直接改内容 DOM class，避免 WebView 死循环）。
 */
export const EditorViewModes = Extension.create({
  name: 'editorViewModes',

  addStorage() {
    return {
      focusMode: false,
      typewriterMode: false,
      typewriterRaf: 0 as number,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin<ViewModeFlags>({
        key: viewModesKey,
        state: {
          init: () => ({ focusMode: false, typewriterMode: false }),
          apply: (tr: Transaction, value: ViewModeFlags) => {
            const meta = tr.getMeta(viewModesKey) as ViewModeFlags | undefined;
            if (meta) return meta;
            return value;
          },
        },
        props: {
          decorations: (state) => focusDecorations(state),
        },
        view: () => ({
          update: (view, prevState) => {
            const flags = viewModesKey.getState(view.state);
            if (!flags) return;

            document.body.classList.toggle('on-focus-mode', flags.focusMode);

            const storage = extension.storage as ViewModeFlags & {
              typewriterRaf: number;
            };
            storage.focusMode = flags.focusMode;
            storage.typewriterMode = flags.typewriterMode;

            if (!flags.typewriterMode) {
              if (storage.typewriterRaf) {
                cancelAnimationFrame(storage.typewriterRaf);
                storage.typewriterRaf = 0;
              }
              return;
            }

            const selChanged =
              !prevState.selection.eq(view.state.selection) ||
              prevState.doc !== view.state.doc;
            const justEnabled =
              !(viewModesKey.getState(prevState)?.typewriterMode ?? false) &&
              flags.typewriterMode;

            if (!selChanged && !justEnabled) return;

            const ed = extension.editor;
            if (!ed) return;
            if (storage.typewriterRaf) {
              cancelAnimationFrame(storage.typewriterRaf);
            }
            storage.typewriterRaf = requestAnimationFrame(() => {
              storage.typewriterRaf = 0;
              if (!viewModesKey.getState(ed.state)?.typewriterMode) return;
              scrollTypewriter(ed);
            });
          },
          destroy: () => {
            document.body.classList.remove('on-focus-mode');
            const storage = extension.storage as ViewModeFlags & {
              typewriterRaf: number;
            };
            if (storage.typewriterRaf) {
              cancelAnimationFrame(storage.typewriterRaf);
              storage.typewriterRaf = 0;
            }
          },
        }),
      }),
    ];
  },
});

export function getViewModeFlags(editor: Editor): ViewModeFlags {
  return readFlags(editor);
}

export function setFocusMode(editor: Editor, enabled: boolean) {
  dispatchFlags(editor, { focusMode: enabled });
  document.body.classList.toggle('on-focus-mode', enabled);
}

export function setTypewriterMode(editor: Editor, enabled: boolean) {
  dispatchFlags(editor, { typewriterMode: enabled });
  if (enabled) {
    requestAnimationFrame(() => scrollTypewriter(editor));
  }
}

export function toggleFocusMode(editor: Editor): boolean {
  const next = !readFlags(editor).focusMode;
  setFocusMode(editor, next);
  return next;
}

export function toggleTypewriterMode(editor: Editor): boolean {
  const next = !readFlags(editor).typewriterMode;
  setTypewriterMode(editor, next);
  return next;
}
