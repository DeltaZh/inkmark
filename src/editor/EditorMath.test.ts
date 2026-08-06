import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';

describe('EditorMath', () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('parses and serializes block math $$...$$', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: '$$\nE=mc^2\n$$\n',
      contentType: 'markdown',
    });
    const json = editor.getJSON();
    const block = json.content?.find((n) => n.type === 'mathBlock');
    expect(block).toBeTruthy();
    expect(block && 'attrs' in block ? block.attrs?.latex : null).toMatch(
      /E=mc\^2/,
    );
    const md = (editor as Editor & { getMarkdown: () => string }).getMarkdown();
    expect(md).toContain('$$');
    expect(md).toContain('E=mc^2');
  });

  it('parses inline math $...$', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: '面积 $a^2$ 公式\n',
      contentType: 'markdown',
    });
    let found = false;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'mathInline') {
        found = true;
        expect(node.attrs.latex).toBe('a^2');
      }
    });
    expect(found).toBe(true);
  });
});
