import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';

describe('table insert', () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it('inserts table into doc and keeps it through markdown roundtrip', () => {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: createExtensions(),
      content: 'hello\n',
      contentType: 'markdown',
    });

    const can = editor
      .can()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    const ok = editor
      .chain()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
    const html = editor.getHTML();
    const md = (
      editor as Editor & { getMarkdown?: () => string }
    ).getMarkdown?.();

    expect(can).toBe(true);
    expect(ok).toBe(true);
    expect(html).toMatch(/<table/i);
    expect(md).toBeTruthy();

    editor.commands.setContent(md!, {
      contentType: 'markdown',
      emitUpdate: false,
    });
    expect(editor.getHTML()).toMatch(/<table/i);
  });
});
