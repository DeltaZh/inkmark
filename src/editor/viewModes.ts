import type { Editor } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const FOCUS_CLASS = 'md-focus';
const FOCUS_CONTAINER = 'md-focus-container';

function clearFocusClasses(root: HTMLElement) {
  root
    .querySelectorAll(`.${FOCUS_CLASS}, .${FOCUS_CONTAINER}`)
    .forEach((el) => {
      el.classList.remove(FOCUS_CLASS, FOCUS_CONTAINER);
    });
}

function applyFocusHighlight(editor: Editor) {
  const root = editor.view.dom as HTMLElement;
  clearFocusClasses(root);

  const { $from } = editor.state.selection;
  let depth = $from.depth;
  while (depth > 0) {
    const node = $from.node(depth);
    if (node.isBlock) break;
    depth -= 1;
  }
  if (depth <= 0) return;

  const pos = $from.before(depth);
  const dom = editor.view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return;

  dom.classList.add(FOCUS_CLASS, FOCUS_CONTAINER);
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
    scroller.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
  } catch {
    /* ignore */
  }
}

export type ViewModeFlags = {
  focusMode: boolean;
  typewriterMode: boolean;
};

function viewModeStorage(editor: Editor): ViewModeFlags {
  const storage = editor.storage as unknown as {
    editorViewModes: ViewModeFlags;
  };
  return storage.editorViewModes;
}

/**
 * Editor 视图模式：专注模式（body.on-focus-mode + md-focus）与打字机模式（光标垂直居中）。
 */
export const EditorViewModes = Extension.create({
  name: 'editorViewModes',

  addStorage() {
    return {
      focusMode: false,
      typewriterMode: false,
    } satisfies ViewModeFlags;
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: new PluginKey('editorViewModes'),
        view: () => ({
          update: (view) => {
            const ed = extension.editor;
            if (!ed) return;
            const storage = extension.storage as ViewModeFlags;
            document.body.classList.toggle('on-focus-mode', storage.focusMode);
            if (storage.focusMode) {
              applyFocusHighlight(ed);
            } else {
              clearFocusClasses(view.dom as HTMLElement);
            }
            if (storage.typewriterMode) {
              scrollTypewriter(ed);
            }
          },
          destroy: () => {
            document.body.classList.remove('on-focus-mode');
          },
        }),
      }),
    ];
  },
});

export function setFocusMode(editor: Editor, enabled: boolean) {
  const storage = viewModeStorage(editor);
  storage.focusMode = enabled;
  document.body.classList.toggle('on-focus-mode', enabled);
  if (enabled) applyFocusHighlight(editor);
  else clearFocusClasses(editor.view.dom as HTMLElement);
}

export function setTypewriterMode(editor: Editor, enabled: boolean) {
  const storage = viewModeStorage(editor);
  storage.typewriterMode = enabled;
  if (enabled) scrollTypewriter(editor);
}

export function toggleFocusMode(editor: Editor): boolean {
  const storage = viewModeStorage(editor);
  const next = !storage.focusMode;
  setFocusMode(editor, next);
  return next;
}

export function toggleTypewriterMode(editor: Editor): boolean {
  const storage = viewModeStorage(editor);
  const next = !storage.typewriterMode;
  setTypewriterMode(editor, next);
  return next;
}
