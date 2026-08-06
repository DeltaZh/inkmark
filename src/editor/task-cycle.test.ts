import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';

describe('cycle', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('survives getMarkdown -> setContent', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: '- [ ] todo\n- [x] done\n',
      contentType: 'markdown',
    });
    const md1 = (editor as Editor & { getMarkdown: () => string }).getMarkdown();
    console.log('MD1', JSON.stringify(md1));
    editor.commands.setContent(md1, { contentType: 'markdown' });
    console.log('HTML', editor.getHTML());
    expect(editor.getJSON().content?.some((n) => n.type === 'taskList')).toBe(
      true,
    );
  });
});
