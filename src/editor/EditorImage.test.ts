import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';
import { setImageSyntax, setImageZoom } from './EditorImage';

describe('EditorImage zoom', () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('serializes zoomed image as HTML img with style zoom (Editor)', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: '![alt](assets/a.png)\n',
      contentType: 'markdown',
    });

    let imagePos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        imagePos = pos;
        return false;
      }
      return true;
    });
    expect(imagePos).not.toBeNull();

    editor.chain().setNodeSelection(imagePos!).run();
    expect(setImageZoom(editor, '50%')).toBe(true);

    const md = (editor as Editor & { getMarkdown: () => string }).getMarkdown();
    expect(md).toMatch(/<img[^>]+style="zoom:50%"/);
    expect(md).toContain('src="assets/a.png"');
    expect(md).toContain('alt="alt"');
  });

  it('parses HTML zoomed img back and keeps zoom', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: '<img src="assets/b.png" alt="b" style="zoom:33%" />\n',
      contentType: 'markdown',
    });

    let zoom: string | null = null;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'image') {
        zoom = node.attrs.zoom;
        return false;
      }
      return true;
    });
    expect(zoom).toBe('33%');

    const md = (editor as Editor & { getMarkdown: () => string }).getMarkdown();
    expect(md).toMatch(/zoom:33%/);
  });

  it('100% clears zoom and can return to markdown syntax', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: '![x](a.png)\n',
      contentType: 'markdown',
    });

    let imagePos = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'image') {
        imagePos = pos;
        return false;
      }
      return true;
    });
    editor.chain().setNodeSelection(imagePos).run();
    setImageZoom(editor, '25%');
    setImageSyntax(editor, 'markdown');

    const md = (editor as Editor & { getMarkdown: () => string }).getMarkdown();
    expect(md.trim()).toBe('![x](a.png)');
  });
});
