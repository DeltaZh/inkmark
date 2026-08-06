import { Extension } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import { isTauri } from '../lib/isTauri';

/** Tauri 下让出给原生菜单加速键，避免 toggle 两次抵消 */
function whenNotTauri(run: () => boolean): boolean {
  if (isTauri()) return false;
  return run();
}

/**
 * Editor 快捷键 + 覆盖 Bold/Italic/Strike 默认绑定。
 * 标题 ⌘0–6 / 加粗斜体等：Tauri 走菜单，浏览器走本扩展。
 */
export const EditorBold = Bold.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-b': () => whenNotTauri(() => this.editor.commands.toggleBold()),
    };
  },
});

export const EditorItalic = Italic.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-i': () => whenNotTauri(() => this.editor.commands.toggleItalic()),
    };
  },
});

export const EditorStrike = Strike.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => whenNotTauri(() => this.editor.commands.toggleStrike()),
    };
  },
});

export const EditorShortcuts = Extension.create({
  name: 'editorShortcuts',
  priority: 200,

  addKeyboardShortcuts() {
    const heading =
      (level: 1 | 2 | 3 | 4 | 5 | 6) =>
      (): boolean =>
        whenNotTauri(() => this.editor.commands.toggleHeading({ level }));

    return {
      'Mod-0': () => whenNotTauri(() => this.editor.commands.setParagraph()),
      'Mod-1': heading(1),
      'Mod-2': heading(2),
      'Mod-3': heading(3),
      'Mod-4': heading(4),
      'Mod-5': heading(5),
      'Mod-6': heading(6),
      'Mod-Alt-c': () =>
        whenNotTauri(() => this.editor.commands.toggleCodeBlock()),
      'Mod-Alt-q': () =>
        whenNotTauri(() => this.editor.commands.toggleBlockquote()),
      'Mod-Alt-u': () =>
        whenNotTauri(() => this.editor.commands.toggleBulletList()),
      'Mod-Alt-o': () =>
        whenNotTauri(() => this.editor.commands.toggleOrderedList()),
      'Mod-u': () =>
        whenNotTauri(() => this.editor.commands.toggleUnderline()),
      'Mod-k': () =>
        whenNotTauri(() => {
          const prev = this.editor.getAttributes('link').href as
            | string
            | undefined;
          const href = window.prompt('链接地址', prev ?? 'https://');
          if (href === null) return true;
          if (href === '') return this.editor.commands.unsetLink();
          return this.editor.commands.setLink({ href });
        }),
      'Mod-\\': () =>
        whenNotTauri(() => {
          this.editor.commands.unsetAllMarks();
          this.editor.commands.clearNodes();
          return true;
        }),
      'Mod-Shift-x': () => this.editor.commands.toggleTaskList(),
    };
  },
});
