import type { Editor } from '@tiptap/core';

export function runHeading(editor: Editor, level: 1 | 2 | 3 | 4 | 5 | 6): void {
  editor.chain().focus().toggleHeading({ level }).run();
}

export function runParagraph(editor: Editor): void {
  editor.chain().focus().setParagraph().run();
}

/** 「提高标题级别」：数字变小（更醒目） */
export function increaseHeadingLevel(editor: Editor): void {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'heading') {
      const level = node.attrs.level as number;
      if (level <= 1) {
        editor.chain().focus().setParagraph().run();
      } else {
        editor
          .chain()
          .focus()
          .toggleHeading({ level: (level - 1) as 1 | 2 | 3 | 4 | 5 | 6 })
          .run();
      }
      return;
    }
  }
  editor.chain().focus().toggleHeading({ level: 1 }).run();
}

/** 「降低标题级别」：数字变大 */
export function decreaseHeadingLevel(editor: Editor): void {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'heading') {
      const level = node.attrs.level as number;
      if (level >= 6) return;
      editor
        .chain()
        .focus()
        .toggleHeading({ level: (level + 1) as 1 | 2 | 3 | 4 | 5 | 6 })
        .run();
      return;
    }
  }
  editor.chain().focus().toggleHeading({ level: 2 }).run();
}

export function promptLink(editor: Editor): void {
  const prev = editor.getAttributes('link').href as string | undefined;
  const href = window.prompt('链接地址', prev ?? 'https://');
  if (href === null) return;
  if (href === '') {
    editor.chain().focus().unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
}

export async function copyAsMarkdown(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(markdown);
}
