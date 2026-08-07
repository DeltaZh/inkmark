import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createExtensions } from './extensions';
import { isHorizontalRuleMarker } from './horizontalRuleOnEnter';

describe('isHorizontalRuleMarker', () => {
  it('accepts common markdown hr markers', () => {
    expect(isHorizontalRuleMarker('---')).toBe(true);
    expect(isHorizontalRuleMarker('***')).toBe(true);
    expect(isHorizontalRuleMarker('___')).toBe(true);
    expect(isHorizontalRuleMarker('----')).toBe(true);
    expect(isHorizontalRuleMarker('—-')).toBe(true);
    expect(isHorizontalRuleMarker('——')).toBe(true);
  });

  it('rejects non-hr text', () => {
    expect(isHorizontalRuleMarker('--')).toBe(false);
    expect(isHorizontalRuleMarker('- - -')).toBe(false);
    expect(isHorizontalRuleMarker('hello')).toBe(false);
    expect(isHorizontalRuleMarker('---x')).toBe(false);
  });
});

describe('HorizontalRuleOnEnter', () => {
  let editor: Editor;

  afterEach(() => editor?.destroy());

  it('converts --- paragraph on Enter into horizontalRule', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '---' }],
          },
        ],
      },
    });

    editor.commands.focus('end');
    expect(editor.commands.keyboardShortcut('Enter')).toBe(true);

    const types = (editor.getJSON().content ?? []).map((n) => n.type);
    expect(types[0]).toBe('horizontalRule');
    expect(types).toContain('paragraph');
  });

  it('does not convert ordinary paragraphs on Enter', () => {
    editor = new Editor({
      extensions: createExtensions(),
      content: 'hello',
      contentType: 'markdown',
    });
    editor.commands.focus('end');
    editor.commands.keyboardShortcut('Enter');
    const types = (editor.getJSON().content ?? []).map((n) => n.type);
    expect(types).not.toContain('horizontalRule');
    expect(types.filter((t) => t === 'paragraph').length).toBeGreaterThanOrEqual(2);
  });
});
