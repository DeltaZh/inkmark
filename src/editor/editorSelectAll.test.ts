import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';
import {
  findLocalSelectAllDepth,
  runEditorSelectAll,
} from './editorSelectAll';

function selectedText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, '\n');
}

describe('runEditorSelectAll', () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it('selects only current code block', () => {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: createExtensions(),
      content: 'before\n\n```js\nconst a = 1\n```\n\nafter\n',
      contentType: 'markdown',
    });

    // 光标放进代码块
    let codePos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'codeBlock' && codePos === null) {
        codePos = pos + 1;
        return false;
      }
      return true;
    });
    expect(codePos).not.toBeNull();
    editor.commands.setTextSelection(codePos!);

    expect(runEditorSelectAll(editor)).toBe(true);
    expect(selectedText(editor)).toContain('const a = 1');
    expect(selectedText(editor)).not.toContain('before');
    expect(selectedText(editor)).not.toContain('after');
  });

  it('selects only current table cell', () => {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: createExtensions(),
      content: 'intro\n',
      contentType: 'markdown',
    });
    editor
      .chain()
      .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
      .run();

    // 定位到第一个 body 单元格内的段落文本位置
    let textPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell' && textPos === null) {
        // cell → paragraph → text：进入段落内容
        textPos = pos + 2;
        return false;
      }
      return true;
    });
    expect(textPos).not.toBeNull();
    editor.commands.setTextSelection(textPos!);
    editor.commands.insertContent('cell-a');

    expect(runEditorSelectAll(editor)).toBe(true);
    const text = selectedText(editor).replace(/\n+$/, '');
    expect(text).toBe('cell-a');
    expect(text).not.toContain('intro');
    expect(findLocalSelectAllDepth(editor.state.selection.$from)?.name).toBe(
      'tableCell',
    );
  });

  it('selects whole document in normal paragraph', () => {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: createExtensions(),
      content: '# Title\n\nhello world\n\nsecond\n',
      contentType: 'markdown',
    });
    editor.commands.focus('end');
    expect(runEditorSelectAll(editor)).toBe(true);
    const text = selectedText(editor);
    expect(text).toContain('Title');
    expect(text).toContain('hello world');
    expect(text).toContain('second');
  });
});
